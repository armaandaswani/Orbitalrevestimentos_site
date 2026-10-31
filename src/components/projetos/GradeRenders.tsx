"use client";

import { useState } from "react";
import Image from "next/image";
import type { Render } from "@/lib/projetos-tipos";

/**
 * Visualizações geradas por IA. Mostra as primeiras e um botão para o resto:
 * não são obras reais, então não disputam espaço com elas.
 */
export default function GradeRenders({ renders, inicial = 6 }: { renders: Render[]; inicial?: number }) {
  const [tudo, setTudo] = useState(false);
  const visiveis = tudo ? renders : renders.slice(0, inicial);
  return (
    <div>
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2">
        {visiveis.map((r) => (
          <li key={r.id} className="bg-white/5 flex flex-col">
            <div className="relative w-full overflow-hidden" style={{ aspectRatio: "4 / 5" }}>
              <Image src={r.image_path} alt={`${r.title}, simulação com ${r.product_code}`} fill
                sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 200px" className="object-cover" />
              <span className="absolute top-2 left-2 border border-white/30 bg-black/50 text-white text-xs tracking-[0.14em] uppercase font-bold px-2 py-0.5">IA</span>
            </div>
            <div className="px-3 pt-2.5 pb-3">
              <p className="text-secondary text-xs tracking-[0.12em] uppercase font-semibold">{r.product_code}</p>
              <p className="font-serif text-white text-base leading-snug mt-0.5">{r.title}</p>
            </div>
          </li>
        ))}
      </ul>
      {!tudo && renders.length > inicial && (
        <button type="button" onClick={() => setTudo(true)}
          className="mt-4 w-full sm:w-auto min-h-11 px-6 border border-white/40 text-white text-xs tracking-[0.12em] uppercase font-bold hover:bg-white hover:text-primary transition-colors">
          Ver todas as {renders.length} simulações
        </button>
      )}
    </div>
  );
}
