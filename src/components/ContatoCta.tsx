"use client";

import { trackFunnel } from "@/lib/funnel";
import { abrirContato, type ProdutoContato } from "@/lib/contato";

/**
 * Botão que abre a aba "Falar com um consultor". Pode ser usado dentro de
 * páginas server-side: substitui os antigos links para /simulador mantendo o
 * visual de cada página (a classe vem de quem usa).
 */
export default function ContatoCta({
  produtos, className, children, onClick, origem,
}: {
  produtos?: ProdutoContato[];
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  origem?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        trackFunnel("consultor_clicado", { origem: origem ?? null, pagina: window.location.pathname });
        onClick?.();
        abrirContato(produtos ?? []);
      }}
    >
      {children}
    </button>
  );
}
