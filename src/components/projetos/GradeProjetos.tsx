"use client";

import { useState } from "react";
import ProjetoCard from "./ProjetoCard";
import type { Projeto } from "@/lib/projetos-tipos";

/**
 * Grade de projetos: 2 colunas no celular, 3 no tablet, 4 no computador. Com
 * `limite`, mostra os primeiros e um botão para ver o resto — a página não
 * vira um rolo infinito no celular.
 */
export default function GradeProjetos({
  projetos, onAbrir, limite, rotuloMais = "projetos",
}: {
  projetos: Projeto[];
  onAbrir: (p: Projeto) => void;
  limite?: number;
  rotuloMais?: string;
}) {
  const [tudo, setTudo] = useState(false);
  const visiveis = limite && !tudo ? projetos.slice(0, limite) : projetos;
  const faltam = projetos.length - visiveis.length;
  return (
    <div>
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2">
        {visiveis.map((p) => (
          <li key={p.id}><ProjetoCard projeto={p} onAbrir={onAbrir} /></li>
        ))}
      </ul>
      {faltam > 0 && (
        <button type="button" onClick={() => setTudo(true)}
          className="mt-4 w-full sm:w-auto min-h-11 px-6 border border-primary text-primary text-xs tracking-[0.12em] uppercase font-bold hover:bg-primary hover:text-white transition-colors">
          Ver todos os {projetos.length} {rotuloMais}
        </button>
      )}
    </div>
  );
}
