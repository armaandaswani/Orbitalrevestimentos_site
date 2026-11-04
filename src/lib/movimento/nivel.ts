/**
 * Nível de movimento do aparelho. O padrão é `completo`; em aparelho fraco ou
 * com economia de dados o site liga o `leve` (metade das distâncias, sem os
 * efeitos mais caros). O nível é decidido uma vez e vai para o <html>.
 */

export type NivelMovimento = "completo" | "leve";

export interface SinaisDispositivo {
  /** `prefers-reduced-data: reduce` */
  poucosDados?: boolean;
  /** `navigator.connection.saveData` */
  economiaDados?: boolean;
  /** `navigator.deviceMemory`, em GB */
  memoriaGB?: number;
  /** `navigator.hardwareConcurrency` */
  nucleos?: number;
}

/**
 * `leve` se qualquer sinal indicar aparelho ou rede apertados.
 *
 * Núcleos só contam quando `deviceMemory` também existe (só o Chromium expõe
 * os dois, e ali ambos são reais). O WebKit trava `hardwareConcurrency` em 4
 * (ou 2) em iPhone e iPad e não expõe `deviceMemory`: sem a memória, os
 * núcleos são ignorados, senão todo iPhone cairia em `leve`.
 */
export function decidirNivel(s: SinaisDispositivo): NivelMovimento {
  if (s.poucosDados || s.economiaDados) return "leve";
  if (s.memoriaGB === undefined) return "completo";
  if (s.memoriaGB <= 4) return "leve";
  if (s.nucleos !== undefined && s.nucleos <= 4) return "leve";
  return "completo";
}

/** Lê os sinais do navegador. Só roda no cliente; no servidor devolve vazio. */
export function lerSinais(): SinaisDispositivo {
  if (typeof window === "undefined") return {};
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  return {
    poucosDados: window.matchMedia("(prefers-reduced-data: reduce)").matches,
    economiaDados: nav.connection?.saveData === true,
    memoriaGB: nav.deviceMemory,
    nucleos: nav.hardwareConcurrency,
  };
}
