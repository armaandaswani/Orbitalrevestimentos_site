"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./importar-quantitativo.module.css";
import { MAX_IMPORT_BYTES, MAX_IMPORT_TEXT, validImportQuantityForProduct, type ImportProduct, type ImportedQuantity, type QuantityReview } from "@/lib/import-quantities";

type Product = Omit<ImportProduct, "code"> & { sku?: string | null };
type ReviewRow = QuantityReview & { selected: boolean; editedQuantity: string };
export type ImportarQuantitativoProps = {
  products: Product[];
  onApply: (items: ImportedQuantity[]) => void;
  disabled?: boolean;
};

/** Recebe propostas do servidor; só chama onApply após revisão e confirmação. */
export default function ImportarQuantitativo({ products, onApply, disabled = false }: ImportarQuantitativoProps) {
  const id = useId();
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const request = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const review = useRef<HTMLDivElement>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => { if (rows.length) review.current?.focus(); }, [rows.length]);

  const selected = rows.filter((r) => r.selected);
  const valid = selected.length > 0 && selected.every((r) => {
    const product = products.find((p) => p.id === r.product_id);
    return product && r.space.trim() && validImportQuantityForProduct(r.editedQuantity, product);
  });
  function update(index: number, patch: Partial<ReviewRow>) {
    setConfirmed(false); setRows((all) => all.map((r, i) => i === index ? { ...r, ...patch } : r));
  }
  function resetReview() { setRows([]); setWarnings([]); setConfirmed(false); setError(""); setNotice(""); }
  async function analyze() {
    resetReview();
    if (!file && !text.trim()) { setError("Escolha um arquivo ou cole uma lista de materiais."); return; }
    if (file && file.size > MAX_IMPORT_BYTES) { setError("O limite é 4 MB por arquivo."); return; }
    const controller = new AbortController(); request.current = controller;
    setBusy(true);
    try {
      const form = new FormData();
      if (file) form.append("file", file); else form.append("text", text);
      const response = await fetch("/api/admin/orders/import-quantities", { method: "POST", body: form, signal: controller.signal });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Não foi possível analisar. Tente novamente.");
      if (!Array.isArray(result.items) || !result.items.length) throw new Error("Nenhum item encontrado. Confira o arquivo.");
      setRows(result.items.map((r: QuantityReview) => ({ ...r, selected: true, editedQuantity: r.quantity == null ? "" : String(r.quantity) })));
      setWarnings(Array.isArray(result.warnings) ? result.warnings : []);
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Falha na análise. Tente novamente.");
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }
  function apply() {
    if (!valid || !confirmed || disabled || busy) return;
    onApply(selected.map((r) => ({ product_id: r.product_id!, quantity: Number(r.editedQuantity.replace(",", ".")), space: r.space.trim() })));
    const count = selected.length;
    setRows([]); setWarnings([]); setConfirmed(false); setText(""); setFile(null);
    if (input.current) input.current.value = "";
    setNotice(`${count} ${count === 1 ? "item adicionado" : "itens adicionados"} ao pedido. Confira os totais antes de enviar.`);
  }
  const field = styles.field;
  return (
    <details className={styles.importer}>
      <summary className={styles.summary}>Importar foto ou documento </summary>
      <div className={styles.content}>
        <p className={styles.description}>Envie a lista do cliente ou uma foto do quantitativo. Revise produto, quantidade e ambiente antes de adicionar ao pedido. Os preços vêm do catálogo.</p>
        <div>
          <label htmlFor={`${id}-file`} className={styles.label}>Foto ou arquivo</label>
          <input ref={input} id={`${id}-file`} type="file" accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,.txt,.csv,.tsv" disabled={busy || disabled} className={`${field} ${styles.file}`} aria-describedby={`${id}-formats`}
            onChange={(e) => { resetReview(); setFile(e.target.files?.[0] || null); }} />
          <p id={`${id}-formats`} className={styles.hint}>JPG, PNG, WebP, HEIC, PDF, TXT, CSV ou TSV Até 4 MB. O arquivo é enviado à IA configurada para leitura e não é anexado ao pedido.</p>
        </div>
        {!file && <div>
          <label htmlFor={`${id}-text`} className={styles.label}>Ou cole uma lista</label>
          <textarea id={`${id}-text`} value={text} onChange={(e) => { resetReview(); setText(e.target.value); }} maxLength={MAX_IMPORT_TEXT} rows={4} disabled={busy || disabled} placeholder={"ambiente;produto;quantidade;unidade\nLavabo;Imbuia;4;placa\nLavabo;Cola PU-40;8;tubo"} className={field} />
          <p className={styles.hint}>Uma tabela com essas colunas também funciona sem IA. Plantas só com medidas exigem conferência técnica.</p>
        </div>}
        <button type="button" disabled={busy || disabled || (!file && !text.trim())} onClick={analyze} className={styles.action}>{busy ? "Lendo o quantitativo…" : "Ler e preparar revisão"}</button>
        <div aria-live="polite" className={styles.feedback}>{busy && <p className={styles.description}>A análise pode levar até um minuto. Aguarde nesta etapa.</p>}{notice && <p className={styles.success}>{notice}</p>}</div>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        {rows.length > 0 && <div ref={review} tabIndex={-1} className={styles.review} role="region" aria-label="Revisão do quantitativo importado">
          <div className="flex flex-wrap items-baseline justify-between gap-2"><h4 className="text-base font-semibold">Confira o que encontramos</h4><span className={styles.hint}>{selected.length} de {rows.length} itens selecionados</span></div>
          {warnings.length > 0 && <ul className={styles.warnings}>{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
          <div className={styles.rows}>{rows.map((r, index) => {
            const product = products.find((p) => p.id === r.product_id);
            return <div key={index} className={styles.row} data-selected={r.selected}>
              <label className={`${styles.checkLabel} ${styles.materialName}`}><input type="checkbox" checked={r.selected} disabled={disabled || busy} onChange={(e) => update(index, { selected: e.target.checked })} className={styles.checkbox} /><span>{r.description || r.code || `Material ${index + 1}`} {r.unit && <span className={styles.unit}> ({r.quantity ?? "?"} {r.unit})</span>}</span></label>
              {r.evidence && <p className={styles.hint}>Fonte: {r.evidence}</p>}
              {r.warnings.length > 0 && <p className={styles.warning}>{r.warnings.join(" ")}</p>}
              <fieldset disabled={!r.selected || disabled || busy} className={styles.fields}>
                <div className={styles.product}><label htmlFor={`${id}-product-${index}`} className={styles.label}>Produto no catálogo</label><select id={`${id}-product-${index}`} className={field} value={r.product_id || ""} aria-invalid={r.selected && !product} onChange={(e) => update(index, { product_id: e.target.value || null })}><option value="">Selecione o produto</option>{products.map((p) => <option value={p.id} key={p.id}>{p.name}{p.sku ? ` · ${p.sku}` : ""} · {p.sale_unit || "placa"}</option>)}</select></div>
                <div className="min-w-0"><label htmlFor={`${id}-space-${index}`} className={styles.label}>Ambiente</label><input id={`${id}-space-${index}`} className={field} maxLength={120} value={r.space} aria-invalid={r.selected && !r.space.trim()} placeholder="Ex.: Lavabo" onChange={(e) => update(index, { space: e.target.value })} /></div>
                <div><label htmlFor={`${id}-quantity-${index}`} className={styles.label}>Qtd. ({product?.sale_unit || "un."})</label><input id={`${id}-quantity-${index}`} className={field} type="text" inputMode="decimal" value={r.editedQuantity} aria-invalid={r.selected && !!product && !validImportQuantityForProduct(r.editedQuantity, product)} maxLength={12} placeholder="Qtd." onChange={(e) => update(index, { editedQuantity: e.target.value })} /></div>
              </fieldset>
            </div>;
          })}</div>
          {!valid && <p className={styles.warning}>Preencha produto, quantidade válida e ambiente de cada item selecionado. Desmarque os itens que não deseja importar.</p>}
          <label className={styles.checkLabel}><input type="checkbox" checked={confirmed} disabled={!valid || disabled || busy} onChange={(e) => setConfirmed(e.target.checked)} className={styles.checkbox} />Conferi as quantidades, unidades, produtos e ambientes com o documento original.</label>
          <button type="button" disabled={!valid || !confirmed || busy || disabled} onClick={apply} className={`${styles.action} ${styles.apply}`}>Adicionar {selected.length} {selected.length === 1 ? "item" : "itens"} ao pedido</button>
        </div>}
      </div>
    </details>
  );
}
