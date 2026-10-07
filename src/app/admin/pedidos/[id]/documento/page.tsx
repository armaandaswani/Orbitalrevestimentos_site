"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CLAUSULAS_PADRAO } from "@/lib/clausulas-pedido";
import { datasDoDocumento, fmtDia } from "@/lib/documento-datas";

type DocumentType = "orcamento" | "pedido" | "nota" | "recibo";

interface PedidoItem {
  id: string;
  product_name: string | null;
  product_code?: string | null;
  panel_w?: number | string | null;
  panel_h?: number | string | null;
  plates: number;
  unit_price: number | null;
  unit_cost: number | null;
  unit_label?: string | null;
  product_description?: string | null;
  product_image_path?: string | null;
}

interface PedidoDocument {
  id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  product_name: string | null;
  space: string | null;
  area_m2: number | null;
  total: number | null;
  notes: string | null;
  created_at: string;
  client_document?: string | null;
  client_zip: string | null;
  client_address: string | null;
  client_address_complement: string | null;
  client_city: string | null;
  client_state: string | null;
  discount_amount: number | null;
  freight_amount: number | null;
  payment_methods: string[] | null;
  payment_terms: string | null;
  quote_valid_until: string | null;
  warranty_terms: string | null;
  document_notes: string | null;
  show_legal_terms?: boolean | null;
  items?: PedidoItem[];
}

const COMPANY = {
  name: "Orbital Materiais de Construção LTDA",
  cnpj: "58.013.651/0001-04",
  address: "Avenida Visconde de Porto Alegre, 130, Sala 1 - Centro",
  city: "69010-125 - Manaus/AM",
  email: "orbitalrevestimentos@gmail.com",
};

const DOC_LABEL: Record<DocumentType, string> = {
  orcamento: "Orçamento",
  pedido: "Pedido de Venda",
  nota: "Nota de Venda",
  recibo: "Recibo",
};

const DEFAULT_NOTES = CLAUSULAS_PADRAO;

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


function docNumber(pedido: PedidoDocument) {
  const year = new Date(pedido.created_at).getFullYear().toString().slice(-2);
  return `${pedido.id.slice(0, 8).toUpperCase()}-${year}`;
}

// Short unit + a descriptive detail (placas carry their real dimensions).
function itemUnitInfo(it: PedidoItem): { short: string; detail: string } {
  const unit = (it.unit_label || "un").trim() || "un";
  const short = unit.charAt(0).toUpperCase() + unit.slice(1);
  const h = Number(it.panel_h) || 0; // ≈2,90 m
  const w = Number(it.panel_w) || 0; // ≈1,20 m
  const fmtM = (n: number) => n.toFixed(2).replace(".", ",");
  if (/placa/i.test(unit) && h > 0 && w > 0) {
    return { short, detail: `Placa ${fmtM(h)} m × ${fmtM(w)} m × 5 mm` };
  }
  return { short, detail: short };
}

function documentLine(doc: string | null | undefined) {
  const digits = String(doc ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const label = digits.length === 14 ? "CNPJ" : digits.length === 11 ? "CPF" : "CNPJ/CPF";
  return `${label}: ${String(doc).trim()}`;
}

function addressLines(pedido: PedidoDocument) {
  return [
    pedido.client_address,
    pedido.client_address_complement,
    [pedido.client_zip, pedido.client_city, pedido.client_state].filter(Boolean).join(" - "),
  ].filter(Boolean);
}

function normalizeAssetPath(path: string | null | undefined) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return path.startsWith("/") ? path : `/${path}`;
}

export default function PedidoDocumentoPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null);
  const [docType, setDocType] = useState<DocumentType>("orcamento");
  const [includeImages, setIncludeImages] = useState(false);
  const [includeDescriptions, setIncludeDescriptions] = useState(false);
  const [pedido, setPedido] = useState<PedidoDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState<"email" | "whatsapp" | null>(null);
  const [sendStatus, setSendStatus] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  // True when loaded via the PUBLIC endpoint (a client opening the shared link
  // without an admin session): hide all admin controls, show the document only.
  const [readOnly, setReadOnly] = useState(false);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  // This page has no admin/route layout of its own, so it inherits the public
  // site's <Navbar>/<Footer> from the root layout. The earlier @media print
  // rule that hid them wasn't reliable for every "save as PDF" path (notably
  // iOS Safari's Print sheet) — a downloaded Orçamento PDF showed the full
  // "HOME PRODUTOS TECNOLOGIA…" marketing nav at the top. Hide them
  // unconditionally (screen AND print) for as long as this page is mounted;
  // there's no reason a commercial document view needs the marketing chrome.
  useEffect(() => {
    document.body.classList.add("orbital-doc-page");
    return () => document.body.classList.remove("orbital-doc-page");
  }, []);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const tipo = search.get("tipo") || "orcamento";
    if (["orcamento", "pedido", "nota", "recibo"].includes(tipo)) setDocType(tipo as DocumentType);
    setIncludeImages(search.get("imagens") === "1");
    setIncludeDescriptions(search.get("descricoes") === "1");
  }, []);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    search.set("tipo", docType);
    if (includeImages) search.set("imagens", "1"); else search.delete("imagens");
    if (includeDescriptions) search.set("descricoes", "1"); else search.delete("descricoes");
    window.history.replaceState(null, "", `${window.location.pathname}?${search.toString()}`);
  }, [docType, includeImages, includeDescriptions]);

  // Name the browser tab (and therefore the "Save as PDF" / share filename) as
  // Tipo_Numero_Cliente-Nome so a document saved from this page is identifiable
  // — instead of the generic "Orbital Admin | Orbital Revestimentos".
  useEffect(() => {
    if (!pedido) return;
    const slug = (s: string) =>
      s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const title = `${slug(DOC_LABEL[docType])}_${docNumber(pedido)}_Cliente-${slug(pedido.client_name || "Cliente")}`;
    const prev = document.title;
    document.title = title;
    return () => { document.title = prev; };
  }, [pedido, docType]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/admin/pedidos/${id}`)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        setPedido(data as PedidoDocument);
        setNotesDraft((data as PedidoDocument).document_notes ?? "");
        setReadOnly(false);
        setError(null);
      })
      .catch(async () => {
        // No admin session — this is the CLIENT opening the shared link. Load the
        // public, read-only view instead of showing "Unauthorized".
        try {
          const r = await fetch(`/api/pedidos/${id}`);
          const data = await r.json().catch(() => null);
          if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
          setPedido(data as PedidoDocument);
          setReadOnly(true);
          setError(null);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Falha ao carregar documento.");
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const totals = useMemo(() => {
    const items = pedido?.items ?? [];
    const itemSubtotal = items.reduce((s, it) => s + (Number(it.unit_price) || 0) * (Number(it.plates) || 0), 0);
    const discount = Number(pedido?.discount_amount) || 0;
    const freight = Number(pedido?.freight_amount) || 0;
    const fallbackSubtotal = Math.max(0, (Number(pedido?.total) || 0) + discount - freight);
    const subtotal = itemSubtotal > 0 ? itemSubtotal : fallbackSubtotal;
    // Total the client pays = subtotal − discount + freight. Do NOT fall back to
    // pedido.total: that's the GROSS sum of line items (pre-discount), so using
    // it made the document ignore the discount. For legacy orders with no items
    // this still resolves to pedido.total (fallbackSubtotal cancels out).
    const total = Math.max(0, subtotal - discount + freight);
    return { subtotal, discount, freight, total };
  }, [pedido]);

  if (loading) {
    return <main className="min-h-screen pt-8 bg-[#f4f2ee] flex items-center justify-center text-[#74777f]">Carregando documento...</main>;
  }

  if (error || !pedido) {
    return (
      <main className="min-h-screen pt-8 bg-[#f4f2ee] flex items-center justify-center px-4">
        <div className="bg-white border border-red-200 p-6 max-w-md text-center">
          <p className="text-red-700 font-semibold">Não foi possível carregar o documento.</p>
          <p className="text-[#74777f] text-sm mt-2">{error}</p>
        </div>
      </main>
    );
  }

  const items = pedido.items && pedido.items.length > 0
    ? pedido.items
    : [{
        id: "fallback",
        product_name: [pedido.space, pedido.product_name].filter(Boolean).join(" - ") || "Produto Orbital",
        plates: 1,
        unit_price: totals.subtotal,
        unit_cost: null,
      }];
  const customerAddress = addressLines(pedido);
  const datas = datasDoDocumento(pedido.created_at, pedido.quote_valid_until);
  // The long contractual boilerplate only applies to a binding sale (Pedido de
  // Venda / Nota de Venda) — an Orçamento is just a price quote and shouldn't
  // pre-fill legal clauses. show_legal_terms is the admin's explicit override
  // (per pedido, in the Pedidos editor) on top of that per-type default —
  // false hides the whole Condições/legal section regardless of doc type.
  // Whatever custom text the admin typed into document_notes always wins over
  // the default boilerplate when present.
  const legalTermsEnabled = pedido.show_legal_terms !== false;
  const legalText = legalTermsEnabled
    ? (pedido.document_notes?.trim() || (docType !== "orcamento" ? DEFAULT_NOTES : ""))
    : "";
  const documentUrl = typeof window !== "undefined" ? window.location.href : "";

  async function saveNotes() {
    if (!id) return;
    setSavingNotes(true);
    setNotesSaved(false);
    try {
      const res = await fetch(`/api/admin/pedidos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_notes: notesDraft.trim() || null }),
      });
      if (res.ok) {
        setPedido((cur) => (cur ? { ...cur, document_notes: notesDraft.trim() || null } : cur));
        setNotesSaved(true);
      }
    } catch { /* best-effort */ } finally {
      setSavingNotes(false);
    }
  }

  async function toggleLegalTerms(next: boolean) {
    if (!id) return;
    setPedido((cur) => (cur ? { ...cur, show_legal_terms: next } : cur)); // optimistic
    try {
      await fetch(`/api/admin/pedidos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ show_legal_terms: next }),
      });
    } catch { /* best-effort */ }
  }

  async function sendDocument(channel: "email" | "whatsapp") {
    if (!id) return;
    setSending(channel);
    setSendStatus("");
    try {
      const res = await fetch(`/api/admin/pedidos/${id}/send-document`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          tipo: docType,
          include_images: includeImages,
          include_descriptions: includeDescriptions,
          document_url: documentUrl,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setSendStatus(channel === "email" ? "E-mail enviado." : "WhatsApp enviado.");
    } catch (e) {
      setSendStatus(e instanceof Error ? e.message : "Falha ao enviar.");
    } finally {
      setSending(null);
    }
  }

  return (
    <main className="document-shell min-h-screen bg-[#f4f2ee] pt-8 pb-12 px-4">
      <div className="document-actions max-w-[980px] mx-auto mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#74777f]">Documento comercial</p>
          <h1 className="font-[var(--font-noto-serif)] text-2xl text-[#002045]">{DOC_LABEL[docType]} {docNumber(pedido)}</h1>
        </div>
        <div className="document-toolbar flex flex-wrap gap-2 items-center">
          {!readOnly && (
            <>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocumentType)}
                className="border border-[#d8d5cf] bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-[#002045]"
              >
                <option value="orcamento">Orçamento</option>
                <option value="pedido">Pedido de Venda</option>
                <option value="nota">Nota de Venda</option>
                <option value="recibo">Recibo</option>
              </select>
              <label className="border border-[#d8d5cf] bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-[#002045] flex items-center gap-2">
                <input type="checkbox" checked={includeImages} onChange={(e) => setIncludeImages(e.target.checked)} />
                Imagens
              </label>
              <label className="border border-[#d8d5cf] bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-[#002045] flex items-center gap-2">
                <input type="checkbox" checked={includeDescriptions} onChange={(e) => setIncludeDescriptions(e.target.checked)} />
                Descrições
              </label>
              <a href="/admin" className="border border-[#d8d5cf] bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[#002045]">Voltar</a>
            </>
          )}
          <button onClick={() => window.print()} className="bg-[#002045] text-white px-5 py-2 text-xs font-bold uppercase tracking-[0.1em]">Imprimir / PDF</button>
          {!readOnly && (
            <>
              <button
                onClick={() => sendDocument("email")}
                disabled={sending != null || !pedido.client_email}
                className="border border-[#002045] bg-white text-[#002045] disabled:opacity-40 px-4 py-2 text-xs font-bold uppercase tracking-[0.1em]"
              >
                {sending === "email" ? "Enviando..." : "Enviar e-mail"}
              </button>
              <button
                onClick={() => sendDocument("whatsapp")}
                disabled={sending != null || !pedido.client_phone}
                className="border border-[#2e7d32] bg-white text-[#2e7d32] disabled:opacity-40 px-4 py-2 text-xs font-bold uppercase tracking-[0.1em]"
              >
                {sending === "whatsapp" ? "Enviando..." : "Enviar WhatsApp"}
              </button>
            </>
          )}
        </div>
        {!readOnly && sendStatus && <p className="basis-full text-[11px] font-bold text-[#74777f]">{sendStatus}</p>}
      </div>

      {/* Screen-only editor — never printed. Lets the admin add/replace the
          Condições text right here instead of going back to Pedidos. For
          Orçamento this is the ONLY text shown (no legal boilerplate); for
          Pedido/Nota it overrides the default boilerplate once saved.
          Hidden entirely for the client's read-only view. */}
      {!readOnly && (
      <div className="document-notes-editor max-w-[980px] mx-auto mb-4 bg-white border border-[#d8d5cf] p-4">
        <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#74777f] mb-2">
          {docType === "orcamento" ? "Texto adicional (opcional, aparece em Condições)" : "Condições — editar texto"}
        </p>
        <textarea
          value={notesDraft}
          onChange={(e) => { setNotesDraft(e.target.value); setNotesSaved(false); }}
          rows={4}
          placeholder={docType === "orcamento" ? "ex: validade da proposta, observações para o cliente…" : "Deixe em branco para usar o texto padrão de cláusulas contratuais."}
          className="w-full border border-[#d8d5cf] px-3 py-2 text-xs font-[var(--font-inter)] text-[#1a1c1c] focus:outline-none focus:border-[#002045] resize-y"
        />
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={saveNotes}
            disabled={savingNotes}
            className="bg-[#002045] text-white disabled:opacity-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.1em]"
          >
            {savingNotes ? "Salvando..." : "Salvar texto"}
          </button>
          {notesSaved && <span className="text-[11px] font-bold text-[#2e7d32]">Salvo.</span>}
        </div>
        <label className="flex items-center gap-2 text-xs font-[var(--font-inter)] text-[#43474e] mt-3 pt-3 border-t border-[#f0f0f0]">
          <input
            type="checkbox"
            checked={legalTermsEnabled}
            onChange={(e) => toggleLegalTerms(e.target.checked)}
          />
          Mostrar a seção &quot;Condições&quot; (cláusulas) neste pedido
        </label>
      </div>
      )}

      <article className="document-page mx-auto bg-white text-[#1a1c1c] shadow-sm">
        <section className="doc-header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.png" alt="Orbital" className="doc-logo" />
          <div>
            <h2>{COMPANY.name}</h2>
            <p>{COMPANY.cnpj}</p>
            <p>{COMPANY.address}</p>
            <p>{COMPANY.city}</p>
          </div>
          <p className="doc-email">{COMPANY.email}</p>
        </section>

        <section className="doc-grid">
          <div>
            <p className="doc-section-label">Dados do Cliente</p>
            <p className="doc-strong">{pedido.client_name}</p>
            {documentLine(pedido.client_document) && <p>{documentLine(pedido.client_document)}</p>}
            {pedido.client_email && <p>{pedido.client_email}</p>}
            {pedido.client_phone && <p>{pedido.client_phone}</p>}
            {customerAddress.map((line) => <p key={line}>{line}</p>)}
          </div>
          <div className="doc-meta">
            {/* Orçamento e Pedido de Venda saem com a data de hoje (e a validade
                contada a partir de hoje); Nota e Recibo mantêm a data do pedido. */}
            <p><span>Data:</span> {docType === "orcamento" || docType === "pedido" ? datas.data : fmtDia(pedido.created_at)}</p>
            {docType === "orcamento" && <p><span>Validade:</span> {datas.validade}</p>}
            <p><span>Nº:</span> {docNumber(pedido)}</p>
          </div>
        </section>

        <div className="doc-title-bar">{DOC_LABEL[docType].toUpperCase()} Nº {docNumber(pedido)}</div>

        <section>
          <p className="doc-section-label">Produtos</p>
          <table className="doc-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Quantidade</th>
                <th>Unidade</th>
                <th>Valor Unitário</th>
                <th>Valor Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const unit = Number(it.unit_price) || 0;
                const qty = Number(it.plates) || 0;
                const u = itemUnitInfo(it);
                const sub = [it.product_code ? `Modelo: ${it.product_code}` : null, u.detail]
                  .filter(Boolean).join("  ·  ");
                return (
                  <tr key={it.id}>
                    <td>
                      <span className="doc-item-name">{it.product_name || "Produto Orbital"}</span>
                      {sub && <span className="doc-item-sub">{sub}</span>}
                    </td>
                    <td>{qty}</td>
                    <td>{u.short}</td>
                    <td>{fmtBRL(unit)}</td>
                    <td>{fmtBRL(unit * qty)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {(() => {
          // Build the "Detalhes dos produtos" list. An item earns a detail entry
          // ONLY if it actually has something to show there:
          //   • an image (when Imagens is on), or
          //   • a description (when Descrições is on).
          // An item with no image (e.g. "Cola PU-40") gets NO card at all — not a
          // bordered "no image" placeholder, not an empty slot, nothing. It simply
          // doesn't appear in this section. (This is the ornament-PDF layout the
          // user asked for: image on the same line as the name, and image-less
          // items omitted entirely.)
          const detail = items
            .map((it) => {
              const imagePath = normalizeAssetPath(it.product_image_path);
              return {
                it,
                imagePath,
                hasImage: includeImages && !!imagePath,
                hasDesc: includeDescriptions && !!it.product_description,
              };
            })
            .filter((d) => d.hasImage || d.hasDesc);
          if (detail.length === 0) return null;
          return (
            <section className="doc-product-details">
              <p className="doc-section-label">Detalhes dos produtos</p>
              <div className="doc-product-grid">
                {detail.map(({ it, imagePath, hasImage }) =>
                  hasImage ? (
                    <div key={`${it.id}-details`} className="doc-product-card">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagePath ?? undefined} alt={it.product_name || "Produto Orbital"} />
                      <div>
                        <p className="doc-product-name">{it.product_name || "Produto Orbital"}</p>
                        {includeDescriptions && it.product_description && <p>{it.product_description}</p>}
                      </div>
                    </div>
                  ) : (
                    // Description-only (no image): plain text, no bordered box.
                    <div key={`${it.id}-details`} className="doc-product-textonly">
                      <p className="doc-product-name">{it.product_name || "Produto Orbital"}</p>
                      <p>{it.product_description}</p>
                    </div>
                  )
                )}
              </div>
            </section>
          );
        })()}

        <section className="doc-totals">
          <div>
            <p><span>Subtotal</span><strong>{fmtBRL(totals.subtotal)}</strong></p>
            {totals.discount > 0 && <p><span>Desconto</span><strong>- {fmtBRL(totals.discount)}</strong></p>}
            {totals.freight > 0 && <p><span>Frete</span><strong>{fmtBRL(totals.freight)}</strong></p>}
            <p className="doc-total"><span>Total</span><strong>{fmtBRL(totals.total)}</strong></p>
          </div>
        </section>

        {/* Uma arquiteta entendeu que o orçamento incluía a instalação. Fica logo
            abaixo do Total, que é onde o cliente para de ler. */}
        <p className="doc-escopo">
          Este {docType === "orcamento" ? "orçamento" : "documento"} contempla apenas o fornecimento
          do material descrito acima. A Orbital não executa instalação — mão de obra e serviços de
          aplicação não estão incluídos.
        </p>

        <section className="doc-commercial">
          <div>
            <p className="doc-section-label">Formas de pagamento</p>
            <p>{pedido.payment_methods?.length ? pedido.payment_methods.join(", ") : "Pix"}</p>
          </div>
          <div>
            <p className="doc-section-label">Condições de pagamento</p>
            <p style={{ whiteSpace: "pre-line" }}>{pedido.payment_terms || "PIX ou dinheiro à vista"}</p>
          </div>
          <div>
            <p className="doc-section-label">Garantia</p>
            <p>{pedido.warranty_terms || "Garantia legal conforme Código de Defesa do Consumidor."}</p>
          </div>
        </section>

        {(pedido.notes || legalText) && (
          <section className="doc-notes">
            <p className="doc-section-label">Condições</p>
            {pedido.notes && <p className="doc-order-notes">{pedido.notes}</p>}
            {legalText && <p className="doc-contract">{legalText}</p>}
          </section>
        )}

        <section className="doc-signatures">
          <div><span />{COMPANY.name}</div>
          <div><span />{pedido.client_name}</div>
        </section>
        <p className="doc-fiscal">*** Não é válido como documento fiscal ***</p>
      </article>

      <style jsx global>{`
        /* Unconditional (screen AND print) — see the orbital-doc-page effect
           above for why @media print alone wasn't reliable. */
        body.orbital-doc-page > header,
        body.orbital-doc-page > footer {
          display: none !important;
        }
        .document-page {
          width: 210mm;
          min-height: 297mm;
          padding: 17mm;
          font-family: Arial, sans-serif;
          font-size: 11px;
          line-height: 1.25;
        }
        .doc-header {
          display: grid;
          grid-template-columns: 70px 1fr auto;
          gap: 12px;
          align-items: start;
          margin-bottom: 18px;
        }
        .doc-logo { width: 58px; height: auto; }
        .doc-header h2 { font-size: 15px; margin: 0 0 2px; font-weight: 700; }
        .doc-header p { margin: 0; }
        .doc-email { text-align: right; font-size: 10px; }
        .doc-grid {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 24px;
          border-top: 1px solid #d8d8d8;
          padding-top: 8px;
          margin-bottom: 10px;
        }
        .doc-section-label {
          color: #555;
          font-size: 14px;
          margin: 0 0 6px;
          border-bottom: 1px solid #d8d8d8;
          padding-bottom: 2px;
        }
        .doc-strong { font-weight: 700; }
        .doc-grid p { margin: 0 0 2px; }
        .doc-meta { text-align: right; min-width: 150px; align-self: end; }
        .doc-meta span { color: #555; }
        .doc-title-bar {
          background: #8d8d8d;
          color: #fff;
          text-align: center;
          padding: 5px;
          font-size: 14px;
          margin: 10px 0 14px;
        }
        .doc-table { width: 100%; border-collapse: collapse; margin-top: 5px; }
        .doc-table thead { display: table-header-group; }
        .doc-table th {
          background: #e1e1e1;
          font-weight: 400;
          text-align: left;
          padding: 4px;
        }
        .doc-table th:not(:first-child), .doc-table td:not(:first-child) { text-align: right; }
        .doc-table td { padding: 4px; border-bottom: 1px solid #eee; vertical-align: top; }
        .doc-item-name { display: block; font-weight: 700; }
        .doc-item-sub { display: block; font-size: 11px; color: #777; margin-top: 1px; }
        .doc-totals { display: flex; justify-content: flex-end; margin: 18px 0 22px; }
        .doc-totals > div { width: 230px; }
        .doc-totals p { display: flex; justify-content: space-between; margin: 0 0 7px; gap: 20px; }
        .doc-total { font-size: 13px; font-weight: 700; border-top: 1px solid #d8d8d8; padding-top: 7px; }
        .doc-escopo {
          font-weight: 700;
          font-size: 10.5px;
          line-height: 1.45;
          color: #002045;
          background: #f4f1ea;
          border-left: 3px solid #002045;
          padding: 9px 12px;
          margin: 0 0 20px;
          /* o navegador tira fundos na impressão por padrão */
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .doc-commercial {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 18px;
        }
        .doc-commercial p { margin: 0; }
        .doc-product-details { margin: 4px 0 18px; page-break-inside: avoid; }
        .doc-product-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .doc-product-card { display: grid; grid-template-columns: 72px 1fr; gap: 8px; border: 1px solid #e4e4e4; padding: 8px; page-break-inside: avoid; align-items: center; }
        .doc-product-card img { width: 72px; height: 72px; object-fit: cover; display: block; }
        .doc-product-card p, .doc-product-textonly p { margin: 0; color: #555; font-size: 9.5px; }
        .doc-product-textonly { padding: 8px 0; page-break-inside: avoid; }
        .doc-product-name { color: #1a1c1c !important; font-weight: 700; font-size: 10.5px !important; margin-bottom: 3px !important; }
        .doc-notes { margin-top: 8px; page-break-inside: auto; }
        .doc-order-notes { white-space: pre-wrap; margin: 0 0 12px; }
        .doc-contract { white-space: pre-wrap; margin: 0; font-size: 9.5px; color: #555; }
        .doc-signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          margin: 45px 40px 18px;
          text-align: center;
          font-weight: 700;
        }
        .doc-signatures span { display: block; border-top: 1px solid #aaa; margin-bottom: 8px; }
        .doc-fiscal { text-align: center; color: #777; font-size: 9px; margin: 0; }

        @media screen and (max-width: 860px) {
          .document-page {
            width: min(100%, 210mm);
            min-height: auto;
            padding: 24px;
            overflow-x: auto;
          }
          .doc-commercial { grid-template-columns: 1fr; }
          .doc-header { grid-template-columns: 60px 1fr; }
          .doc-email { grid-column: 1 / -1; text-align: left; }
        }

        @media print {
          @page { size: A4; margin: 12mm 13mm; }
          html, body { background: #fff !important; }
          body > header, body > footer, .document-actions, .document-notes-editor, .fixed, iframe { display: none !important; }
          .document-shell { padding: 0 !important; background: #fff !important; }
          .document-page {
            width: auto;
            min-height: auto;
            padding: 0;
            box-shadow: none !important;
            margin: 0 !important;
          }
          .doc-header, .doc-grid, .doc-title-bar, .doc-commercial, .doc-product-card, .doc-product-card-noimg, .doc-signatures { page-break-inside: avoid; }
          .doc-section-label { break-after: avoid; }
          .doc-contract { font-size: 10px; line-height: 1.28; }
        }
      `}</style>
    </main>
  );
}
