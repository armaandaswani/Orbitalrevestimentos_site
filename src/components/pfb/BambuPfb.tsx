import CapituloFoto from "@/components/pfb/CapituloFoto";
import { BAMBU } from "@/lib/pfb-textos";

/**
 * Capítulo 10 da página do PFB: bambu (spec 2026-11-07-pfb-experiencia,
 * Tabela, linha 10). Foto inteira da escada e o painel azul-noite com o título
 * em duas linhas (a segunda em itálico, o único itálico da página, um degrau
 * menor: `pfb-t2`, para o título caber em até 3 linhas) e a frase;
 * a frase fica dentro de `pr-[88px]` no celular, fora do canto do botão do
 * chat. A foto é decorativa (`alt=""`, Global Constraints, P5).
 */
export default function BambuPfb() {
  return (
    <CapituloFoto
      id="bambu"
      tituloId="pfb-bambu-titulo"
      foto={{ src: "/images/projetos/escada-degraus-pfb-2026-10.jpg", alt: "", posicao: "40% 50%" }}
    >
      {/* lg:-mr-6: a segunda linha (465 px a 1440) cabe numa linha só na caixa
          do painel (455 px), usando 24 px do respiro da direita. */}
      <h2 id="pfb-bambu-titulo" className="font-serif pfb-t1 text-white lg:-mr-6">
        <span className="block">{BAMBU.titulo[0]}</span>
        <span className="block italic pfb-t2">{BAMBU.titulo[1]}</span>
      </h2>
      <div className="pr-[88px] lg:pr-0">
        <p className="mt-6 lg:mt-8 pfb-corpo text-[#F6F5F2]/85">{BAMBU.frase}</p>
      </div>
    </CapituloFoto>
  );
}
