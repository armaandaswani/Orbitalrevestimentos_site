import CapituloFoto from "@/components/pfb/CapituloFoto";
import { BAMBU } from "@/lib/pfb-textos";

/**
 * Capítulo 10 da página do PFB: bambu (v2, 08/11/2026). Foto inteira da escada
 * que abre o recorte ao entrar e o painel creme (à direita no computador) com o
 * título em duas linhas (a segunda em itálico, o único itálico da página, um
 * degrau menor) e a frase; a frase fica dentro de `pr-[88px]` no celular, fora
 * do canto do botão do chat. A foto é decorativa (`alt=""`).
 */
export default function BambuPfb() {
  return (
    <CapituloFoto
      id="bambu"
      tituloId="pfb-bambu-titulo"
      foto={{ src: "/images/projetos/escada-degraus-pfb-2026-10.jpg", alt: "", posicao: "40% 50%" }}
    >
      <h2 id="pfb-bambu-titulo" className="font-serif pfb-t1 text-[#0B1F45]">
        <span className="block">{BAMBU.titulo[0]}</span>
        <span className="block italic pfb-t2">{BAMBU.titulo[1]}</span>
      </h2>
      <div className="pr-[88px] lg:pr-0">
        <p className="mt-4 lg:mt-8 pfb-corpo text-[#43474e]">{BAMBU.frase}</p>
      </div>
    </CapituloFoto>
  );
}
