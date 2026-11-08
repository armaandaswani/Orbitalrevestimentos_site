import Image from "next/image";

/**
 * Capítulo de foto inteira com painel sólido (capítulos 6 e 10 da página do
 * PFB). Altura: no máximo 680 px no celular e 820 px no computador, e nunca mais
 * que a tela menos o cabeçalho. Celular: a foto em cima com o que sobra, o
 * painel embaixo com a altura do texto e no mínimo 36% do quadro. Computador
 * (lg): a foto em tela cheia e o painel em 40% da largura, centrado na vertical.
 *
 * Dois jeitos (v2, 08/11/2026), para os dois capítulos de foto não repetirem o
 * mesmo gesto: `manaus` (painel azul-noite à esquerda, a foto com parallax
 * leve, `.pfb-parallax`) e `bambu` (painel creme à direita no computador, e a
 * foto que abre o recorte de dentro para fora enquanto entra na tela,
 * `.pfb-recorte`). Os dois movimentos só andam no nível completo, sem
 * movimento reduzido e com animation-timeline; fora disso a foto fica inteira
 * e parada.
 *
 * `children` é o conteúdo do painel, com o `h2 id={tituloId}`; quem chama põe o
 * último bloco de texto dentro de `pr-[88px] lg:pr-0`, fora do canto do chat.
 */
export default function CapituloFoto({
  id,
  tituloId,
  foto,
  children,
}: {
  id: "manaus" | "bambu";
  tituloId: "pfb-manaus-titulo" | "pfb-bambu-titulo";
  foto: { src: string; alt: string; posicao: string };
  children: React.ReactNode;
}) {
  const bambu = id === "bambu";
  return (
    <section
      id={id}
      data-capitulo={id}
      aria-labelledby={tituloId}
      className={`relative flex flex-col overflow-clip h-[min(680px,calc(100svh-5rem))] lg:block lg:h-[min(820px,calc(100svh-5rem))] ${
        bambu ? "bg-[#F6F5F2]" : "bg-[#0B1F45]"
      }`}
    >
      <div className="relative flex-1 min-h-0 overflow-clip lg:absolute lg:inset-0">
        <div className={bambu ? "absolute inset-0 pfb-recorte" : "absolute inset-x-0 -inset-y-3 pfb-parallax"}>
          <Image
            src={foto.src}
            alt={foto.alt}
            fill
            sizes="100vw"
            className="object-cover"
            style={{ objectPosition: foto.posicao }}
          />
        </div>
      </div>
      <div
        className={`relative shrink-0 min-h-[36%] ds-wrap py-10 flex flex-col justify-center lg:absolute lg:inset-y-0 lg:w-[40%] lg:max-w-none lg:py-24 ${
          bambu ? "bg-[#F6F5F2] text-[#0B1F45] lg:right-0 lg:left-auto lg:px-14" : "bg-[#0B1F45] text-white lg:left-0"
        }`}
      >
        {children}
      </div>
    </section>
  );
}
