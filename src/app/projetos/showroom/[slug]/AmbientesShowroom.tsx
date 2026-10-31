"use client";

import { useState } from "react";
import GradeProjetos from "@/components/projetos/GradeProjetos";
import ProjetoGaleria from "@/components/projetos/ProjetoGaleria";
import type { Projeto } from "@/lib/projetos-tipos";

/** Ambientes de um showroom: a galeria abre aqui mesmo, sem sair da página. */
export default function AmbientesShowroom({ ambientes }: { ambientes: Projeto[] }) {
  const [aberto, setAberto] = useState<Projeto | null>(null);
  return (
    <>
      {aberto && <ProjetoGaleria key={aberto.id} projeto={aberto} onFechar={() => setAberto(null)} />}
      <GradeProjetos projetos={ambientes} onAbrir={setAberto} />
    </>
  );
}
