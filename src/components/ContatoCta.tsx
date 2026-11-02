"use client";

import { abrirContato, type ProdutoContato, type RespostasContato } from "@/lib/contato";

/**
 * Botão que abre a aba "Falar com um consultor". Pode ser usado dentro de
 * páginas server-side: substitui os antigos links para /simulador mantendo o
 * visual de cada página (a classe vem de quem usa). `inicial` pré-preenche
 * respostas já conhecidas (ex.: o perfil, numa aba de parcerias).
 */
export default function ContatoCta({
  produtos, inicial, className, children, onClick,
}: {
  produtos?: ProdutoContato[];
  inicial?: RespostasContato;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => { onClick?.(); abrirContato(produtos ?? [], inicial ?? {}); }}
    >
      {children}
    </button>
  );
}
