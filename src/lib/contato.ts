/**
 * Pré-contato — o único caminho do cliente até o WhatsApp da Orbital.
 *
 * Todo botão comercial do site (e o assistente de IA) abre a aba de
 * pré-contato: o cliente escolhe o revestimento (ou já chega com ele, vindo da
 * página do produto), diz se já conhece o Painel Flexível Fibra de Bambu (se
 * não, vê uma apresentação de 3 pontos), responde perfil, o que mais valoriza,
 * o que espera do painel, quando pretende fazer o projeto e a cidade
 * (obrigatórios), medidas e nome (opcionais), e cai no WhatsApp com uma
 * mensagem organizada para o consultor. O WhatsApp do
 * cliente não é pedido: a própria conversa já traz o número. Cada envio fica
 * registrado (POST /api/contato → tabela site_contatos).
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

/** Estágio da obra — pergunta antiga (até out/2026); fica para ler envios antigos. */
export const ETAPAS = [
  { value: "inicial", label: "Inicial" },
  { value: "final", label: "Final" },
  { value: "ideacao", label: "Em ideação" },
] as const;

/** Já conhece o Painel Flexível Fibra de Bambu? "nao" mostra a apresentação rápida. */
export const CONHECE = [
  { value: "sim", label: "Sim, já conheço" },
  { value: "nao", label: "Não, quero conhecer" },
] as const;

export const VALORIZA = [
  { value: "sofisticacao_durabilidade", label: "Sofisticação e Durabilidade" },
  { value: "qualidade_custo_beneficio", label: "Qualidade e Custo-Benefício" },
  { value: "agilidade_praticidade", label: "Agilidade e Praticidade" },
  { value: "preco", label: "Preço" },
] as const;

/**
 * Opções de "o que valoriza" até out/2026. Ficam para ler envios antigos e
 * aceitar uma aba aberta antes da troca ("preco" continua igual).
 */
export const VALORIZA_LEGADO = [
  { value: "sofisticacao", label: "Sofisticação & durabilidade" },
  { value: "custo_beneficio", label: "Custo-benefício e praticidade" },
] as const;

/** O que o cliente espera do painel: até MAX_ESPERA, na ordem da tela. */
export const ESPERA = [
  { value: "resolver_problema", label: "Que resolva um problema do meu ambiente" },
  { value: "mais_em_conta", label: "Que seja a opção mais em conta" },
  { value: "umidade_calor", label: "Que resista à umidade e ao calor" },
  { value: "obra_rapida", label: "Que a obra seja rápida e sem quebra-quebra" },
  { value: "sofisticado", label: "Que deixe o ambiente sofisticado" },
] as const;
export const MAX_ESPERA = 3;
/** "Conte qual (opcional)": só vale com "resolver_problema" marcado. */
export const ESPERA_COM_DETALHE = "resolver_problema";
export const ESPERA_DETALHE_MAX = 200;

export const PRAZOS = [
  { value: "30_dias", label: "Nos próximos 30 dias" },
  { value: "3_meses", label: "Nos próximos 3 meses" },
  { value: "planejando", label: "Ainda estou planejando" },
] as const;

export const CIDADES = [
  { value: "manaus", label: "Manaus" },
  { value: "outra", label: "Outra" },
] as const;

export interface RespostasContato {
  /** Já conhece o Painel Flexível Fibra de Bambu (CONHECE: "sim" | "nao"). */
  conhece?: string;
  perfil?: string;
  /** O que o cliente mais valoriza num revestimento (VALORIZA). */
  valoriza?: string;
  /** O que espera do painel (valores de ESPERA, até MAX_ESPERA). */
  espera?: string[];
  /** Qual problema quer resolver (opcional, só com ESPERA_COM_DETALHE). */
  esperaDetalhe?: string;
  /** Quando pretende fazer o projeto (PRAZOS). */
  prazo?: string;
  nome?: string;
  /** Legado: o pré-contato não pede mais WhatsApp nem estágio da obra. */
  whatsapp?: string;
  etapa?: string;
  largura?: string;
  altura?: string;
  cidade?: string;
  cidadeOutra?: string;
  /** Várias áreas medidas no Visualizador ("Sala: 3 × 2,6 m"). */
  areasDetalhe?: string[];
}

export type CampoObrigatorio = "conhece" | "perfil" | "valoriza" | "espera" | "prazo" | "cidade";

/**
 * Perguntas que entraram em out/2026. O formulário exige; o servidor aceita
 * sem elas, para não perder o envio de uma aba aberta antes da troca.
 */
export const CAMPOS_NOVOS: readonly CampoObrigatorio[] = ["conhece", "espera"];

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

/**
 * O que falta para enviar, na ordem das telas: se conhece o painel, perfil, o
 * que valoriza, o que espera, prazo e cidade (com o nome, se "Outra").
 */
export function pendenciasContato(r: RespostasContato): CampoObrigatorio[] {
  const faltam: CampoObrigatorio[] = [];
  if (!r.conhece) faltam.push("conhece");
  if (!r.perfil) faltam.push("perfil");
  if (!r.valoriza) faltam.push("valoriza");
  if (!r.espera?.length) faltam.push("espera");
  if (!r.prazo) faltam.push("prazo");
  if (!r.cidade || (r.cidade === "outra" && !r.cidadeOutra?.trim())) faltam.push("cidade");
  return faltam;
}

function rotulo(lista: ReadonlyArray<{ value: string; label: string }>, v?: string): string {
  return lista.find((o) => o.value === v)?.label ?? "";
}

/** Rótulo do que valoriza, inclusive das opções antigas. */
export function rotuloValoriza(v?: string): string {
  return rotulo(VALORIZA, v) || rotulo(VALORIZA_LEGADO, v);
}

/** Rótulos do que espera, na ordem da tela; ignora valor desconhecido. */
export function rotulosEspera(v?: readonly string[]): string[] {
  if (!v?.length) return [];
  return ESPERA.filter((o) => v.includes(o.value)).map((o) => o.label);
}

/** Texto livre do problema, numa linha e no limite; vazio sem a opção marcada. */
export function detalheEspera(r: RespostasContato): string {
  if (!r.espera?.includes(ESPERA_COM_DETALHE)) return "";
  return String(r.esperaDetalhe ?? "").replace(/\s+/g, " ").trim().slice(0, ESPERA_DETALHE_MAX);
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
    linhas.push("Olá! Vim pelo site da Orbital e gostaria de ajuda para escolher o revestimento.");
  }

  const dados: string[] = [];
  const nome = r.nome?.trim();
  if (nome) dados.push(`• Nome: ${nome}`);
  const perfil = r.perfil === "arquiteto" ? "Arquiteto(a)" : r.perfil === "proprietario" ? "Proprietário(a)" : "";
  if (perfil) dados.push(`• Perfil: ${perfil}`);
  const conhece = r.conhece === "sim" ? "Sim" : r.conhece === "nao" ? "Ainda não" : "";
  if (conhece) dados.push(`• Já conheço o Painel Flexível Fibra de Bambu: ${conhece}`);
  const valoriza = rotuloValoriza(r.valoriza);
  if (valoriza) dados.push(`• O que mais valorizo: ${valoriza}`);
  const espera = rotulosEspera(r.espera);
  // Nome completo na primeira vez que o painel aparece na mensagem.
  if (espera.length) dados.push(`• O que espero do ${conhece ? "PFB" : "Painel Flexível Fibra de Bambu"}: ${espera.join("; ")}`);
  const detalhe = detalheEspera(r);
  if (detalhe) dados.push(`• Problema que quero resolver: ${detalhe}`);
  const prazo = rotulo(PRAZOS, r.prazo);
  if (prazo) dados.push(`• Quando: ${prazo}`);
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
