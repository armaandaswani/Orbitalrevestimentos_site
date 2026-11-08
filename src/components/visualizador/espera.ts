// Ritmo da espera do Resultado (sem React), testável com o runner do Node.
//
// As etapas andam pelo tempo, mas nunca passam do que a geração já fez: com
// prévias chegando (stream), "A transformação começou" só começa com a 1ª
// prévia e "Toques finais!" com a 2ª. Sem stream (fluxo antigo, uma área por
// vez) só o tempo conta. A imagem final completa tudo. Etapa parada além do
// previsto não trava a barra: ela segue subindo devagar, sem chegar ao fim, e
// o texto vivo troca embaixo do título. O "Voilà!" fica na revelação.

/**
 * Texto da etapa. Na etapa do acabamento ele muda com o que o cliente
 * escolheu: um modelo ({modelo} vira o nome), vários ou nenhum conhecido.
 */
export type EtapaEspera = {
  titulo: string;
  texto: string;
  textoVarios?: string;
  textoSemNome?: string;
};

/** Textos na voz do dono (08/11/2026): a experiência Orbital, com carinho e suspense. */
export const ETAPAS_ESPERA: readonly EtapaEspera[] = [
  { titulo: "Boas-vindas ao Visualizador Orbital", texto: "Veja a mágica acontecer ✨" },
  { titulo: "Conhecendo o seu espaço", texto: "Tem muito potencial!" },
  { titulo: "Mapeando as mudanças", texto: "Você vai amar 😍" },
  { titulo: "Lendo a luz do seu ambiente", texto: "É ela que faz o acabamento brilhar." },
  {
    titulo: "Aplicando os Painéis Flexíveis em Fibra de Bambu",
    texto: "Adorei a escolha do {modelo}. Muito bom gosto!",
    textoVarios: "Adorei os acabamentos que você escolheu. Muito bom gosto!",
    textoSemNome: "Adorei a sua escolha. Muito bom gosto!",
  },
  { titulo: "A transformação começou", texto: "Está ficando magnífico. Deu até ciúme 🥰" },
  { titulo: "Toques finais!", texto: "Segura o coração 😆" },
  { titulo: "Quase lá!", texto: "Mais uns segundinhos ✨" },
];

/** Linhas que se alternam quando uma etapa segura além do previsto. */
export const TEXTOS_VIVOS: readonly string[] = [
  "Vale a espera, prometo.",
  "Os últimos retoques são os melhores.",
  "Já já você vê.",
];

export const TOTAL_ETAPAS = ETAPAS_ESPERA.length;

/** Início de cada etapa só pelo tempo (ms desde o pedido). */
export const INICIO_ETAPA_MS: readonly number[] = [0, 2500, 7000, 12000, 17000, 23000, 32000, 42000];

/** Quanto cada etapa costuma durar; a última, até a imagem chegar. */
const DURACAO_PREVISTA_MS = 9000;

export type SinaisGeracao = {
  /** Date.now() do pedido. */
  inicio: number;
  /** A resposta veio em NDJSON (prévias possíveis). */
  stream: boolean;
  /** Prévias recebidas até agora. */
  previas: number;
  /** A imagem final chegou (ou a geração terminou). */
  fim: boolean;
};

/** Etapa que a espera deveria mostrar agora; TOTAL_ETAPAS = tudo concluído. */
export function etapaAlvo(s: SinaisGeracao, agora: number): number {
  if (s.fim) return TOTAL_ETAPAS;
  const t = Math.max(0, agora - s.inicio);
  let pelaHora = 0;
  for (let i = 0; i < INICIO_ETAPA_MS.length; i++) if (t >= INICIO_ETAPA_MS[i]) pelaHora = i;
  if (!s.stream) return pelaHora;
  // Com prévias: a 1ª abre a etapa 5, a 2ª a etapa 6; antes delas o tempo para na anterior.
  const teto = s.previas >= 2 ? TOTAL_ETAPAS - 1 : s.previas === 1 ? 5 : 4;
  const piso = s.previas >= 2 ? 6 : s.previas === 1 ? 5 : 0;
  return Math.max(piso, Math.min(pelaHora, teto));
}

/**
 * Próxima etapa mostrada, um passo por vez: a etapa fica pelo menos `dwell`
 * na tela; atrasada duas ou mais (prévia chegou cedo, imagem pronta), anda
 * depressa para não segurar o resultado.
 */
export function proximoPasso(mostrada: number, alvo: number, desdeTroca: number): number {
  if (alvo <= mostrada) return mostrada;
  const atraso = alvo - mostrada;
  const dwell = alvo >= TOTAL_ETAPAS ? 380 : atraso >= 2 ? 450 : 1800;
  return desdeTroca >= dwell ? mostrada + 1 : mostrada;
}

/**
 * Fração da barra (0 a 1). Cada etapa ocupa 1/TOTAL; dentro dela a barra
 * enche até 90% no tempo previsto e depois sobe devagar, sem nunca completar
 * a etapa. Só chega a 1 com tudo concluído.
 */
export function fracaoBarra(mostrada: number, desdeTroca: number): number {
  if (mostrada >= TOTAL_ETAPAS) return 1;
  const previsto = mostrada < INICIO_ETAPA_MS.length - 1
    ? INICIO_ETAPA_MS[mostrada + 1] - INICIO_ETAPA_MS[mostrada]
    : DURACAO_PREVISTA_MS;
  const t = Math.max(0, desdeTroca);
  const dentro = t <= previsto
    ? 0.9 * (t / previsto)
    : 0.9 + 0.08 * (1 - Math.exp(-(t - previsto) / 20000));
  return Math.min(0.985, (mostrada + dentro) / TOTAL_ETAPAS);
}

/** Etapa segurando além do previsto: qual texto vivo mostrar (troca a cada 4 s). */
export function textoVivo(mostrada: number, desdeTroca: number): string | null {
  if (mostrada >= TOTAL_ETAPAS || mostrada < 4) return null;
  const previsto = mostrada < INICIO_ETAPA_MS.length - 1
    ? INICIO_ETAPA_MS[mostrada + 1] - INICIO_ETAPA_MS[mostrada]
    : 3000;
  const alem = desdeTroca - previsto;
  if (alem < 0) return null;
  return TEXTOS_VIVOS[Math.floor(alem / 4000) % TEXTOS_VIVOS.length];
}

/** Texto da etapa com o nome do acabamento escolhido (ou a versão para vários ou nenhum). */
export function textoDaEtapa(e: EtapaEspera, modelos: readonly string[]): string {
  if (!e.texto.includes("{modelo}")) return e.texto;
  const nomes = [...new Set(modelos.filter(Boolean))];
  if (nomes.length === 1) return e.texto.replace("{modelo}", nomes[0]);
  if (nomes.length > 1) return e.textoVarios ?? e.texto.replace("{modelo}", "acabamento");
  return e.textoSemNome ?? e.texto.replace("{modelo}", "acabamento");
}
