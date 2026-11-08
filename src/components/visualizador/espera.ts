// Ritmo e textos da espera do Resultado (sem React), testável com o runner do Node.
//
// As etapas andam pelo tempo, mas nunca passam do que a geração já fez: com
// prévias chegando (stream), a etapa 6 (a transformação) só começa com a 1ª
// prévia e a 7 (toques finais) com a 2ª. Sem stream (fluxo antigo, uma área
// por vez) só o tempo conta. A imagem final completa tudo. Etapa parada além
// do previsto não trava a barra: ela segue subindo devagar, sem chegar ao fim,
// e o texto vivo troca embaixo do título.
//
// Cada etapa tem variações de texto: o mesmo cliente costuma gerar 4 ou 5
// simulações, e a variação de cada etapa nunca repete a da simulação anterior
// (variantesDaVez guarda a última escolha no navegador).

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

/** Variações por etapa, na voz do dono (08/11/2026): carinho, elogio e suspense. */
export const ETAPAS_ESPERA: readonly (readonly EtapaEspera[])[] = [
  [
    { titulo: "Boas-vindas ao Visualizador Orbital", texto: "Veja a mágica acontecer ✨" },
    { titulo: "Que bom ter você aqui", texto: "Seu espaço está prestes a mudar ✨" },
    { titulo: "A mágica começou", texto: "Fica de olho na sua foto 👀" },
    { titulo: "Preparando algo especial", texto: "Feito só para o seu espaço ✨" },
  ],
  [
    { titulo: "Conhecendo o seu espaço", texto: "Tem muito potencial!" },
    { titulo: "Que espaço bonito", texto: "Dá pra fazer muita coisa aqui!" },
    { titulo: "Explorando cada canto", texto: "Já estamos gostando do que vemos 😉" },
    { titulo: "Estudando o seu ambiente", texto: "Cada detalhe conta." },
  ],
  [
    { titulo: "Mapeando as mudanças", texto: "Você vai amar 😍" },
    { titulo: "Marcando onde a mágica acontece", texto: "Spoiler: vai ficar lindo 😍" },
    { titulo: "Planejando a transformação", texto: "Confia, vai valer a pena!" },
    { titulo: "Desenhando o novo visual", texto: "Mal podemos esperar pra você ver 🤩" },
  ],
  [
    { titulo: "Lendo a luz do seu ambiente", texto: "É ela que faz o acabamento brilhar." },
    { titulo: "Seguindo a luz", texto: "Cada reflexo no lugar certo ✨" },
    { titulo: "Acertando a iluminação", texto: "Pra ficar com cara de revista." },
    { titulo: "Brincando com a luz", texto: "Seu espaço merece brilhar ✨" },
  ],
  [
    {
      titulo: "Aplicando os Painéis Flexíveis em Fibra de Bambu",
      texto: "Adorei a escolha do {modelo}. Muito bom gosto!",
      textoVarios: "Adorei os acabamentos que você escolheu. Muito bom gosto!",
      textoSemNome: "Adorei a sua escolha. Muito bom gosto!",
    },
    {
      titulo: "Chegou a vez dos Painéis Flexíveis em Fibra de Bambu",
      texto: "O {modelo} combina demais com o seu espaço 💚",
      textoVarios: "Os acabamentos que você escolheu combinam demais com o seu espaço 💚",
      textoSemNome: "Essa escolha combina demais com o seu espaço 💚",
    },
    {
      titulo: "Vestindo o seu espaço com Painéis Flexíveis em Fibra de Bambu",
      texto: "{modelo}? Que escolha! 👏",
      textoVarios: "Que escolhas! 👏",
      textoSemNome: "Que escolha! 👏",
    },
    {
      titulo: "Hora dos Painéis Flexíveis em Fibra de Bambu",
      texto: "Placa por placa, com o {modelo}.",
      textoVarios: "Placa por placa, com os acabamentos que você escolheu.",
      textoSemNome: "Placa por placa, do jeito que você escolheu.",
    },
  ],
  [
    { titulo: "A transformação começou", texto: "Está ficando magnífico. Deu até ciúme 🥰" },
    { titulo: "Olha só que mudança", texto: "Já dá pra sentir a diferença 🥰" },
    { titulo: "Seu espaço está mudando", texto: "E está ficando incrível!" },
    { titulo: "Ganhando forma", texto: "A gente já está apaixonado 😍" },
  ],
  [
    { titulo: "Toques finais!", texto: "Segura o coração 😆" },
    { titulo: "Caprichando nos detalhes", texto: "Respira fundo, falta pouco 😆" },
    { titulo: "Últimos ajustes", texto: "Pode ir preparando o sorriso 😁" },
    { titulo: "Lapidando cada detalhe", texto: "A ansiedade é normal 😆" },
  ],
  [
    { titulo: "Quase lá!", texto: "Mais uns segundinhos ✨" },
    { titulo: "Falta pouquinho!", texto: "Prepare-se pra se apaixonar ✨" },
    { titulo: "Está quase pronto!", texto: "Vale cada segundo, prometo." },
    { titulo: "Só mais um instante", texto: "O melhor vem agora ✨" },
  ],
];

/** Título da revelação; sorteado junto com as etapas (última posição das variantes). */
export const TITULOS_REVELACAO: readonly string[] = [
  "Voilà! Este é o seu novo ambiente",
  "Tcharam! Olha o seu novo espaço",
  "Pronto! Que tal o seu novo ambiente?",
  "Voilà! Ficou ou não ficou lindo?",
];

/** Linhas que se alternam quando uma etapa segura além do previsto. */
export const TEXTOS_VIVOS: readonly string[] = [
  "Vale a espera, prometo.",
  "Os últimos retoques são os melhores.",
  "Já já você vê.",
  "Segura a ansiedade mais um pouquinho 😆",
  "Está ficando bom demais.",
  "Quase, quase…",
];

/**
 * Cor de cada etapa: as mesmas cores das áreas marcadas (fluxo.ts ›
 * ZONE_COLORS) mais o azul da marca, em ordem que nunca repete vizinhas.
 */
export const CORES_ETAPA: readonly string[] = [
  "#2347A0", "#36A35C", "#b4791e", "#2F5FD0", "#2a9d8f", "#a83279", "#36A35C", "#b4791e",
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
  /** Variação escolhida por etapa e, na última posição, a da revelação. */
  variantes: readonly number[];
};

/**
 * Sorteia uma variação por etapa (e uma para a revelação), nunca a mesma da
 * simulação anterior quando há outra opção.
 */
export function escolherVariantes(anteriores: readonly number[] | null, aleatorio: () => number = Math.random): number[] {
  const opcoes = [...ETAPAS_ESPERA.map((v) => v.length), TITULOS_REVELACAO.length];
  return opcoes.map((n, k) => {
    const antes = anteriores?.[k];
    if (n <= 1) return 0;
    if (antes === undefined || antes < 0 || antes >= n) return Math.floor(aleatorio() * n) % n;
    // Uma das outras n - 1, sem a anterior.
    const i = Math.floor(aleatorio() * (n - 1)) % (n - 1);
    return i >= antes ? i + 1 : i;
  });
}

const CHAVE_VARIANTES = "orbital-viz-variantes";

/** Variantes desta simulação, lembrando a anterior no navegador (sem armazenamento, só sorteia). */
export function variantesDaVez(): number[] {
  let anteriores: number[] | null = null;
  try {
    const salvo = JSON.parse(globalThis.localStorage?.getItem(CHAVE_VARIANTES) ?? "null");
    if (Array.isArray(salvo) && salvo.every((n) => Number.isInteger(n))) anteriores = salvo;
  } catch { /* sem armazenamento ou valor estragado: sorteia do zero */ }
  const novas = escolherVariantes(anteriores);
  try { globalThis.localStorage?.setItem(CHAVE_VARIANTES, JSON.stringify(novas)); } catch { /* segue sem guardar */ }
  return novas;
}

/** A variação da etapa `i` nesta simulação. */
export function etapaEscolhida(i: number, variantes: readonly number[]): EtapaEspera {
  const opcoes = ETAPAS_ESPERA[i];
  return opcoes[variantes[i] ?? 0] ?? opcoes[0];
}

/** Título da revelação nesta simulação. */
export function tituloRevelacao(variantes: readonly number[] | null | undefined): string {
  const i = variantes?.[TOTAL_ETAPAS] ?? 0;
  return TITULOS_REVELACAO[i] ?? TITULOS_REVELACAO[0];
}

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

/**
 * Etapa segurando além do previsto: qual texto vivo mostrar (troca a cada
 * 4 s). `deslocamento` muda o ponto de partida da lista a cada simulação.
 */
export function textoVivo(mostrada: number, desdeTroca: number, deslocamento = 0): string | null {
  if (mostrada >= TOTAL_ETAPAS || mostrada < 4) return null;
  const previsto = mostrada < INICIO_ETAPA_MS.length - 1
    ? INICIO_ETAPA_MS[mostrada + 1] - INICIO_ETAPA_MS[mostrada]
    : 3000;
  const alem = desdeTroca - previsto;
  if (alem < 0) return null;
  const n = TEXTOS_VIVOS.length;
  return TEXTOS_VIVOS[(((Math.floor(alem / 4000) + deslocamento) % n) + n) % n];
}

/** Texto da etapa com o nome do acabamento escolhido (ou a versão para vários ou nenhum). */
export function textoDaEtapa(e: EtapaEspera, modelos: readonly string[]): string {
  if (!e.texto.includes("{modelo}")) return e.texto;
  const nomes = [...new Set(modelos.filter(Boolean))];
  if (nomes.length === 1) return e.texto.replace("{modelo}", nomes[0]);
  if (nomes.length > 1) return e.textoVarios ?? e.texto.replace("{modelo}", "acabamento");
  return e.textoSemNome ?? e.texto.replace("{modelo}", "acabamento");
}
