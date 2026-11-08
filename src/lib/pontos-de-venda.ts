/**
 * Pontos de venda (revendas) da página /onde-comprar: links, normalização dos
 * campos do admin, origem do acesso, ações de cada loja e leitor com plano B.
 *
 * Módulo puro: sem import de runtime (só `import type`), para o `node --test`
 * importar o .ts direto.
 */

export type PontoDeVenda = {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  maps_url: string | null;
  description: string | null;
  bairro: string | null;
  lat: number | null;
  lng: number | null;
  whatsapp: string | null;
  instagram: string | null;
  horario: string | null;
};

export type Origem = "ste" | "site" | "instagram" | "qr" | "outro";

export type Acao = {
  tipo: "whatsapp" | "rota" | "waze" | "instagram";
  href: string;
  rotulo: string;
};

/** Texto aprovado pelo dono para o primeiro contato com a loja. */
export const MENSAGEM_WHATSAPP =
  "Olá! Vi o Painel Flexível em Fibra de Bambu no site da Orbital e quero fazer um orçamento.";

export const ROTULOS_ACAO: Record<Acao["tipo"], string> = {
  whatsapp: "WhatsApp",
  rota: "Como chegar",
  waze: "Waze",
  instagram: "Instagram",
};

export const COLS_PDV_BASE = "id, slug, name, address, maps_url, description, sort_order";
export const COLS_PDV_NOVAS = "bairro, lat, lng, whatsapp, instagram, horario";

export function linkWhatsApp(numero: string, texto?: string): string {
  const base = `https://wa.me/${numero}`;
  return texto ? `${base}?text=${encodeURIComponent(texto)}` : base;
}

export function linkWaze(lat: number, lng: number): string {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

export function linkInstagram(usuario: string): string {
  return `https://www.instagram.com/${usuario}/`;
}

/** Cópia de `linkComoChegar` (projetos-tipos.ts): o painel manda; sem ele, busca no Google Maps pelo nome + endereço. */
function linkComoChegar(s: Pick<PontoDeVenda, "maps_url" | "name" | "address">): string {
  if (s.maps_url) return s.maps_url;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name} ${s.address ?? ""} Manaus AM`.trim())}`;
}

/**
 * Aceita "+55 (92) 9 9152-5177", "92991525177", "(92) 3234-5678".
 * Devolve só dígitos com 55 na frente; vazio vira null; sem DDD ou longo demais é erro.
 */
export function normalizarWhatsapp(txt: string): { valor: string | null } | { erro: string } {
  const digitos = (txt ?? "").replace(/\D/g, "");
  if (digitos === "") return { valor: null };
  if (digitos.length === 10 || digitos.length === 11) return { valor: `55${digitos}` };
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) return { valor: digitos };
  return { erro: "WhatsApp inválido: use DDD + número, por exemplo (92) 99152-5177." };
}

/** Primeiro trecho do link que não é um perfil. */
const RESERVADOS_INSTAGRAM = new Set(["p", "reel", "reels", "explore", "stories"]);

/**
 * Tira o @ e a URL (com ou sem www./m.): devolve só o usuário, ou null se vazio
 * ou inválido. Link de post, reel, explorar ou stories, e texto que sobrou como
 * domínio (termina em ponto ou em .com), não são perfil e voltam null.
 */
export function normalizarInstagram(txt: string): string | null {
  let s = (txt ?? "").trim();
  if (s === "") return null;
  s = s.replace(/^https?:\/\//i, "").replace(/^(www\.|m\.)?instagram\.com\//i, "");
  s = s.split(/[?#]/)[0].split("/")[0].replace(/^@+/, "").trim();
  if (!/^[A-Za-z0-9._]+$/.test(s)) return null;
  if (s.endsWith(".") || /\.com$/i.test(s)) return null;
  if (RESERVADOS_INSTAGRAM.has(s.toLowerCase())) return null;
  return s;
}

const ORIGENS: readonly Origem[] = ["ste", "site", "instagram", "qr", "outro"];

/** Fecha a lista: vazio/ausente vira null; valor fora da lista vira "outro". */
export function origemValida(txt: string | null): Origem | null {
  const v = (txt ?? "").trim().toLowerCase();
  if (v === "") return null;
  return (ORIGENS as readonly string[]).includes(v) ? (v as Origem) : "outro";
}

/** Lê `?loja=` da URL: vale o último valor não vazio; compara sem diferenciar maiúsculas. */
export function lojaDaUrl(search: string, slugs: string[]): { slug: string | null; invalida: string | null } {
  const valores = new URLSearchParams(search).getAll("loja").map((v) => v.trim()).filter((v) => v !== "");
  const pedido = valores.length > 0 ? valores[valores.length - 1] : null;
  if (pedido === null) return { slug: null, invalida: null };
  const achado = slugs.find((s) => s.toLowerCase() === pedido.toLowerCase());
  return achado ? { slug: achado, invalida: null } : { slug: null, invalida: pedido };
}

/** Ações da loja, nesta ordem: whatsapp, rota (sempre), waze (só com lat e lng), instagram. */
export function acoesDaLoja(p: PontoDeVenda): Acao[] {
  const acoes: Acao[] = [];
  if (p.whatsapp) {
    acoes.push({ tipo: "whatsapp", href: linkWhatsApp(p.whatsapp, MENSAGEM_WHATSAPP), rotulo: ROTULOS_ACAO.whatsapp });
  }
  acoes.push({ tipo: "rota", href: linkComoChegar(p), rotulo: ROTULOS_ACAO.rota });
  if (typeof p.lat === "number" && typeof p.lng === "number" && Number.isFinite(p.lat) && Number.isFinite(p.lng)) {
    acoes.push({ tipo: "waze", href: linkWaze(p.lat, p.lng), rotulo: ROTULOS_ACAO.waze });
  }
  if (p.instagram) {
    acoes.push({ tipo: "instagram", href: linkInstagram(p.instagram), rotulo: ROTULOS_ACAO.instagram });
  }
  return acoes;
}

type ErroBanco = { code?: string | null; message?: string | null };
type RespostaBanco = { data: unknown[] | null; error: ErroBanco | null };

function texto(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function numero(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function paraPonto(linha: unknown): PontoDeVenda {
  const r = (linha ?? {}) as Record<string, unknown>;
  return {
    id: String(r.id ?? ""),
    slug: String(r.slug ?? ""),
    name: String(r.name ?? ""),
    address: texto(r.address),
    maps_url: texto(r.maps_url),
    description: texto(r.description),
    bairro: texto(r.bairro),
    lat: numero(r.lat),
    lng: numero(r.lng),
    whatsapp: texto(r.whatsapp),
    instagram: texto(r.instagram),
    horario: texto(r.horario),
  };
}

/**
 * Lê os pontos de venda. Tenta as colunas base + novas; se o banco ainda não
 * tem as novas (`faltaColuna`), refaz só com as base. Erro e lista vazia voltam
 * em `erro` (assim o ISR mantém a última versão boa da página).
 */
export async function lerPontosDeVendaDe(
  consultar: (cols: string) => PromiseLike<RespostaBanco>,
  faltaColuna: (e: ErroBanco) => boolean,
): Promise<{ pontos: PontoDeVenda[]; erro: string | null }> {
  let resp = await consultar(`${COLS_PDV_BASE}, ${COLS_PDV_NOVAS}`);
  if (resp.error && faltaColuna(resp.error)) {
    resp = await consultar(COLS_PDV_BASE);
  }
  if (resp.error) return { pontos: [], erro: resp.error.message ?? "erro ao ler os pontos de venda" };
  const pontos = (resp.data ?? []).map(paraPonto);
  if (pontos.length === 0) return { pontos: [], erro: "nenhum ponto de venda" };
  return { pontos, erro: null };
}

// ── Geometria do mapa de Manaus ───────────────────────────────────────────

/** Mesma caixa do scripts/gerar-mapa-manaus.mjs (mapa real do OpenStreetMap); a Tarefa 6 confere por teste. */
export const CAIXA_MANAUS = { latMin: -3.15, latMax: -3.06, lngMin: -60.06, lngMax: -59.985 } as const;
/** Largura do viewBox (0 0 400 480). */
export const LARGURA_MAPA = 400;
/** (latMax − latMin) × 400 / (lngMax − lngMin), arredondado. */
export const ALTURA_MAPA = 480;

const ESCALA_MAPA = LARGURA_MAPA / (CAIXA_MANAUS.lngMax - CAIXA_MANAUS.lngMin);

export function dentroDeManaus(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= CAIXA_MANAUS.latMin &&
    lat <= CAIXA_MANAUS.latMax &&
    lng >= CAIXA_MANAUS.lngMin &&
    lng <= CAIXA_MANAUS.lngMax
  );
}

/** Escala única nos dois eixos: x cresce com a longitude, y cresce para o sul. Sem arredondar. */
export function projetarManaus(lat: number, lng: number): { x: number; y: number } {
  return {
    x: (lng - CAIXA_MANAUS.lngMin) * ESCALA_MAPA,
    y: (CAIXA_MANAUS.latMax - lat) * ESCALA_MAPA,
  };
}

/** 44 px reais num mapa de 288 px (tela de 320 com margens de 16): 44 × 400 / 288 ≈ 61. */
export const MINIMO_PINO = 62;

/** O pino de 44 px sobe ~61 unidades acima da ponta: precisa de espaço em cima e dos lados. */
export function cabePino(p: { x: number; y: number }): boolean {
  return (
    p.x >= MINIMO_PINO / 2 &&
    p.x <= LARGURA_MAPA - MINIMO_PINO / 2 &&
    p.y >= MINIMO_PINO &&
    p.y <= ALTURA_MAPA - 16
  );
}

const FOLGA_DISTANCIA = 1e-9;
/** Folga maior para agrupar: grupos que ficaram a exatamente `minimo` depois de espalhados se fundem. */
const FOLGA_AGRUPAR = 1e-6;

type Ponto2D = { x: number; y: number };

/** Sobreposição de verdade: decide a parada e a conferência final. */
function sobrepostos(a: Ponto2D, b: Ponto2D, minimo: number): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) < minimo - FOLGA_DISTANCIA;
}

/**
 * Encostados ou sobrepostos: decide quem entra no mesmo grupo. Além da distância
 * (< minimo + 1e-6), conta o par que o espalhamento deixou a exatamente `minimo`
 * na horizontal com alguma diferença de y (a distância fica um pouco acima de
 * `minimo`): sem isso, grupos que se tocam nunca se fundem e a repetição não converge.
 */
function encostados(a: Ponto2D, b: Ponto2D, minimo: number): boolean {
  if (Math.hypot(a.x - b.x, a.y - b.y) < minimo + FOLGA_AGRUPAR) return true;
  return Math.abs(Math.abs(a.x - b.x) - minimo) < FOLGA_AGRUPAR && Math.abs(a.y - b.y) < minimo;
}

function haSobreposicao(r: Ponto2D[], minimo: number): boolean {
  for (let i = 0; i < r.length; i++) {
    for (let j = i + 1; j < r.length; j++) {
      if (sobrepostos(r[i], r[j], minimo)) return true;
    }
  }
  return false;
}

/**
 * Rede de segurança: afasta pinos a menos de `minimo` unidades. Não muta a
 * entrada; devolve cópias (mesma ordem) com `x` ajustado e `y` intacto.
 * Agrupa por componentes conexos de todos os pares encostados (< minimo + 1e-6,
 * union-find; só a sobreposição estrita, < minimo − 1e-9, decide a parada),
 * espalha cada grupo na horizontal centrado na média e, se sair do mapa,
 * desloca o grupo inteiro. Repete até estabilizar (10 voltas); se sobrar par
 * sobreposto, lança erro para o build falhar em vez de publicar o mapa assim.
 */
export function aproximarPinos<T extends { x: number; y: number }>(pinos: T[], minimo: number = MINIMO_PINO): T[] {
  const r = pinos.map((p) => ({ ...p }));
  const n = r.length;
  for (let volta = 0; volta < 10; volta++) {
    if (!haSobreposicao(r, minimo)) return r;
    const pai = Array.from({ length: n }, (_, i) => i);
    const raiz = (i: number): number => {
      while (pai[i] !== i) {
        pai[i] = pai[pai[i]];
        i = pai[i];
      }
      return i;
    };
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (encostados(r[i], r[j], minimo)) pai[raiz(i)] = raiz(j);
      }
    }
    const grupos = new Map<number, number[]>();
    for (let i = 0; i < n; i++) {
      const g = raiz(i);
      const lista = grupos.get(g);
      if (lista) lista.push(i);
      else grupos.set(g, [i]);
    }
    for (const indices of grupos.values()) {
      if (indices.length < 2) continue;
      const ordem = [...indices].sort((a, b) => r[a].x - r[b].x || a - b);
      const media = ordem.reduce((s, i) => s + r[i].x, 0) / ordem.length;
      const novos = ordem.map((_, k) => media + (k - (ordem.length - 1) / 2) * minimo);
      const menor = novos[0];
      const maior = novos[novos.length - 1];
      // grupo mais largo que o mapa: não há como deslocar para dentro sem sobrepor
      if (maior - menor > LARGURA_MAPA - minimo) throw new Error("aproximarPinos não estabilizou");
      let desloca = 0;
      if (menor < minimo / 2) desloca = minimo / 2 - menor;
      else if (maior > LARGURA_MAPA - minimo / 2) desloca = LARGURA_MAPA - minimo / 2 - maior;
      ordem.forEach((i, k) => {
        r[i].x = novos[k] + desloca;
      });
    }
  }
  if (haSobreposicao(r, minimo)) throw new Error("aproximarPinos não estabilizou");
  return r;
}

/**
 * Um rótulo por bairro: x é a média dos x das lojas do bairro (projetadas) e y
 * fica 34 unidades abaixo do pino mais baixo (no máximo em ALTURA_MAPA − 8).
 * Ignora loja sem bairro, sem coordenada, fora de Manaus ou sem pino (`cabePino`),
 * para não sobrar rótulo sem pino.
 */
export function rotulosDeBairro(pontos: PontoDeVenda[]): { bairro: string; x: number; y: number }[] {
  const porBairro = new Map<string, { soma: number; n: number; baixo: number }>();
  for (const p of pontos) {
    const bairro = p.bairro?.trim();
    if (!bairro || p.lat === null || p.lng === null || !dentroDeManaus(p.lat, p.lng)) continue;
    const { x, y } = projetarManaus(p.lat, p.lng);
    if (!cabePino({ x, y })) continue;
    const atual = porBairro.get(bairro);
    if (atual) {
      atual.soma += x;
      atual.n += 1;
      atual.baixo = Math.max(atual.baixo, y);
    } else {
      porBairro.set(bairro, { soma: x, n: 1, baixo: y });
    }
  }
  return [...porBairro.entries()].map(([bairro, a]) => ({ bairro, x: a.soma / a.n, y: Math.min(a.baixo + 34, ALTURA_MAPA - 8) }));
}

// ---------------------------------------------------------------------------
// Abertura animada: decisão e script inline (antes da primeira pintura)
// ---------------------------------------------------------------------------

/** Quanto a abertura dura antes de sair sozinha. */
export const DURACAO_ABERTURA_MS = 3800;
/** Chave do sessionStorage que marca "já tocou nesta sessão". */
export const CHAVE_ABERTURA = "orbital-pdv-abertura";

export type SinaisAbertura = {
  /** Há `loja=` não vazio na URL (a validade do slug é com a página). */
  temLoja: boolean;
  /** `prefers-reduced-motion: reduce` */
  reduzMovimento: boolean;
  /** `prefers-reduced-data: reduce` */
  reduzDados: boolean;
  /** `navigator.connection.saveData` */
  saveData: boolean;
  /** `navigator.connection.effectiveType` */
  tipoConexao?: string;
  /** `navigator.deviceMemory`, em GB */
  memoria?: number;
  /** `navigator.hardwareConcurrency` */
  nucleos?: number;
  /** A abertura já tocou nesta sessão. */
  jaTocou: boolean;
};

/**
 * A abertura só toca na primeira visita da sessão, sem link de loja, em
 * aparelho e rede folgados. Núcleos só contam com `memoria` definida: o WebKit
 * (iPhone) não expõe `deviceMemory` e trava `hardwareConcurrency` em 4, igual
 * ao `decidirNivel` (src/lib/movimento/nivel.ts).
 */
export function deveTocarAbertura(s: SinaisAbertura): boolean {
  if (s.temLoja || s.reduzMovimento || s.reduzDados || s.saveData || s.jaTocou) return false;
  if (s.tipoConexao === "slow-2g" || s.tipoConexao === "2g" || s.tipoConexao === "3g") return false;
  if (s.memoria !== undefined && s.memoria < 4) return false;
  if (s.memoria !== undefined && s.nucleos !== undefined && s.nucleos <= 4) return false;
  return true;
}

/**
 * `deveTocarAbertura` em JavaScript puro (ES5), para um <script> embutido no
 * começo da página que liga `data-pdv-abertura="1"` no <html> antes da primeira
 * pintura. Quando liga, grava a chave no sessionStorage antes; se gravar
 * lançar, não liga. Tira o atributo uma vez só: ao fim de
 * `DURACAO_ABERTURA_MS`, no primeiro pointerdown, keydown ou scroll e no clique
 * em `[data-pdv-pular]`. Acionar o Pular também leva o foco ao `h1` do <main>
 * (que tem tabIndex -1), para o foco não cair no <body> quando o botão some:
 * pelo teclado, no clique; pelo ponteiro, logo depois do pointerdown (com
 * setTimeout 0, depois do mousedown que focaria o botão; o clique do mouse já
 * não chega ao botão, que sumiu). Os valores entram por concatenação para a string e o
 * módulo nunca divergirem. Se mudar `deveTocarAbertura`, mude esta string; o
 * teste confere.
 */
export const SCRIPT_ABERTURA_PDV =
  "(function(){try{var w=window,d=document,h=d.documentElement,n=navigator,c=n.connection,s=w.sessionStorage,K='" +
  CHAVE_ABERTURA +
  "',A='data-pdv-abertura',t=c&&c.effectiveType,m=n.deviceMemory,k=n.hardwareConcurrency," +
  "no=/[?&]loja=[^&]/.test(location.search)||w.matchMedia('(prefers-reduced-motion: reduce)').matches||w.matchMedia('(prefers-reduced-data: reduce)').matches||!!(c&&c.saveData===true)||!!s[K]||t==='slow-2g'||t==='2g'||t==='3g'||(m!==undefined&&(m<4||(k!==undefined&&k<=4)));" +
  "if(no)return;s[K]='1';h.setAttribute(A,'1');" +
  "var on=true,off=function(){if(!on)return;on=false;h.removeAttribute(A);},o={once:true,passive:true}," +
  "pu=function(e){var x=e&&e.target;return!!(x&&x.closest&&x.closest('[data-pdv-pular]'));}," +
  "fo=function(){var f=d.querySelector&&d.querySelector('main h1');if(f&&f.focus)f.focus();};" +
  "w.setTimeout(off," +
  DURACAO_ABERTURA_MS +
  ");w.addEventListener('pointerdown',function(e){off();if(pu(e))w.setTimeout(fo,0);},o);w.addEventListener('keydown',off,o);w.addEventListener('scroll',off,o);" +
  "d.addEventListener('click',function(e){if(pu(e)){off();fo();}});" +
  "}catch(e){}})();";
