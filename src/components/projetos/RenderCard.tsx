import Image from "next/image";
import type { Render } from "@/lib/projetos-tipos";

/**
 * Cartão de uma simulação de IA: foto, ambiente e modelo. Sem selo em cada
 * foto: o aviso de que são imagens geradas por IA fica uma vez só, no topo da
 * seção, e o alt de cada uma diz que é simulação (regra X0.08 v2).
 */
export default function RenderCard({ render, sizes = "(max-width: 639px) 46vw, (max-width: 1279px) 31vw, 340px" }: { render: Render; sizes?: string }) {
  return (
    <figure className="h-full flex flex-col">
      <div className="relative w-full overflow-hidden bg-white/5" style={{ aspectRatio: "4 / 5" }}>
        <Image src={render.image_path} alt={`Simulação gerada por IA: ${render.title} com o PFB ${render.product_code}`} fill sizes={sizes} className="object-cover" />
      </div>
      <figcaption className="mt-2.5">
        <span className="block font-serif text-white text-[1.0625rem] sm:text-lg leading-snug">{render.title}</span>
        <span className="block text-white/65 text-[13px] leading-snug mt-1">{render.product_code}</span>
      </figcaption>
    </figure>
  );
}
