"use client";

import { abrirContato, type ProdutoContato } from "@/lib/contato";

/**
 * Botão que abre a aba "Falar com um consultor". Pode ser usado dentro de
 * páginas server-side: substitui os antigos links para /simulador mantendo o
 * visual de cada página (a classe vem de quem usa).
 */
export default function ContatoCta({
  produtos, className, children, onClick,
}: {
  produtos?: ProdutoContato[];
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => { onClick?.(); abrirContato(produtos ?? []); }}
    >
      {children}
    </button>
  );
}
