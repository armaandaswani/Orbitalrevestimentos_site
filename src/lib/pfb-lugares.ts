import type { Showroom } from "@/lib/projetos-tipos";

/**
 * Capítulo 11 da página do PFB (onde ver e como pedir): separa os lugares de
 * `carregarLugares()` na grade de showrooms e na linha das revendas. Módulo
 * puro (só `import type`, apagado na execução): roda em `node --test`.
 *
 * `showrooms`: os de `kind === "showroom"`, até `maximo`, na ordem recebida.
 * `revendas`: os `name` dos de `kind === "revenda"`, na ordem, como vieram do
 * banco (um travessão no nome passa; quem renomeia é o dono).
 */
export function separarLugares(
  lugares: readonly Showroom[],
  maximo = 6,
): { showrooms: Showroom[]; revendas: string[] } {
  return {
    showrooms: lugares.filter((l) => l.kind === "showroom").slice(0, maximo),
    revendas: lugares.filter((l) => l.kind === "revenda").map((l) => l.name),
  };
}
