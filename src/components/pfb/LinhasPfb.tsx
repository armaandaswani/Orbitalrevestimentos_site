import Image from "next/image";
import Link from "next/link";
import { CATALOGO_PATH, catalogoPath } from "@/lib/product-link";
import { LINHAS } from "@/lib/pfb-textos";
import EntradaPfb from "./EntradaPfb";

/**
 * As cinco amostras do leque, da esquerda para a direita (spec, Tabela, linha
 * 7: as mesmas de `ConhecaPfb`). `r` em graus, `x` em px no celular (o CSS
 * multiplica por `--escala`, 1,4 no computador) e `par` a distância ao centro,
 * que a abertura do leque (Tarefa 7) usa para escalonar.
 */
const CARTAS = [
  { arquivo: "classic-bege-travertino-orb001", r: -16, x: -80, par: 2 },
  { arquivo: "brilliance-bronze-armani-orb005", r: -8, x: -40, par: 1 },
  { arquivo: "elegance-imbuia-orb002", r: 0, x: 0, par: 0 },
  { arquivo: "brilliance-gris-pietra-orb009", r: 8, x: 40, par: 1 },
  { arquivo: "classic-branco-calacatta-orb006", r: 16, x: 80, par: 2 },
] as const;

/**
 * Capítulo 7 da página do PFB: as três linhas (spec 2026-11-07-pfb-experiencia,
 * Tabela, linha 7). Creme. O segundo momento especial é o leque: cinco
 * amostras em cartas 3:4 (128 × 171 no celular, 180 × 240 no computador), com
 * a borda branca de 3 px, presas pela base no meio da tela; cada uma gira e
 * anda de lado pelo `--r` e o `--x` do `style` (`.pfb-leque-carta`, ruling P8),
 * e a do centro fica por cima. O leque abre do centro para fora na entrada do
 * contêiner: pela rolagem (`.pfb-leque` é o sujeito da linha do tempo) ou, onde
 * não há `animation-timeline`, por tempo, pelas classes do `EntradaPfb`, que é o
 * próprio contêiner. Sem JavaScript, com movimento reduzido ou no nível leve, o
 * leque fica parado, aberto: o estado final. O contêiner é da largura da tela,
 * com `overflow-x: clip`, para as cartas de fora nunca abrirem rolagem lateral;
 * as cartas são decorativas (`aria-hidden`, `alt=""`).
 *
 * Embaixo, as três linhas, cada uma um link para o catálogo da linha (nome em
 * t3, a frase em legenda e a seta), empilhadas no celular e numa fileira no
 * computador, e o botão "Ver os modelos" para o catálogo inteiro.
 */
export default function LinhasPfb() {
  return (
    <section
      id="linhas"
      data-capitulo="linhas"
      aria-labelledby="pfb-linhas-titulo"
      className="bg-[#F6F5F2] py-12 lg:py-24"
    >
      <div className="ds-wrap">
        <h2 id="pfb-linhas-titulo" className="font-serif pfb-t1 text-[#0B1F45] text-center">
          {LINHAS.titulo}
        </h2>
      </div>
      <EntradaPfb className="pfb-leque relative mt-6 h-[200px] lg:mt-8 lg:h-[280px]">
        {CARTAS.map(({ arquivo, r, x, par }, i) => (
          <div
            key={arquivo}
            data-carta={i}
            aria-hidden="true"
            className="pfb-leque-carta absolute left-1/2 bottom-6 -ml-16 h-[171px] w-32 overflow-hidden border-[3px] border-white bg-[#F6F5F2] lg:bottom-8 lg:-ml-[90px] lg:h-[240px] lg:w-[180px]"
            style={{ "--r": `${r}deg`, "--x": `${x}px`, "--par": par, zIndex: 3 - par } as React.CSSProperties}
          >
            {/* A placa ocupa a metade do meio da foto do estúdio (52% 50%).
                Ampliada 1,5× a partir da borda de dentro da carta, ela vai para a
                faixa de fora, a que as cartas de dentro deixam à vista: cada carta
                mostra a placa e a textura, não o fundo cinza (a do centro amplia
                pelo meio). Só a imagem muda; o transform da carta é o do CSS. */}
            <Image
              src={`/images/catalogue/${arquivo}.jpeg`}
              alt=""
              fill
              sizes="(min-width: 1024px) 270px, 192px"
              className={`object-cover object-[52%_50%] scale-150 ${r < 0 ? "origin-right" : r > 0 ? "origin-left" : "origin-center"}`}
            />
          </div>
        ))}
      </EntradaPfb>
      <div className="ds-wrap mt-6 lg:mt-10">
        <ul className="lg:grid lg:grid-cols-3 lg:gap-8">
          {LINHAS.curtas.map(({ linha, frase }) => (
            <li key={linha}>
              <Link
                href={catalogoPath({ linha })}
                data-teste="ver-linha"
                className="group flex min-h-11 items-center justify-between gap-4 border-b border-[#74777f]/30 py-3 text-[#0B1F45] lg:border-b-0 lg:border-t lg:pt-4 lg:pb-0"
              >
                <span className="min-w-0">
                  <span className="block font-serif pfb-t3 group-hover:text-[#2347A0]">{linha}</span>
                  <span className="block pfb-legenda text-[#43474e]">{frase}</span>
                </span>
                <span aria-hidden="true" className="mv-seta inline-flex shrink-0">→</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex justify-center">
          <Link href={CATALOGO_PATH} data-teste="ver-modelos" className="ds-botao ds-botao-cheio lg:min-h-12">
            {LINHAS.botaoModelos}
          </Link>
        </div>
      </div>
    </section>
  );
}
