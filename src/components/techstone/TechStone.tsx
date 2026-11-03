"use client";

import { useCallback, useState } from "react";
import Cena from "./Cena";
import Modelos from "./Modelos";
import { Abertura, Formatos, Sequencia } from "./Apresentacao";
import ListaEsperaSheet, { type ModeloEspera } from "@/components/ListaEsperaSheet";
import { ESPESSURA_MM, FORMATOS, MODELOS_TECHSTONE, texturaMiniatura } from "@/lib/techstone";

/** Modelos como a lista de espera mostra: textura e formato. */
const CATALOGO_ESPERA: ModeloEspera[] = MODELOS_TECHSTONE.map((m) => ({
  nome: m.nome,
  imagem: texturaMiniatura(m),
  detalhe: FORMATOS.find((f) => f.value === m.formato)?.rotulo,
}));

/**
 * Página da TechStone (pré-lançamento). Ordem: abertura → onde vai (sequência
 * de quadros) → foto real → desenvolvida para a Amazônia → espessura → formatos → modelos com
 * textura → lista de espera → perguntas.
 *
 * Só afirmações que a Orbital já sustenta: espessura, formatos, modelos, uso
 * em fachada e interior, curvas e o material adaptado ao clima da Amazônia. Números
 * de UV, água, calor ou fogo entram quando a ficha técnica chegar com laudo.
 */

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

  return (
    <div className="escala-contida bg-[#EFEBE4]">
      <Abertura entrarNaLista={() => abrirEspera()} />

      <section aria-labelledby="ts-intro" className="ds-wrap ds-secao">
        <p id="ts-intro" className="font-serif text-t1 text-[#22201C] max-w-[24ch]">
          Pedra numa placa de {ESPESSURA_MM}&nbsp;mm, que dobra para acompanhar curvas, do interior à fachada.
        </p>
      </section>

      <Sequencia />

      {/* Foto real de aplicação (não gerada): a placa acompanha uma curva contínua.
          Sem menção ao teto até a ficha técnica chegar. Retrato de 960 px: metade da tela no computador. */}
      <section aria-labelledby="ts-curva-real" className="grid lg:grid-cols-2 bg-[#EFEBE4]">
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

      <section aria-labelledby="ts-amazonia" className="bg-[#22201C] text-white ds-secao">
        <div className="ds-wrap">
          <p className="text-sobre uppercase tracking-[0.12em] text-[#C9B48E]">Nossas preocupações</p>
          <h2 id="ts-amazonia" className="mt-4 font-serif text-t1 max-w-[20ch]">Desenvolvida para a Amazônia.</h2>
          <p className="mt-5 text-lead text-white/75 max-w-[50ch]">
            Somos de Manaus e sabemos o que o clima daqui faz com um revestimento. Foi isso que olhamos ao trazer a TechStone.
          </p>
          <ul className="mt-12 grid gap-10 sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-4 lg:mt-14">
            {PREOCUPACOES.map((c, i) => (
              <li key={c.titulo} className="border-t border-white/20 pt-6">
                <p aria-hidden className="text-sobre text-white/45 tabular-nums">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-2 font-serif text-t3">{c.titulo}</h3>
                <p className="mt-3 text-corpo text-white/70 max-w-[36ch]">{c.texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="ts-espessura" className="grid lg:grid-cols-2 bg-[#EFEBE4]">
        <div className="relative aspect-square lg:aspect-auto lg:min-h-[100svh] overflow-hidden">
          <Cena nome="espessura" alt="Placa fina curvada vista pela borda, gerada por IA a partir da textura TechStone Travertino Romano Clássico" />
        </div>
        <div className="ds-wrap lg:max-w-none lg:px-[clamp(2rem,5vw,6rem)] py-12 lg:py-0 flex flex-col justify-center">
          <h2 id="ts-espessura" className="font-serif text-[#22201C] leading-none tracking-[-0.02em] text-[clamp(3.5rem,2rem+8vw,5rem)] sm:text-[clamp(5rem,3rem+8vw,10rem)]">
            {ESPESSURA_MM}<span className="text-[0.4em] align-baseline ml-2">mm</span>
          </h2>
          <p className="mt-6 text-lead text-[#4A4540] max-w-[34ch]">
            Mais fina que um lápis e flexível o bastante para acompanhar uma curva.
          </p>
          <p className="mt-6 text-sobre text-[#8C7B63]">Imagem gerada por IA.</p>
        </div>
      </section>

      <Formatos />

      <Modelos interesse={(nome) => abrirEspera([nome])} />

      <section id="lista" aria-labelledby="ts-lista" className="bg-[#22201C] ds-secao scroll-mt-20">
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

      <section aria-labelledby="ts-perguntas" className="ds-wrap ds-secao">
        <h2 id="ts-perguntas" className="font-serif text-t2 text-[#22201C]">Perguntas</h2>
        <div className="mt-8 border-t border-[#22201C]/15">
          {PERGUNTAS.map((p) => (
            <details key={p.q} className="group border-b border-[#22201C]/15">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-4 font-serif text-t3 text-[#22201C]">
                {p.q}
                <span aria-hidden className="text-[#8C7B63] transition-transform group-open:rotate-45 text-2xl leading-none">+</span>
              </summary>
              <p className="pb-6 text-corpo text-[#4A4540] max-w-[62ch]">{p.a}</p>
            </details>
          ))}
        </div>
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
