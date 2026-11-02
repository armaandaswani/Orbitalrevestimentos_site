"use client";

import ShowroomConteudo from "@/components/projetos/ShowroomConteudo";
import VisorProjetos, { useVisor } from "@/components/projetos/VisorProjetos";
import type { Projeto, Showroom } from "@/lib/projetos-tipos";

/**
 * Página de um showroom: o mesmo conteúdo da folha de /projetos, em página
 * própria (indexável). A galeria de cada ambiente abre aqui mesmo, com o
 * estado na URL (?projeto=<slug>): voltar fecha, sem sair da página.
 */
export default function ShowroomVitrine({ lugar, ambientes, todos }: { lugar: Showroom; ambientes: Projeto[]; todos: Showroom[] }) {
  return (
    <VisorProjetos projetos={ambientes} lugares={todos} base={`/projetos/showroom/${lugar.slug}`} fixo={lugar}>
      <Miolo lugar={lugar} ambientes={ambientes} todos={todos} />
    </VisorProjetos>
  );
}

function Miolo({ lugar, ambientes, todos }: { lugar: Showroom; ambientes: Projeto[]; todos: Showroom[] }) {
  const visor = useVisor();
  return (
    <ShowroomConteudo lugar={lugar} ambientes={ambientes} todos={todos} nivel="pagina"
      onAbrirProjeto={visor ? (p) => visor.abrirProjeto(p, ambientes) : undefined}
      hrefProjeto={(p) => visor?.hrefProjeto(p) ?? `/projetos/showroom/${lugar.slug}?projeto=${p.slug}`} />
  );
}
