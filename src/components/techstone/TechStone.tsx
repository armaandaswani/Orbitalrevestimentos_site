"use client";

import { useCallback, useState } from "react";
import Ideias from "./Ideias";
import Tamanhos from "./Tamanhos";
import { Abertura, Sequencia } from "./Apresentacao";
import Revelar from "@/components/projetos/Revelar";
import ListaEsperaSheet, { type ModeloEspera } from "@/components/ListaEsperaSheet";
import { AVISO_CENAS, ESPESSURA_MM, FORMATOS, MODELOS_TECHSTONE, cena, texturaMiniatura, type FormatoTechStone } from "@/lib/techstone";

/** Modelos como a lista de espera mostra: textura e formato. */
const CATALOGO_ESPERA: ModeloEspera[] = MODELOS_TECHSTONE.map((m) => ({
  nome: m.nome,
  imagem: texturaMiniatura(m),
  detalhe: FORMATOS.find((f) => f.value === m.formato)?.rotulo,
}));

const PEDRAS = MODELOS_TECHSTONE.filter((m) => m.aparencia === "pedra").length;
const MADEIRAS = MODELOS_TECHSTONE.filter((m) => m.aparencia === "madeira").length;

/**
 * Página da TechStone (pré-lançamento). Ordem: abertura (só o nome, depois uma
 * frase por vez) → o que é → onde vai (sequência de quadros) → foto real →
 * desenvolvida para a Amazônia → ideias de projeto → dois tamanhos e os
 * modelos → lista de espera → perguntas.
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

  // Tamanho escolhido na seção de tamanhos; as ideias também o escolhem.
  const [tamanho, setTamanho] = useState<FormatoTechStone>("1200x600");
  const verTamanho = useCallback((t: FormatoTechStone) => {
    setTamanho(t);
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("tamanhos")?.scrollIntoView({ behavior: reduzir ? "auto" : "smooth", block: "start" });
  }, []);

  return (
    <div className="escala-contida bg-[#EFEBE4]">
      <Abertura entrarNaLista={() => abrirEspera()} />

      <section aria-labelledby="ts-oque" className="grid lg:grid-cols-2 bg-[#EFEBE4]">
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
          <h2 id="ts-amazonia" className="font-serif text-t1 max-w-[20ch]">Desenvolvida para a Amazônia.</h2>
          <p className="mt-5 text-lead text-white/75 max-w-[50ch]">
            Somos de Manaus e sabemos o que o clima daqui faz com um revestimento. Estas foram as nossas preocupações ao trazer a TechStone.
          </p>
          <ul className="mt-12 grid gap-8 sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-4 lg:mt-14">
            {PREOCUPACOES.map((c, i) => (
              <Revelar key={c.titulo} como="li" ordem={i} className="border-t border-white/20 pt-6">
                <h3 className="font-serif text-t3">{c.titulo}</h3>
                <p className="mt-3 text-corpo text-white/70 max-w-[36ch]">{c.texto}</p>
              </Revelar>
            ))}
          </ul>
        </div>
      </section>

      <Ideias verTamanho={verTamanho} />

      <Tamanhos tamanho={tamanho} escolher={setTamanho} interesse={(nome) => abrirEspera([nome])} />

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

      <section aria-labelledby="ts-perguntas" className="mv-adiado ds-wrap ds-secao">
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
