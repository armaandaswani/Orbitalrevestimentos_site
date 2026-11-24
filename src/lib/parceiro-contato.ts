/**
 * Pré-contato de parceiros — o caminho do profissional que não indica clientes
 * até o WhatsApp da Orbital (decisão do dono, 24/11/2026).
 *
 * O portal /parceiro (cupom, comissão, simulações) continua só para quem
 * indica: arquitetos e designers de interiores, com o cadastro de sempre.
 * Lojista, marceneiro, engenheiro, construtor, aplicador e corretor respondem
 * umas perguntas rápidas, uma por tela, e caem no WhatsApp de vendas com a
 * mensagem organizada. Sem senha, sem e-mail, sem nascimento, sem código de
 * indicação. O envio também vira um contato no CRM do representante
 * (POST /api/parceiro-contato → rep_partner_crm + rep_partner_notes). Se um
 * deles passar a indicar clientes, o consultor manda o convite do portal que o
 * painel já gera.
 *
 * Mesmo arquivo para o formulário (ParceiroSheet) e para a rota: o servidor
 * valida contra as mesmas opções que a tela mostra. Sem import nenhum (roda no
 * node --test): o número de vendas (WHATSAPP_VENDAS, lib/contato) entra por
 * parâmetro no link.
 */

export type PerfilParceiro = "lojista" | "marceneiro" | "engenheiro" | "construtor" | "aplicador" | "corretor";

export interface OpcaoParceiro {
  readonly value: string;
  readonly label: string;
}

export interface PerguntaParceiro {
  id: string;
  titulo: string;
  apoio?: string;
  /** Escolha múltipla (botão Continuar); sem isso, tocar na opção já segue. */
  multipla?: boolean;
  /** Rótulo da linha na mensagem e na nota do CRM ("Loja: …"). */
  linha: string;
  opcoes: readonly OpcaoParceiro[];
  /** Só aparece quando a resposta de outra pergunta NÃO é esta. */
  pulaSe?: { id: string; valor: string };
}

export interface DefPerfilParceiro {
  slug: PerfilParceiro;
  /** Profissão como o portal e o CRM escrevem (prospect_profession). */
  rotulo: string;
  /** Como entra na frase "Sou Ana, {naFrase} em Manaus." */
  naFrase: string;
  /** Sobretítulo da primeira tela ("Parceria para marceneiros"). */
  para: string;
  perguntas: readonly PerguntaParceiro[];
}

const QUERO = "Quero";

export const PERFIS_PARCEIRO: Record<PerfilParceiro, DefPerfilParceiro> = {
  lojista: {
    slug: "lojista",
    rotulo: "Lojista / revendedor",
    naFrase: "lojista",
    para: "Parceria para revendedores",
    perguntas: [
      {
        id: "loja", titulo: "Que tipo de loja você tem?", linha: "Loja",
        opcoes: [
          { value: "materiais", label: "Materiais de construção" },
          { value: "acabamentos", label: "Acabamentos e revestimentos" },
          { value: "moveis", label: "Móveis e marcenaria" },
          { value: "decoracao", label: "Decoração" },
          { value: "sem_loja", label: "Ainda não tenho loja" },
        ],
      },
      {
        id: "vende", titulo: "Sua loja já vende revestimento de parede?", linha: "Já vende revestimento de parede",
        pulaSe: { id: "loja", valor: "sem_loja" },
        opcoes: [
          { value: "ripados", label: "Sim, painéis ripados ou MDF" },
          { value: "outros", label: "Sim, outros revestimentos" },
          { value: "nao", label: "Ainda não" },
        ],
      },
      {
        id: "quer", titulo: "O que você quer primeiro?", apoio: "Marque quantas quiser.", multipla: true, linha: QUERO,
        opcoes: [
          { value: "tabela", label: "Conhecer a tabela para revendedor" },
          { value: "catalogo", label: "Catálogo e ficha técnica para a equipe" },
          { value: "consultor", label: "Falar com um consultor sobre o primeiro pedido" },
        ],
      },
    ],
  },
  marceneiro: {
    slug: "marceneiro",
    rotulo: "Marceneiro",
    naFrase: "marceneiro(a)",
    para: "Parceria para marceneiros",
    perguntas: [
      {
        id: "faz", titulo: "O que você mais faz?", linha: "Trabalho com",
        opcoes: [
          { value: "planejados", label: "Móveis planejados" },
          { value: "paineis", label: "Painéis e revestimentos de parede" },
          { value: "reformas", label: "Reformas" },
          { value: "outro", label: "Outro" },
        ],
      },
      {
        id: "painel", titulo: "Você já trabalhou com o Painel Flexível em Fibra de Bambu?", linha: "Painel Flexível em Fibra de Bambu",
        opcoes: [
          { value: "instalei", label: "Já instalei" },
          { value: "conheco", label: "Conheço, nunca instalei" },
          { value: "nao", label: "Ainda não conheço" },
        ],
      },
      {
        id: "projetos", titulo: "Quantos projetos você faz por mês?", linha: "Projetos por mês",
        opcoes: [
          { value: "1_3", label: "1 a 3" },
          { value: "4_10", label: "4 a 10" },
          { value: "mais_10", label: "Mais de 10" },
        ],
      },
      {
        id: "quer", titulo: "O que você quer?", apoio: "Marque quantas quiser.", multipla: true, linha: QUERO,
        opcoes: [
          { value: "comprar", label: "Comprar placas com condição de parceiro" },
          { value: "formacao", label: "Fazer a formação da Academia Orbital" },
          { value: "manual", label: "Receber o manual técnico de instalação" },
        ],
      },
    ],
  },
  engenheiro: {
    slug: "engenheiro",
    rotulo: "Engenheiro civil",
    naFrase: "engenheiro(a) civil",
    para: "Parceria para engenheiros",
    perguntas: [
      {
        id: "fase", titulo: "Em que fase está o seu projeto?", linha: "Fase",
        opcoes: [
          { value: "especificando", label: "Especificando o projeto" },
          { value: "obra", label: "Obra em andamento" },
          { value: "conhecer", label: "Quero conhecer para os próximos projetos" },
        ],
      },
      {
        id: "obra", titulo: "Que tipo de obra?", linha: "Obra",
        opcoes: [
          { value: "residencial", label: "Residencial" },
          { value: "comercial", label: "Comercial" },
          { value: "clinica", label: "Clínica ou consultório" },
          { value: "outro", label: "Outro" },
        ],
      },
      {
        id: "precisa", titulo: "Do que você precisa?", apoio: "Marque quantas quiser.", multipla: true, linha: "Preciso de",
        opcoes: [
          { value: "art", label: "ART de Engenharia Civil" },
          { value: "ficha", label: "Ficha técnica" },
          { value: "orcamento", label: "Orçamento para a obra" },
          { value: "consultor", label: "Falar com um consultor" },
        ],
      },
    ],
  },
  construtor: {
    slug: "construtor",
    rotulo: "Construtor",
    naFrase: "construtor(a)",
    para: "Parceria para construtores",
    perguntas: [
      {
        id: "obra", titulo: "Que tipo de obra?", linha: "Obra",
        opcoes: [
          { value: "residencial", label: "Residencial" },
          { value: "comercial", label: "Comercial" },
          { value: "outro", label: "Outro" },
        ],
      },
      {
        id: "fase", titulo: "Em que fase está a obra?", linha: "Fase",
        opcoes: [
          { value: "projeto", label: "Projeto" },
          { value: "andamento", label: "Obra em andamento" },
          { value: "acabamento", label: "Acabamento" },
        ],
      },
      {
        id: "area", titulo: "Qual a área aproximada de parede?", apoio: "Uma estimativa já ajuda.", linha: "Área de parede",
        opcoes: [
          { value: "ate_50", label: "Até 50 m²" },
          { value: "50_200", label: "De 50 a 200 m²" },
          { value: "mais_200", label: "Mais de 200 m²" },
          { value: "nao_sei", label: "Ainda não sei" },
        ],
      },
      {
        id: "quer", titulo: "O que você quer?", apoio: "Marque quantas quiser.", multipla: true, linha: QUERO,
        opcoes: [
          { value: "orcamento", label: "Um orçamento" },
          { value: "ficha", label: "A ficha técnica" },
          { value: "consultor", label: "Falar com um consultor" },
        ],
      },
    ],
  },
  aplicador: {
    slug: "aplicador",
    rotulo: "Aplicador / instalador",
    naFrase: "aplicador(a) de revestimentos",
    para: "Parceria para aplicadores",
    perguntas: [
      {
        id: "aplica", titulo: "Você já aplica revestimentos de parede?", linha: "Já aplico revestimentos de parede",
        opcoes: [
          { value: "sim", label: "Sim" },
          { value: "nao", label: "Ainda não" },
        ],
      },
      {
        id: "formacao", titulo: "Você já fez a formação da Academia Orbital?", linha: "Formação da Academia Orbital",
        opcoes: [
          { value: "sim", label: "Sim, já fiz" },
          { value: "nao", label: "Não, quero fazer" },
        ],
      },
      {
        id: "quer", titulo: "O que você quer?", apoio: "Marque quantas quiser.", multipla: true, linha: QUERO,
        opcoes: [
          { value: "formacao", label: "Fazer a formação" },
          { value: "comprar", label: "Comprar placas" },
          { value: "manual", label: "Receber o manual técnico" },
        ],
      },
    ],
  },
  corretor: {
    slug: "corretor",
    rotulo: "Corretor de imóveis",
    naFrase: "corretor(a) de imóveis",
    para: "Parceria para corretores de imóveis",
    perguntas: [
      {
        id: "procura", titulo: "O que você procura?", linha: "Procuro",
        opcoes: [
          { value: "indicar", label: "Indicar o Painel Flexível em Fibra de Bambu a clientes que vão reformar" },
          { value: "valorizar", label: "Valorizar os imóveis que eu vendo" },
          { value: "outro", label: "Outro" },
        ],
      },
      {
        id: "imovel", titulo: "Com que tipo de imóvel você trabalha?", linha: "Imóveis",
        opcoes: [
          { value: "residencial", label: "Residencial" },
          { value: "comercial", label: "Comercial" },
          { value: "ambos", label: "Residencial e comercial" },
        ],
      },
    ],
  },
};

export const LISTA_PERFIS_PARCEIRO = Object.keys(PERFIS_PARCEIRO) as PerfilParceiro[];

/**
 * `?parceiro=` aceita o singular, o plural e o nome do dia a dia: o consultor
 * escreve o link de cabeça.
 */
const APELIDOS: Record<string, PerfilParceiro> = {
  lojista: "lojista", lojistas: "lojista", revendedor: "lojista", revendedores: "lojista", revenda: "lojista", loja: "lojista",
  marceneiro: "marceneiro", marceneiros: "marceneiro", marcenaria: "marceneiro",
  engenheiro: "engenheiro", engenheiros: "engenheiro",
  construtor: "construtor", construtores: "construtor", construtora: "construtor",
  aplicador: "aplicador", aplicadores: "aplicador", instalador: "aplicador", instaladores: "aplicador",
  corretor: "corretor", corretores: "corretor", imobiliaria: "corretor",
};

export function perfilParceiroDe(v: unknown): PerfilParceiro | null {
  const chave = String(v ?? "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return APELIDOS[chave] ?? null;
}

export const CIDADES_PARCEIRO = [
  { value: "manaus", label: "Manaus" },
  { value: "amazonas", label: "Outra cidade do Amazonas" },
  { value: "fora", label: "Outro estado" },
] as const;
export const CIDADE_OUTRA_MAX = 60;
export const NOME_MAX = 80;

export interface RespostasParceiro {
  /** Respostas das perguntas do perfil: id → valor (ou valores, na múltipla). */
  respostas: Record<string, string | string[]>;
  cidade?: string;
  /** Qual cidade (opcional no Amazonas) ou qual cidade e estado (obrigatório fora). */
  cidadeOutra?: string;
  nome?: string;
  whatsapp?: string;
}

/** Perguntas do perfil que valem para estas respostas (a "loja" pode pular a seguinte). */
export function perguntasDe(perfil: PerfilParceiro, r: RespostasParceiro): PerguntaParceiro[] {
  return PERFIS_PARCEIRO[perfil].perguntas.filter((p) => !p.pulaSe || r.respostas[p.pulaSe.id] !== p.pulaSe.valor);
}

/** Total de perguntas no caminho mais longo, com cidade, nome e WhatsApp: o "São N perguntas". */
export function totalPerguntas(perfil: PerfilParceiro): number {
  return PERFIS_PARCEIRO[perfil].perguntas.length + 3;
}

/** (92) 90000-0000, ou (92) 0000-0000 com 10 dígitos. Só formata, nunca bloqueia. */
export function mascaraFone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (!d) return "";
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  const corte = d.length === 11 ? 5 : 4;
  if (resto.length <= corte) return `(${ddd}) ${resto}`;
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}

/** Só os dígitos do WhatsApp, sem o 55 do Brasil quando ele veio junto. */
export function digitosFone(v?: string): string {
  const d = String(v ?? "").replace(/\D/g, "");
  return (d.length === 12 || d.length === 13) && d.startsWith("55") ? d.slice(2) : d;
}

/** WhatsApp com DDD: 10 ou 11 dígitos. */
export function foneValido(v?: string): boolean {
  const d = digitosFone(v);
  return d.length === 10 || d.length === 11;
}

export type PendenciaParceiro = string;

function respondida(p: PerguntaParceiro, v: string | string[] | undefined): boolean {
  if (p.multipla) return Array.isArray(v) && v.length > 0;
  return typeof v === "string" && !!v;
}

/** O que falta para enviar, na ordem das telas: ids das perguntas, "cidade", "nome", "whatsapp". */
export function pendenciasParceiro(perfil: PerfilParceiro, r: RespostasParceiro): PendenciaParceiro[] {
  const faltam: string[] = perguntasDe(perfil, r).filter((p) => !respondida(p, r.respostas[p.id])).map((p) => p.id);
  if (!r.cidade || (r.cidade === "fora" && !r.cidadeOutra?.trim())) faltam.push("cidade");
  if (!r.nome?.trim()) faltam.push("nome");
  if (!foneValido(r.whatsapp)) faltam.push("whatsapp");
  return faltam;
}

/** "Manaus", "Parintins (AM)", "Outra cidade do Amazonas" ou o que a pessoa escreveu. */
export function cidadeTexto(r: RespostasParceiro): string {
  const outra = r.cidadeOutra?.replace(/\s+/g, " ").trim() ?? "";
  if (r.cidade === "manaus") return "Manaus";
  if (r.cidade === "amazonas") return outra ? `${outra} (AM)` : "Outra cidade do Amazonas";
  if (r.cidade === "fora") return outra;
  return "";
}

/** Rótulos de uma resposta, na ordem da tela; ignora valor desconhecido. */
export function rotulosResposta(p: PerguntaParceiro, v: string | string[] | undefined): string[] {
  const valores = Array.isArray(v) ? v : v ? [v] : [];
  return p.opcoes.filter((o) => valores.includes(o.value)).map((o) => o.label);
}

/** As respostas em linhas curtas ("Loja: Acabamentos e revestimentos"). */
export function linhasRespostas(perfil: PerfilParceiro, r: RespostasParceiro): string[] {
  return perguntasDe(perfil, r).flatMap((p) => {
    const rotulos = rotulosResposta(p, r.respostas[p.id]);
    if (!rotulos.length) return [];
    return [`${p.linha}: ${rotulos.join("; ")}`];
  });
}

/** Mensagem do WhatsApp: saudação, quem é e as respostas. Só entra o que foi respondido. */
export function mensagemParceiro(perfil: PerfilParceiro, r: RespostasParceiro): string {
  const def = PERFIS_PARCEIRO[perfil];
  const nome = r.nome?.replace(/\s+/g, " ").trim();
  const cidade = cidadeTexto(r);
  const quem = [nome ? `Sou ${nome}, ${def.naFrase}` : `Sou ${def.naFrase}`, cidade ? ` em ${cidade}` : "", "."].join("");
  const linhas = ["Olá! Vim pelo site da Orbital e quero conversar sobre parceria.", quem.charAt(0).toUpperCase() + quem.slice(1)];
  const respostas = linhasRespostas(perfil, r);
  if (respostas.length) linhas.push("", ...respostas);
  return linhas.join("\n");
}

/** `numero`: o WhatsApp de vendas (WHATSAPP_VENDAS), o mesmo do pré-contato de clientes. */
export function linkWhatsappParceiro(numero: string, perfil: PerfilParceiro, r: RespostasParceiro): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagemParceiro(perfil, r))}`;
}

// ── Validação do servidor ────────────────────────────────────────────────────

/** Texto de uma linha, sem caracteres de controle, no limite. */
function limpo(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/**
 * Confere um envio: perfil da lista, cada resposta entre as opções da
 * pergunta, todas as perguntas do caminho respondidas, cidade, nome e
 * WhatsApp com DDD. Devolve as respostas limpas ou a mensagem de erro.
 */
export function validarParceiro(
  perfilBruto: unknown,
  bruto: unknown,
): { ok: true; perfil: PerfilParceiro; r: RespostasParceiro } | { ok: false; erro: string } {
  const perfil = typeof perfilBruto === "string" && perfilBruto in PERFIS_PARCEIRO ? (perfilBruto as PerfilParceiro) : null;
  if (!perfil) return { ok: false, erro: "Perfil inválido." };
  const b = (bruto && typeof bruto === "object" ? bruto : {}) as Record<string, unknown>;
  const respostasBrutas = (b.respostas && typeof b.respostas === "object" && !Array.isArray(b.respostas) ? b.respostas : {}) as Record<string, unknown>;

  const respostas: Record<string, string | string[]> = {};
  for (const p of PERFIS_PARCEIRO[perfil].perguntas) {
    const v = respostasBrutas[p.id];
    if (v == null) continue;
    const validos = new Set(p.opcoes.map((o) => o.value));
    if (p.multipla) {
      if (!Array.isArray(v)) return { ok: false, erro: "Opção inválida." };
      const lista = [...new Set(v.slice(0, 20).map((x) => limpo(x, 40)).filter(Boolean))];
      if (lista.some((x) => !validos.has(x))) return { ok: false, erro: "Opção inválida." };
      respostas[p.id] = lista;
    } else {
      const x = limpo(v, 40);
      if (x && !validos.has(x)) return { ok: false, erro: "Opção inválida." };
      if (x) respostas[p.id] = x;
    }
  }
  const cidade = limpo(b.cidade, 20);
  if (cidade && !CIDADES_PARCEIRO.some((c) => c.value === cidade)) return { ok: false, erro: "Cidade inválida." };
  const r: RespostasParceiro = {
    respostas,
    cidade: cidade || undefined,
    cidadeOutra: cidade && cidade !== "manaus" ? limpo(b.cidadeOutra, CIDADE_OUTRA_MAX) || undefined : undefined,
    nome: limpo(b.nome, NOME_MAX) || undefined,
    whatsapp: digitosFone(limpo(b.whatsapp, 30)) || undefined,
  };
  // Pergunta que o caminho pulou não entra (ex.: "já vende" de quem ainda não tem loja).
  const valem = new Set(perguntasDe(perfil, r).map((p) => p.id));
  for (const id of Object.keys(r.respostas)) if (!valem.has(id)) delete r.respostas[id];
  const faltam = pendenciasParceiro(perfil, r);
  if (faltam.length) return { ok: false, erro: `Falta responder: ${faltam.join(", ")}.` };
  return { ok: true, perfil, r };
}

// ── Abrir o pré-contato de qualquer lugar ────────────────────────────────────
// Evento de janela, como o abrirContato: um botão dentro de página server-side
// abre a janela sem virar provider.

export const EVENTO_PARCEIRO = "orbital:parceiro";

/** `origem`: quem recebe o foco de volta quando a janela fecha (o botão que abriu). */
export function abrirParceiro(perfil: PerfilParceiro, origem?: HTMLElement | null): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENTO_PARCEIRO, { detail: { perfil, origem: origem ?? null } }));
}
