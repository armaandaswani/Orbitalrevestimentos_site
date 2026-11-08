/**
 * GERADO por scripts/gerar-mapa-manaus.mjs, não editar. Para refazer:
 *   node scripts/gerar-mapa-manaus.mjs [--osm <resposta da Overpass>]
 *
 * Dados © colaboradores do OpenStreetMap, ODbL (https://www.openstreetmap.org/copyright);
 * obra produzida (Produced Work, ODbL 4.5).
 * Base do OpenStreetMap de 2026-11-07T22:00:25Z, lida da Overpass API 0.7.62.11 87bfad18 (overpass-api.de).
 */

export const CAIXA_GERADA = { latMin: -3.15, latMax: -3.06, lngMin: -60.06, lngMax: -59.985 } as const;
export const LARGURA = 400;
export const ALTURA = 480;

/**
 * O desenho fica em /images/onde-comprar/mapa-manaus.svg (um <path id> por camada, sem cor), fora do
 * HTML e do payload RSC; o MapaManaus desenha cada camada com <use href="…#id">.
 */
export const MAPA_SVG = "/images/onde-comprar/mapa-manaus.svg";
export const CAMADAS_MANAUS = ["agua","ilhas","igarapes","parques","principal","secundaria","terciaria"] as const;

export const ESTILO_MANAUS = {
  cor: { terra: "#F6F5F2", agua: "#BCCADF", parque: "#E3EBDD", principal: "#FFFFFF", principalBorda: "#D3CFC6", secundaria: "#FFFFFF", terciaria: "#E6E3DC" },
  largura: { principal: 4.2, principalBorda: 5.6, secundaria: 2.6, secundariaBorda: 3.8, terciaria: 1.4, igarape: 1.6 },
} as const;

export const ROTULOS_FIXOS: { texto: "Rio Negro" | "Av. Constantino Nery"; x: number; y: number; rotacao: number }[] = [
  { texto: "Rio Negro", x: 62, y: 440, rotacao: -24 },
  { texto: "Av. Constantino Nery", x: 185.3, y: 174.7, rotacao: -90 },
];
