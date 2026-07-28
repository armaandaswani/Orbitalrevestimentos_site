import type { CSSProperties } from "react";

/**
 * Recorte da capa — usado pelo painel (prévia) e pelo site (card).
 *
 * Mora aqui, e não no componente do admin, porque a promessa "prévia exata de
 * como a capa aparecerá no site" só se sustenta se os dois lados fizerem a mesma
 * conta. A imagem original nunca é alterada: guardamos onde olhar (foco) e
 * quanto aproximar (zoom), e a galeria continua abrindo a foto inteira.
 */

/** Proporção do card de projeto. Vertical, como o site usa. */
export const COVER_ASPECT = "4 / 5";

export function coverStyle(
  focusX: number | null | undefined,
  focusY: number | null | undefined,
  zoom: number | null | undefined,
): CSSProperties {
  const x = Number(focusX ?? 0.5);
  const y = Number(focusY ?? 0.5);
  const z = Number(zoom ?? 1) || 1;
  return {
    objectFit: "cover",
    objectPosition: `${x * 100}% ${y * 100}%`,
    transform: `scale(${z})`,
    transformOrigin: `${x * 100}% ${y * 100}%`,
  };
}
