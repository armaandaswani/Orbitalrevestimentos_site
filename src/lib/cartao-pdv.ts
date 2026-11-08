/**
 * Cartão único "Pontos de venda" das grades da home, de /projetos e de
 * /produtos/pfb: no lugar de uma revenda por cartão, um só leva à página
 * /onde-comprar. Textos aprovados pelo dono: nome "Pontos de venda" e a linha
 * "Lojas em Manaus" (na `description`, que o cartão mostra onde os outros
 * mostram o endereço). Sem imagem: o cartão cai no ícone de loja.
 *
 * Módulo puro e pequeno (só `import type`): o LugarCard, que é cliente, importa
 * daqui sem puxar o pontos-de-venda.ts inteiro para o chunk.
 */

import type { Showroom } from "./projetos-tipos";

export const CARTAO_PDV: Readonly<Showroom> = Object.freeze({
  id: "pontos-de-venda",
  slug: "pontos-de-venda",
  name: "Pontos de venda",
  kind: "revenda",
  address: null,
  maps_url: null,
  description: "Lojas em Manaus",
  logo_url: null,
  cover_url: null,
  ambient_count: 0,
  display_cover: null,
  display_focus_x: 0.5,
  display_focus_y: 0.5,
  display_zoom: 1,
});

/** Os showrooms, na ordem em que vieram, mais o cartão "Pontos de venda" no fim. As revendas saem: quem as lista é a página. */
export function parceirosNaGrade(lugares: Showroom[]): Showroom[] {
  return [...lugares.filter((l) => l.kind === "showroom"), CARTAO_PDV];
}
