"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Ideias from "./Ideias";
import Tamanhos from "./Tamanhos";
import { Abertura, Sequencia } from "./Apresentacao";
import Clima from "./Clima";
import Encaixe from "./Encaixe";
import Revelar from "@/components/projetos/Revelar";
import ListaEsperaSheet from "@/components/ListaEsperaSheet";
import { AVISO_CENAS, CATALOGO_ESPERA, ESPESSURA_MM, FORMATOS, MODELOS_TECHSTONE, catalogoTechStone, cena, type FormatoTechStone } from "@/lib/techstone";

const PEDRAS = MODELOS_TECHSTONE.filter((m) => m.aparencia === "pedra").length;
const MADEIRAS = MODELOS_TECHSTONE.filter((m) => m.aparencia === "madeira").length;

/**
 * Página da TechStone (pré-lançamento), montada como uma apresentação: cada
 * seção encaixa na tela (Encaixe) e as de quadro tocam sozinhas (useToque).
 * Ordem: abertura (só o nome, depois uma frase por vez) → o que é → onde vai
 * (sequência de quadros) → foto real → desenvolvida para a Amazônia → ideias
 * de projeto → dois tamanhos → lista de espera → perguntas. Os modelos moram
 * no catálogo (/techstone/catalogo).
 *
 * Só afirmações que a Orbital já sustenta: espessura, formatos, modelos, uso
 * em fachada e interior, curvas e o material adaptado ao clima da Amazônia. Números
 * de UV, água, calor ou fogo entram quando a ficha técnica chegar com laudo.
 */

/** A TechStone em quatro respostas curtas. */
const RESUMO = [
  { termo: "O que é", texto: `Uma placa de pedra flexível com ${ESPESSURA_MM} mm de espessura, em ${PEDRAS} pedras e ${MADEIRAS} madeiras.` },
  { termo: "Para que serve", texto: "Revestir fachadas e interiores: paredes, colunas e superfícies curvas." },
  { termo: "O que ela faz", texto: "A placa dobra e acompanha a curva sem cortar o desenho da pedra, dentro e fora da casa." },
  { termo: "Tamanhos", texto: `${FORMATOS.map((f) => f.rotulo).join(" e ")}.` },
];

/** As preocupações do dono ao trazer a TechStone (03/11/2026). Sem números até a ficha técnica. */
const PREOCUPACOES = [
  { titulo: "Sol amazônico", texto: "Perto da linha equatorial o sol bate forte e alto o ano inteiro. O material foi adaptado a essa incidência." },
  { titulo: "Umidade intensa", texto: "O ar fica úmido boa parte do ano, dentro e fora de casa, e a composição levou isso em conta." },
  { titulo: "Calor intenso", texto: "Fachada aqui passa o dia no calor forte. A placa foi pensada para esse uso." },
  { titulo: "Ciclos térmicos", texto: "A temperatura sobe e desce todo dia, em ciclos extremos e variados. Foi outra das nossas preocupações." },
];

const PERGUNTAS = [
  {
    q: "Quando a TechStone chega?",
    a: "Está a caminho. Quem está na lista de espera é avisado antes, pelo WhatsApp e pelo e-mail, assim que o material estiver em pronta-entrega em Manaus. A primeira remessa tem quantidade limitada.",
  },
  {
    q: "Onde posso usar?",
    a: "Em fachadas, paredes internas, colunas e superfícies curvas. A Orbital também tem o Painel Flexível em Fibra de Bambu, em pronta-entrega, para paredes e forros internos.",
  },
  {
    q: "Como é instalada?",
    a: "A Orbital fornece o material; a aplicação é feita pelo profissional da sua escolha. Um consultor tira suas dúvidas antes da compra.",
  },
  {
    q: "Qual o valor?",
    a: "Os valores são passados por um consultor.",
  },
  {
    q: "Posso usar as texturas no meu projeto?",
    a: "Sim. Cada modelo tem a textura para baixar, para renders e apresentações. A cor real pode variar um pouco em relação à tela.",
  },
];

export default function TechStone() {
  // Lista de espera: folha no padrão do pré-contato. Aberta por qualquer botão
  // da página; "Tenho interesse" abre com o modelo já marcado.
  const [espera, setEspera] = useState<{ aberto: boolean; modelos: string[] }>({ aberto: false, modelos: [] });
  const abrirEspera = useCallback((modelos: string[] = []) => setEspera({ aberto: true, modelos }), []);
  const fecharEspera = useCallback(() => setEspera((e) => ({ ...e, aberto: false })), []);

  // "Ver tamanho" das ideias abre o catálogo já naquele tamanho.
  const router = useRouter();
  const verTamanho = useCallback((t: FormatoTechStone) => router.push(catalogoTechStone(t)), [router]);

  return (
    <div className="escala-contida bg-[#EFEBE4]">
      <Encaixe />
      <Abertura entrarNaLista={() => abrirEspera()} />

      <section aria-labelledby="ts-oque" className="ts-encaixe-ponto grid lg:grid-cols-2 bg-[#EFEBE4]">
        <div className="relative aspect-[4/3] lg:aspect-auto lg:min-h-[100svh] overflow-hidden bg-[#22201C]">
          {/* Recorte de computador também no celular: o retrato perde a borda da placa. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cena("espessura").desktop} alt="Placa fina curvada vista pela borda, gerada por IA a partir da textura TechStone Travertino Romano Clássico"
            loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />        </div>
        <div className="ds-wrap lg:max-w-none lg:px-[clamp(2rem,5vw,6rem)] py-12 lg:py-20 flex flex-col justify-center">
          <h2 id="ts-oque" className="font-serif text-t1 text-[#22201C] max-w-[16ch]">O que é a TechStone.</h2>
          <dl className="mt-8 border-t border-[#22201C]/15">
            {RESUMO.map((r, i) => (
              <Revelar key={r.termo} ordem={i} className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-6 py-5 border-b border-[#22201C]/15">
                <dt className="text-legenda font-semibold text-[#8C7B63]">{r.termo}</dt>
                <dd className="font-serif text-[1.125rem] sm:text-t3 leading-snug text-[#22201C] max-w-[34ch]">{r.texto}</dd>
              </Revelar>
            ))}
          </dl>
        </div>
      </section>

      <Sequencia />

      {/* Foto real de aplicação (não gerada): a placa acompanha uma curva contínua.
          Sem menção ao teto até a ficha técnica chegar. Retrato de 960 px: metade da tela no computador. */}
      <section aria-labelledby="ts-curva-real" className="ts-encaixe-ponto grid lg:grid-cols-2 bg-[#EFEBE4]">
        <div className="relative aspect-[4/5] lg:aspect-auto lg:min-h-[100svh] overflow-hidden bg-[#22201C]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/techstone/aplicacao-parede-teto-v1.webp"
            alt="Placas de pedra flexível em travertino formando uma curva contínua, com linhas de LED acompanhando a curva"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
        <div className="ds-wrap lg:max-w-none lg:px-[clamp(2rem,5vw,6rem)] py-12 lg:py-0 flex flex-col justify-center">
          <h2 id="ts-curva-real" className="font-serif text-t1 text-[#22201C] max-w-[16ch] text-balance">Uma curva só, do começo ao fim.</h2>
          <p className="mt-5 text-lead text-[#4A4540] max-w-[36ch]">
            A placa acompanha a curva sem quebrar o desenho da pedra.
          </p>
          <p className="mt-6 text-sobre text-[#8C7B63]">Foto de aplicação real do material.</p>
        </div>
      </section>

      <Clima preocupacoes={PREOCUPACOES} />

      <Ideias verTamanho={verTamanho} />

      <Tamanhos />

      <section id="lista" aria-labelledby="ts-lista" className="ts-encaixe-ponto bg-[#22201C] ds-secao scroll-mt-20">
        <div className="ds-wrap flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 id="ts-lista" className="font-serif text-t1 text-white max-w-[14ch]">Seja avisado na chegada.</h2>
            <p className="mt-5 text-lead text-white/75 max-w-[44ch]">
              A primeira remessa chega a Manaus em quantidade limitada. Quem está na lista é avisado antes, com o modelo que escolheu.
            </p>
          </div>
          <button type="button" onClick={() => abrirEspera()} className="ds-botao ds-botao-claro min-h-12 px-8 self-start sm:min-h-14 sm:px-10 shrink-0">
            Entrar na lista de espera
          </button>
        </div>
      </section>

      <section aria-labelledby="ts-perguntas" className="ts-encaixe-ponto mv-adiado ds-wrap ds-secao">
        <h2 id="ts-perguntas" className="font-serif text-t2 text-[#22201C]">Perguntas</h2>
        <div className="mt-8 border-t border-[#22201C]/15">
          {PERGUNTAS.map((p) => (
            <details key={p.q} className="group border-b border-[#22201C]/15">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-4 font-serif text-t3 text-[#22201C]">
                {p.q}
                <span aria-hidden className="text-[#8C7B63] transition-transform motion-reduce:transition-none group-open:rotate-45 text-2xl leading-none">+</span>
              </summary>
              <p className="pb-6 text-corpo text-[#4A4540] max-w-[62ch]">{p.a}</p>
            </details>
          ))}
        </div>
        {/* Aviso único da página (decisão do dono, 03/11/2026): sem selo nas imagens. */}
        <p className="mt-10 text-sobre text-[#8C7B63] max-w-[62ch]">{AVISO_CENAS}</p>
      </section>

      <ListaEsperaSheet
        aberto={espera.aberto}
        fechar={fecharEspera}
        linha="techstone"
        nomeLinha="TechStone"
        catalogo={CATALOGO_ESPERA}
        modelosIniciais={espera.modelos}
      />
    </div>
  );
}
