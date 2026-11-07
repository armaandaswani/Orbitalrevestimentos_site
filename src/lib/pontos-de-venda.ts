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

/** Tira o @ e a URL: devolve só o usuário, ou null se vazio ou inválido. */
export function normalizarInstagram(txt: string): string | null {
  let s = (txt ?? "").trim();
  if (s === "") return null;
  s = s.replace(/^https?:\/\//i, "").replace(/^(www\.)?instagram\.com\//i, "");
  s = s.split(/[?#]/)[0].split("/")[0].replace(/^@+/, "").trim();
  return /^[A-Za-z0-9._]+$/.test(s) ? s : null;
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
