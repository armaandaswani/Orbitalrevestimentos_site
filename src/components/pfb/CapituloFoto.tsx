import Image from "next/image";

/**
 * Capítulo de foto inteira com painel sólido azul-noite (capítulos 6 e 10 da
 * página do PFB; spec 2026-11-07-pfb-experiencia, Tabela, linhas 6 e 10).
 *
 * Altura: no máximo 680 px no celular e 820 px no computador, e nunca mais que
 * a tela menos o cabeçalho. Celular: a foto em cima com o que sobra, o painel
 * embaixo com a altura do texto e no mínimo 36% do quadro. Computador (lg): a
 * foto em tela cheia e o painel em 40% da largura, à esquerda, centrado na
 * vertical.
 *
 * A camada da foto passa 12 px da caixa em cima e embaixo para o parallax
 * (`.pfb-parallax`, só no nível completo). `children` é o conteúdo do painel,
 * com o `h2 id={tituloId}`; quem chama põe o último bloco de texto dentro de
 * `pr-[88px] lg:pr-0`, fora do canto do botão do chat.
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
  return (
    <section
      id={id}
      data-capitulo={id}
      aria-labelledby={tituloId}
      className="relative flex flex-col overflow-clip bg-[#0B1F45] h-[min(680px,calc(100svh-5rem))] lg:block lg:h-[min(820px,calc(100svh-5rem))]"
    >
      <div className="relative flex-1 min-h-0 overflow-clip lg:absolute lg:inset-0">
        <div className="absolute inset-x-0 -inset-y-3 pfb-parallax">
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
      <div className="relative shrink-0 min-h-[36%] ds-wrap py-12 bg-[#0B1F45] text-white flex flex-col justify-center lg:absolute lg:inset-y-0 lg:left-0 lg:w-[40%] lg:max-w-none lg:py-24">
        {children}
      </div>
    </section>
  );
}
