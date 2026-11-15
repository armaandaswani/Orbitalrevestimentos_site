"use client";

import { useSyncExternalStore } from "react";

const assinar = (avisar: () => void) => {
  window.addEventListener("popstate", avisar);
  return () => window.removeEventListener("popstate", avisar);
};
const ler = () => (new URLSearchParams(window.location.search).get("rep") ?? "").toUpperCase().slice(0, 40);
const noServidor = () => "";

/**
 * Código de indicação do link do representante (`?rep=CÓDIGO`), em maiúsculas;
 * vazio quando não há. Lido da URL no navegador, sem efeito nem estado: no
 * servidor e na hidratação vale vazio, e o valor entra logo depois.
 */
export function useRepDaUrl(): string {
  return useSyncExternalStore(assinar, ler, noServidor);
}
