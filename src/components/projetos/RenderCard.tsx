import Image from "next/image";
import type { Render } from "@/lib/projetos-tipos";

/** Cartão de uma simulação de IA: foto com o selo "IA", modelo e ambiente. */
export default function RenderCard({ render, sizes = "(max-width: 639px) 44vw, (max-width: 1023px) 30vw, 240px" }: { render: Render; sizes?: string }) {
  return (
    <figure className="h-full bg-white/5 flex flex-col">
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "4 / 5" }}>
        <Image src={render.image_path} alt={`${render.title}, simulação com ${render.product_code}`} fill sizes={sizes} className="object-cover" />
        <span className="absolute top-2 left-2 border border-white/30 bg-black/50 text-white text-xs tracking-[0.14em] uppercase font-bold px-2 py-0.5">IA</span>
      </div>
      <figcaption className="px-3 pt-2.5 pb-3">
        <span className="block text-secondary text-xs tracking-[0.12em] uppercase font-semibold">{render.product_code}</span>
        <span className="block font-serif text-white text-base leading-snug mt-0.5">{render.title}</span>
      </figcaption>
    </figure>
  );
}
