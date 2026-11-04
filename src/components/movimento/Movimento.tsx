"use client";

import { useEffect } from "react";
import { decidirNivel, lerSinais } from "@/lib/movimento/nivel";

/**
 * Marca o <html> com o nível de movimento do aparelho (`completo` ou `leve`),
 * uma vez, na montagem. O CSS lê `data-mv-nivel` para reduzir distâncias e
 * desligar efeitos caros. Não renderiza nada.
 */
export default function Movimento() {
  useEffect(() => {
    document.documentElement.dataset.mvNivel = decidirNivel(lerSinais());
  }, []);
  return null;
}
