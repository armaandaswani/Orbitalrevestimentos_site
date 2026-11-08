import CapituloFoto from "@/components/pfb/CapituloFoto";
import { MANAUS } from "@/lib/pfb-textos";

/**
 * Capítulo 6 da página do PFB: Manaus (spec 2026-11-07-pfb-experiencia,
 * Tabela, linha 6). Foto inteira do lavabo e o painel azul-noite com o título
 * e os dois pontos; a lista fica dentro de `pr-[88px]` no celular, fora do
 * canto do botão do chat.
 */
export default function ManausPfb() {
  return (
    <CapituloFoto
      id="manaus"
      tituloId="pfb-manaus-titulo"
      foto={{
        src: "/images/projetos/lavabo-areas-umidas-pfb.webp",
        // fonte: src/lib/linhas.ts:51 (alt já publicado; Global Constraints, "Textos alternativos", P5)
        alt: "Lavabo com paredes em Painel Flexível em Fibra de Bambu com acabamento de mármore",
        posicao: "50% 35%",
      }}
    >
      <h2 id="pfb-manaus-titulo" className="font-serif pfb-t1 text-white">
        {MANAUS.titulo}
      </h2>
      <div className="pr-[88px] lg:pr-0">
        <ul className="mt-6 lg:mt-8 space-y-2 lg:space-y-3 pfb-corpo text-[#F6F5F2]/85">
          {MANAUS.pontos.map((ponto) => (
            <li key={ponto}>{ponto}</li>
          ))}
        </ul>
      </div>
    </CapituloFoto>
  );
}
