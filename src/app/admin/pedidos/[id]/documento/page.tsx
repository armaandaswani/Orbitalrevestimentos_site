"use client";

import React, { useEffect, useMemo, useState } from "react";

type DocumentType = "orcamento" | "pedido" | "nota" | "recibo";

interface PedidoItem {
  id: string;
  product_name: string | null;
  plates: number;
  unit_price: number | null;
  unit_cost: number | null;
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

const DEFAULT_NOTES =
  "CLÁUSULAS CONTRATUAIS - DISPOSIÇÕES GERAIS ORBITAL REVESTIMENTOS\n\nA ORBITAL atua como fornecedora de revestimentos decorativos, não executando, não projetando e não acompanhando obra quando estes serviços não estiverem expressamente descritos neste pedido.\n\nOs produtos fornecidos possuem caráter estrutural e decorativo, não se equiparando a pedra natural, madeira maciça ou materiais construtivos tradicionais.\n\nA liberação para entrega ou retirada ocorre mediante pagamento integral à vista ou aprovação formal da condição comercial registrada neste documento.\n\nProdutos podem apresentar variações dimensionais, visuais e de tonalidade entre lotes. Imagens, amostras e catálogos têm caráter ilustrativo.\n\nNão é válido como documento fiscal.";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("pt-BR");
}

function docNumber(pedido: PedidoDocument) {
  const year = new Date(pedido.created_at).getFullYear().toString().slice(-2);
  return `${pedido.id.slice(0, 8).toUpperCase()}-${year}`;
}

function addressLines(pedido: PedidoDocument) {
  return [
    pedido.client_address,
    pedido.client_address_complement,
    [pedido.client_zip, pedido.client_city, pedido.client_state].filter(Boolean).join(" - "),
  ].filter(Boolean);
}

export default function PedidoDocumentoPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null);
  const [docType, setDocType] = useState<DocumentType>("orcamento");
  const [pedido, setPedido] = useState<PedidoDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    const tipo = new URLSearchParams(window.location.search).get("tipo") || "orcamento";
    if (["orcamento", "pedido", "nota", "recibo"].includes(tipo)) setDocType(tipo as DocumentType);
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/admin/pedidos/${id}`)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        setPedido(data as PedidoDocument);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Falha ao carregar documento."))
      .finally(() => setLoading(false));
  }, [id]);

  const totals = useMemo(() => {
    const items = pedido?.items ?? [];
    const itemSubtotal = items.reduce((s, it) => s + (Number(it.unit_price) || 0) * (Number(it.plates) || 0), 0);
    const discount = Number(pedido?.discount_amount) || 0;
    const freight = Number(pedido?.freight_amount) || 0;
    const fallbackSubtotal = Math.max(0, (Number(pedido?.total) || 0) + discount - freight);
    const subtotal = itemSubtotal > 0 ? itemSubtotal : fallbackSubtotal;
    const total = Number(pedido?.total) || Math.max(0, subtotal - discount + freight);
    return { subtotal, discount, freight, total };
  }, [pedido]);

  if (loading) {
    return <main className="min-h-screen pt-28 bg-[#f4f2ee] flex items-center justify-center text-[#74777f]">Carregando documento...</main>;
  }

  if (error || !pedido) {
    return (
      <main className="min-h-screen pt-28 bg-[#f4f2ee] flex items-center justify-center px-4">
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
  const notes = pedido.document_notes?.trim() || DEFAULT_NOTES;

  return (
    <main className="document-shell min-h-screen bg-[#f4f2ee] pt-28 pb-12 px-4">
      <div className="document-actions max-w-[980px] mx-auto mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#74777f]">Documento comercial</p>
          <h1 className="font-[var(--font-noto-serif)] text-2xl text-[#002045]">{DOC_LABEL[docType]} {docNumber(pedido)}</h1>
        </div>
        <div className="flex gap-2">
          <a href="/admin" className="border border-[#d8d5cf] bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[#002045]">Voltar</a>
          <button onClick={() => window.print()} className="bg-[#002045] text-white px-5 py-2 text-xs font-bold uppercase tracking-[0.1em]">Imprimir / PDF</button>
        </div>
      </div>

      <article className="document-page mx-auto bg-white text-[#1a1c1c] shadow-sm">
        <section className="doc-header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/orbital-logo.png" alt="Orbital" className="doc-logo" />
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
            {pedido.client_email && <p>{pedido.client_email}</p>}
            {pedido.client_phone && <p>{pedido.client_phone}</p>}
            {customerAddress.map((line) => <p key={line}>{line}</p>)}
          </div>
          <div className="doc-meta">
            <p><span>Data:</span> {fmtDate(pedido.created_at)}</p>
            {docType === "orcamento" && <p><span>Validade:</span> {fmtDate(pedido.quote_valid_until)}</p>}
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
                return (
                  <tr key={it.id}>
                    <td>{it.product_name || "Produto Orbital"}</td>
                    <td>{qty}</td>
                    <td>un</td>
                    <td>{fmtBRL(unit)}</td>
                    <td>{fmtBRL(unit * qty)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="doc-totals">
          <div>
            <p><span>Subtotal</span><strong>{fmtBRL(totals.subtotal)}</strong></p>
            {totals.discount > 0 && <p><span>Desconto</span><strong>- {fmtBRL(totals.discount)}</strong></p>}
            {totals.freight > 0 && <p><span>Frete / despesas</span><strong>{fmtBRL(totals.freight)}</strong></p>}
            <p className="doc-total"><span>Total</span><strong>{fmtBRL(totals.total)}</strong></p>
          </div>
        </section>

        <section className="doc-commercial">
          <div>
            <p className="doc-section-label">Formas de pagamento</p>
            <p>{pedido.payment_methods?.length ? pedido.payment_methods.join(", ") : "Pix"}</p>
          </div>
          <div>
            <p className="doc-section-label">Condições de pagamento</p>
            <p>{pedido.payment_terms || "PIX ou dinheiro à vista"}</p>
          </div>
          <div>
            <p className="doc-section-label">Garantia</p>
            <p>{pedido.warranty_terms || "Garantia legal conforme Código de Defesa do Consumidor."}</p>
          </div>
        </section>

        {(pedido.notes || notes) && (
          <section className="doc-notes">
            <p className="doc-section-label">Observações</p>
            {pedido.notes && <p className="doc-order-notes">{pedido.notes}</p>}
            <p className="doc-contract">{notes}</p>
          </section>
        )}

        <section className="doc-signatures">
          <div><span />{COMPANY.name}</div>
          <div><span />{pedido.client_name}</div>
        </section>
        <p className="doc-fiscal">*** Não é válido como documento fiscal ***</p>
      </article>

      <style jsx global>{`
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
        .doc-table th {
          background: #e1e1e1;
          font-weight: 400;
          text-align: left;
          padding: 4px;
        }
        .doc-table th:not(:first-child), .doc-table td:not(:first-child) { text-align: right; }
        .doc-table td { padding: 4px; border-bottom: 1px solid #eee; }
        .doc-totals { display: flex; justify-content: flex-end; margin: 18px 0 22px; }
        .doc-totals > div { width: 230px; }
        .doc-totals p { display: flex; justify-content: space-between; margin: 0 0 7px; gap: 20px; }
        .doc-total { font-size: 13px; font-weight: 700; border-top: 1px solid #d8d8d8; padding-top: 7px; }
        .doc-commercial {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 18px;
        }
        .doc-commercial p { margin: 0; }
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
          @page { size: A4; margin: 0; }
          html, body { background: #fff !important; }
          body > header, body > footer, .document-actions, .fixed, iframe { display: none !important; }
          .document-shell { padding: 0 !important; background: #fff !important; }
          .document-page {
            width: 210mm;
            min-height: 297mm;
            padding: 14mm 15mm;
            box-shadow: none !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </main>
  );
}
