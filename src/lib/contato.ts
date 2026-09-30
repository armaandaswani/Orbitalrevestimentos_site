/**
 * "Entrar em contato" — o caminho do cliente depois do pivô.
 *
 * O orçamento instantâneo saiu do site: quem se interessa por um revestimento
 * responde 4 perguntas rápidas (todas opcionais) e cai no WhatsApp da Orbital
 * com uma mensagem organizada, para o consultor já saber de onde partir.
 *
 * Sem import nenhum: roda no navegador (aba de contato, botões) e pode ser
 * usado no servidor.
 */

export const WHATSAPP_VENDAS = "5592988150149";

/**
 * Orçamento instantâneo (/simulador) visível para o cliente? A página e todo o
 * código continuam funcionando; com false, os caminhos que levavam o cliente
 * até ele mostram "Falar com um consultor". Para voltar, true.
 */
export const ORCAMENTO_INSTANTANEO_VISIVEL = false;

/** Revestimento que o cliente estava vendo quando pediu contato. */
export interface ProdutoContato {
  code?: string | null;
  name?: string | null;
  linha?: string | null;
}

export const ETAPAS = [
  { value: "planejando", label: "Planejando" },
  { value: "inicio", label: "Início da obra" },
  { value: "final", label: "Fase final" },
  { value: "outro", label: "Outro" },
] as const;

export const ARQUITETO = [
  { value: "sim", label: "Sim" },
  { value: "nao", label: "Não" },
  { value: "sou", label: "Sou arquiteto(a)" },
] as const;

export const CONHECE = [
  { value: "sim", label: "Sim" },
  { value: "nao", label: "Ainda não" },
] as const;

export const METRAGEM = [
  { value: "sim", label: "Sim" },
  { value: "nao", label: "Ainda não" },
] as const;

export interface RespostasContato {
  etapa?: string;
  arquiteto?: string;
  arquitetoNome?: string;
  conhece?: string;
  metragem?: string;
  metragemM2?: string;
}

function rotulo(lista: ReadonlyArray<{ value: string; label: string }>, v?: string): string {
  return lista.find((o) => o.value === v)?.label ?? "";
}

/** Nome do revestimento como o consultor reconhece: "Nome (CÓDIGO) · Linha". */
function nomeProduto(p: ProdutoContato): string {
  const nome = p.name?.trim();
  const code = p.code?.trim();
  const base = nome && code ? `${nome} (${code})` : nome || code || "";
  if (!base) return p.linha ? `Linha ${p.linha}` : "";
  return p.linha ? `${base} · Linha ${p.linha}` : base;
}

/**
 * Mensagem do WhatsApp. Só entra o que o cliente respondeu — nenhuma linha
 * vazia ou "não informado" para o consultor decifrar.
 */
export function mensagemContato(produtos: ProdutoContato[], r: RespostasContato): string {
  const itens = produtos.map(nomeProduto).filter(Boolean);
  const linhas: string[] = [];

  if (itens.length === 1) {
    linhas.push("Olá! Vim pelo site da Orbital e tenho interesse no revestimento:", `*${itens[0]}*`);
  } else if (itens.length > 1) {
    linhas.push("Olá! Vim pelo site da Orbital e tenho interesse nestes revestimentos:", ...itens.map((i) => `• *${i}*`));
  } else {
    linhas.push("Olá! Vim pelo site da Orbital e quero falar com um consultor.");
  }

  const projeto: string[] = [];
  const etapa = rotulo(ETAPAS, r.etapa);
  if (etapa) projeto.push(`• Etapa da obra: ${etapa}`);
  if (r.arquiteto === "sim") {
    const nome = r.arquitetoNome?.trim();
    projeto.push(`• Arquiteto: sim${nome ? ` (${nome})` : ""}`);
  } else if (r.arquiteto === "nao") {
    projeto.push("• Arquiteto: não tenho");
  } else if (r.arquiteto === "sou") {
    projeto.push("• Sou arquiteto(a)");
  }
  if (r.conhece === "sim") projeto.push("• Já conheço as placas");
  else if (r.conhece === "nao") projeto.push("• Ainda não conheço as placas");
  if (r.metragem === "sim") {
    const m2 = r.metragemM2?.trim().replace(/\s*m²?$/i, "");
    projeto.push(`• Metragem: ${m2 ? `${m2} m²` : "já tenho"}`);
  } else if (r.metragem === "nao") {
    projeto.push("• Metragem: ainda não tenho");
  }

  if (projeto.length) linhas.push("", "*Sobre o meu projeto*", ...projeto);
  return linhas.join("\n");
}

export function linkWhatsappContato(produtos: ProdutoContato[], r: RespostasContato): string {
  return `https://wa.me/${WHATSAPP_VENDAS}?text=${encodeURIComponent(mensagemContato(produtos, r))}`;
}

// ── Abrir a aba de contato de qualquer lugar ─────────────────────────────────
// Evento de janela em vez de contexto React: assim um botão dentro de página
// server-side (home, guias, sobre) abre a aba sem virar provider.

export const EVENTO_CONTATO = "orbital:contato";

/** `inicial` pré-preenche respostas já conhecidas (ex.: metragem do Visualizador). */
export function abrirContato(produtos: ProdutoContato[] = [], inicial: RespostasContato = {}): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENTO_CONTATO, { detail: { produtos, inicial } }));
}
