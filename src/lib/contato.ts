/**
 * "Entrar em contato" — o caminho do cliente depois do pivô.
 *
 * O orçamento instantâneo saiu da navegação: quem se interessa por um
 * revestimento informa perfil, estágio da obra e cidade (obrigatórios), nome e
 * medidas (opcionais), e cai no WhatsApp da Orbital com uma mensagem
 * organizada, para o consultor já saber de onde partir. Cada envio também
 * fica registrado (POST /api/contato → tabela site_contatos + lead no CRM).
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
  /** Miniatura mostrada na aba (não vai para a mensagem). */
  image?: string | null;
}

export const PERFIS = [
  { value: "proprietario", label: "Sou proprietário" },
  { value: "arquiteto", label: "Sou arquiteto" },
] as const;

export const ETAPAS = [
  { value: "inicial", label: "Inicial" },
  { value: "final", label: "Final" },
  { value: "ideacao", label: "Em ideação" },
] as const;

export const CIDADES = [
  { value: "manaus", label: "Manaus" },
  { value: "outra", label: "Outra" },
] as const;

export interface RespostasContato {
  perfil?: string;
  whatsapp?: string;
  nome?: string;
  etapa?: string;
  largura?: string;
  altura?: string;
  cidade?: string;
  cidadeOutra?: string;
  /** Várias áreas medidas no Visualizador ("Sala: 3 × 2,6 m"). */
  areasDetalhe?: string[];
}

export type CampoObrigatorio = "perfil" | "whatsapp" | "etapa" | "cidade";

/** (92) 9 0000-0000 — só formata o que foi digitado, nunca bloqueia. */
export function mascaraWhatsapp(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 3) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`;
}

/** WhatsApp com DDD: 10 ou 11 dígitos. */
export function whatsappValido(v?: string): boolean {
  const d = String(v ?? "").replace(/\D/g, "");
  return d.length === 10 || d.length === 11;
}

/** O que falta para enviar: perfil, WhatsApp, etapa e cidade (com o nome, se "Outra"). */
export function pendenciasContato(r: RespostasContato): CampoObrigatorio[] {
  const faltam: CampoObrigatorio[] = [];
  if (!r.perfil) faltam.push("perfil");
  if (!whatsappValido(r.whatsapp)) faltam.push("whatsapp");
  if (!r.etapa) faltam.push("etapa");
  if (!r.cidade || (r.cidade === "outra" && !r.cidadeOutra?.trim())) faltam.push("cidade");
  return faltam;
}

function rotulo(lista: ReadonlyArray<{ value: string; label: string }>, v?: string): string {
  return lista.find((o) => o.value === v)?.label ?? "";
}

/** Nome do revestimento como o consultor reconhece: "Nome (CÓDIGO) · Linha". */
export function nomeProduto(p: ProdutoContato): string {
  const nome = p.name?.trim();
  const code = p.code?.trim();
  const base = nome && code ? `${nome} (${code})` : nome || code || "";
  if (!base) return p.linha ? `Linha ${p.linha}` : "";
  return p.linha ? `${base} · Linha ${p.linha}` : base;
}

export function numero(v?: string): number | null {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function fmt(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

/** "3 m × 2,6 m (7,8 m²)" quando as duas medidas vieram; senão a que veio. */
export function areaTexto(r: RespostasContato): string {
  const l = numero(r.largura);
  const a = numero(r.altura);
  if (l && a) return `${fmt(l)} m × ${fmt(a)} m (${fmt(Math.round(l * a * 100) / 100)} m²)`;
  if (l) return `largura ${fmt(l)} m`;
  if (a) return `altura ${fmt(a)} m`;
  return "";
}

/**
 * Mensagem do WhatsApp. Só entra o que o cliente informou — nenhuma linha
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
    linhas.push("Olá! Vim pelo site da Orbital e gostaria de um atendimento.");
  }

  const dados: string[] = [];
  const nome = r.nome?.trim();
  if (nome) dados.push(`• Nome: ${nome}`);
  const perfil = r.perfil === "arquiteto" ? "Arquiteto(a)" : r.perfil === "proprietario" ? "Proprietário(a)" : "";
  if (perfil) dados.push(`• Perfil: ${perfil}`);
  const etapa = rotulo(ETAPAS, r.etapa);
  if (etapa) dados.push(`• Estágio da obra: ${etapa}`);
  const area = areaTexto(r);
  if (area) dados.push(`• Área: ${area}`);
  if (r.areasDetalhe?.length) dados.push(`• Áreas simuladas: ${r.areasDetalhe.join("; ")}`);
  const cidade = r.cidade === "outra" ? r.cidadeOutra?.trim() : rotulo(CIDADES, r.cidade);
  if (cidade) dados.push(`• Cidade: ${cidade}`);

  if (dados.length) linhas.push("", "*Sobre o projeto*", ...dados);
  return linhas.join("\n");
}

export function linkWhatsappContato(produtos: ProdutoContato[], r: RespostasContato): string {
  return `https://wa.me/${WHATSAPP_VENDAS}?text=${encodeURIComponent(mensagemContato(produtos, r))}`;
}

// ── Abrir a aba de contato de qualquer lugar ─────────────────────────────────
// Evento de janela em vez de contexto React: assim um botão dentro de página
// server-side (home, sobre) abre a aba sem virar provider.

export const EVENTO_CONTATO = "orbital:contato";

/** `inicial` pré-preenche respostas já conhecidas (ex.: metragem do Visualizador). */
export function abrirContato(produtos: ProdutoContato[] = [], inicial: RespostasContato = {}): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENTO_CONTATO, { detail: { produtos, inicial } }));
}
