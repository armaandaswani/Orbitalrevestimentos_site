"use client";

import {
  memo, startTransition, useCallback, useEffect, useEffectEvent, useRef, useState,
  type CSSProperties,
} from "react";
import Link from "next/link";
import BotaoToque from "./BotaoToque";
import { useToque } from "@/components/ds/useToque";
import {
  CATALOGO_TECHSTONE, DO_TAMANHO, ESPESSURA_MM, FORMATOS, MODELOS_TECHSTONE, USO_TAMANHO as USO,
  texturaDownload, texturaMiniatura, type FormatoTechStone, type ModeloTechStone,
} from "@/lib/techstone";

type Vars = CSSProperties & Record<`--${string}`, string | number>;
type Escolhidos = Record<FormatoTechStone, string | null>;

/** Duração da revelação, em ms. */
const DURACAO = 9500;
const PEQUENO = FORMATOS[0];
const GRANDE = FORMATOS[1];

/** O modelo escolhido daquele tamanho ou, se nenhum, o primeiro dele. */
function modeloDe(t: FormatoTechStone, escolhidos: Escolhidos) {
  return DO_TAMANHO[t].find((m) => m.slug === escolhidos[t]) ?? DO_TAMANHO[t][0];
}

/**
 * Textura da placa na revelação. A primeira (Travertino Romano Clássico) abre
 * a seção em tela cheia, então usa o arquivo grande; as outras só aparecem na
 * placa já pequena, e a miniatura (a mesma das amostras, já carregada) basta.
 */
function texturaPlaca(m: ModeloTechStone) {
  return m.slug === DO_TAMANHO["1200x600"][0].slug ? texturaDownload(m) : texturaMiniatura(m);
}

/**
 * Metade da fusão da textura na placa (--mv-base, em globals.css), em ms: é
 * quando o nome do modelo e a cor do número grande trocam. Com movimento
 * reduzido não há fusão e a troca é imediata.
 */
function meiaFusao() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return 0;
  const v = getComputedStyle(document.documentElement).getPropertyValue("--mv-base").trim();
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return 260;
  return (v.endsWith("ms") ? n : n * 1000) / 2;
}

/**
 * "Dois tamanhos": a diferença contada numa tela que toca sozinha (revelação)
 * e, logo abaixo, o caminho para o catálogo com todos os modelos.
 */
export default function Tamanhos() {
  // Um modelo escolhido por tamanho nas amostras da revelação. Sem escolha, vale o primeiro.
  const [escolhidos, setEscolhidos] = useState<Escolhidos>({ "1200x600": null, "2400x1200": null });
  // Estável: a revelação e as amostras são memo e não renderizam de novo a cada troca.
  const escolherModelo = useCallback((m: ModeloTechStone) => setEscolhidos((e) => ({ ...e, [m.formato]: m.slug })), []);
  return (
    <section aria-labelledby="ts-tamanhos" className="bg-[#EFEBE4]">
      <Revelacao escolhidos={escolhidos} escolherModelo={escolherModelo} />
      <div data-encaixe="solto" className="ts-encaixe-ponto ds-wrap py-14 sm:py-20 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-serif text-t2 text-[#22201C] text-balance">Os {MODELOS_TECHSTONE.length} modelos, nos dois tamanhos.</p>
          <p className="mt-3 text-lead text-[#4A4540] max-w-[44ch]">Cada um tem a textura para baixar e usar no seu projeto.</p>
        </div>
        <Link href={CATALOGO_TECHSTONE} className="ds-botao bg-[#22201C] text-white hover:bg-[#4A4540] min-h-12 px-8 self-start sm:self-auto shrink-0">
          Ver os modelos
        </Link>
      </div>
    </section>
  );
}

/* ── Parte 1: a revelação ──────────────────────────────────────────────── */

/**
 * Medidas do palco, em px, a partir do quadro (W × H) e da faixa de conteúdo
 * do site (L → R, a mesma do ds-wrap). Unidade do desenho: milímetro; `u` é
 * quantos px vale 1 mm. Deitado (computador), a placa grande ocupa 80% da
 * altura; em pé (celular e tablet em pé), o texto fica em cima e a placa
 * grande ocupa o que sobra até o chão, no máximo 60% da altura.
 *
 * A pedra é uma caixa 1:2 do tamanho que cobre o quadro, centrada (é a tela
 * cheia do começo). Para virar a placa ela só encolhe (escala ≤ 1) a partir
 * do canto de baixo à esquerda. O encolhimento é um zoom de câmera: há um
 * ponto fixo P que não se mexe na tela, e o canto vai de c1 (tela cheia) a cb
 * (placa pequena no chão) ao longo de P + k·(c1 − P). O CSS recebe P − c1
 * (--dx, --dy) e kb, e calcula o resto com --p.
 */
function geometria(W: number, H: number, L: number, R: number, textoFim: number) {
  const retrato = W < 768 || H >= W;
  const PESSOA = 340; // largura do desenho da pessoa, em mm
  const VAO = retrato ? 200 : 350; // da pessoa à placa
  let u: number, F: number;
  if (retrato) {
    F = H - 124; // embaixo do chão: o nome do modelo e a fileira de amostras
    u = Math.min(Math.min(0.6 * H, F - textoFim - 16) / 2400, (R - L) / (PESSOA + VAO + 1200));
  } else {
    F = H * 0.9;
    u = Math.min((0.8 * H) / 2400, (R - L - 320) / (PESSOA + VAO + 1200));
  }
  u = Math.max(u, 0.02);
  const X = L + (PESSOA + VAO) * u;
  const wc = Math.max(W, H / 2);
  const kb = (1200 * u) / (2 * wc);
  const c1x = (W - wc) / 2, c1y = (H + 2 * wc) / 2;
  const px = (X - kb * c1x) / (1 - kb), py = (F - kb * c1y) / (1 - kb);
  const g: Record<string, string> = {
    "--u": `${u.toFixed(5)}px`, "--fy": `${F.toFixed(2)}px`, "--xp": `${X.toFixed(2)}px`, "--xh": `${L.toFixed(2)}px`,
    "--dx": `${(px - c1x).toFixed(2)}px`, "--dy": `${(py - c1y).toFixed(2)}px`, "--kb": kb.toFixed(5),
  };
  if (!retrato) {
    // Corpo dos números grandes: cabem entre a placa e o fim da faixa.
    const fb = Math.min(120, 0.072 * W, (R - (X + 600 * u + 56)) / 7.2);
    const fc = Math.min(144, 0.09 * W, (R - (X + 48)) / 7.7);
    g["--fb"] = `${fb.toFixed(1)}px`;
    g["--fc"] = `${fc.toFixed(1)}px`;
  }
  return g;
}

/**
 * Layout estático para quem não roda JavaScript: o --p nunca anda e a cena
 * ficaria parada na tela cheia. Mesmas regras do bloco `@media (scripting:
 * none)` em globals.css (TechStone: dois tamanhos, tocando sozinha); o <noscript>
 * cobre os motores que ainda não conhecem `scripting`. Os dois blocos
 * precisam ficar iguais.
 */
const CSS_SEM_JS = `
.ts-tam{height:auto}
.ts-tam .ts-tam-quadro{position:relative;height:auto;padding-block:clamp(3.5rem,2rem + 4.5vw,7rem)}
.ts-tam .ts-tam-pedra{left:0;top:0;width:100%;height:100%;margin:0;aspect-ratio:auto}
.ts-tam .ts-tam-pedra>*{transform:none}
.ts-tam .ts-tam-veu{opacity:.7}
.ts-tam .ts-tam-a{position:relative;inset:auto;opacity:1;transform:none}
.ts-tam .ts-tam-cena{display:none}
.ts-tam .ts-tam-estatico{display:block}
`;

/**
 * Ritmo, em fração de --p (9,5 s no total; o useToque anda o --p pelo tempo).
 * As frações fixas do bloco "dois tamanhos" em globals.css andam junto com estas.
 */
const ENTRA_B = 0.334; // amostras pequenas: 0,334 → 0,427 (clicáveis de 0,334 até a troca)
const SAI_B = 0.567; // tudo da placa pequena sai até a troca
const TROCA = 0.614; // fim da etapa B: a placa vira a grande e a grade troca de aba
const ENTRA_C = 0.708; // amostras grandes: 0,708 → 0,801 (clicáveis de 0,708 em diante)
const PLACA = 0.36; // a imagem da placa entrou (0,334 → 0,354): a pedra grande sai de cena
// Na volta (rolando para cima) a pedra grande reaparece já em 0,42, ainda sob a placa
// opaca: ganha a camada e o raster antes de a placa sair de cima dela (0,354 → 0,334).
const VOLTA = 0.42;
// Fronteiras das faixas em que o observador age (etapa, placa, troca), em ordem.
const LIMITES = [ENTRA_B, PLACA, VOLTA, TROCA, ENTRA_C];
const FAIXA_PLACA = 2; // índice da faixa PLACA ≤ p < VOLTA, onde vale o sentido da rolagem

/*
 * Peças fixas da revelação, criadas uma vez: a troca de placa pela rolagem
 * renderiza a revelação no meio da rolagem, e só o que muda (placa, nome)
 * precisa ser refeito.
 */
const TITULO_A = (
  <>
    <h2 id="ts-tamanhos" className="ts-tam-titulo font-serif">Dois tamanhos.</h2>
    <p className="mt-5 sm:mt-7 text-lead text-white/85">Os dois com {ESPESSURA_MM}&nbsp;mm de espessura.</p>
  </>
);
const ESTILO_A: Vars = { "--a": -1, "--b": 0.09, "--d2": 0.084 };
const PESSOA_CENA = (
  <>
    {/* Pessoa de 1,70 m em traço fino, ao lado da placa. */}
    <svg aria-hidden viewBox="250 880 340 1730" className="ts-tam-pessoa ts-tam-entra" style={{ "--a": 0.24, "--b": 2 } as Vars}>
      <Pessoa />
    </svg>
    <p className="ts-tam-altura ts-tam-entra text-legenda text-white/60 tabular-nums" style={{ "--a": 0.259, "--b": 2 } as Vars}>1,70&nbsp;m</p>
  </>
);
const ESTILO_NOME: Vars = { "--a": 0.306, "--b": 2 };
const TEXTO_B = (
  <>
    <h3 className="ts-tam-b-titulo ts-tam-entra font-serif tabular-nums" style={{ "--a": 0.268, "--b": SAI_B } as Vars}>{PEQUENO.rotulo}</h3>
    <div className="ts-tam-entra" style={{ "--a": 0.306, "--b": SAI_B } as Vars}>
      <p className="ts-tam-medida font-serif text-white/90">{PEQUENO.medida}</p>
      <p className="ts-tam-uso text-lead text-white/65 max-w-[36ch]">{USO["1200x600"]}</p>
    </div>
  </>
);
const TEXTO_C = (
  <>
    <h3 className="ts-tam-c-titulo ts-tam-entra font-serif tabular-nums" style={{ "--a": 0.722, "--b": 2 } as Vars}>
      <span className="ts-tam-c-fora">{GRANDE.rotulo}</span>
      {/* Mesma linha em tinta escura, recortada no retângulo da placa: o número
          troca de cor exatamente na borda da pedra. */}
      <span aria-hidden className="ts-tam-c-dentro">{GRANDE.rotulo}</span>
    </h3>
    <div className="ts-tam-c-texto ts-tam-entra" style={{ "--a": 0.75, "--b": 2 } as Vars}>
      <p className="ts-tam-medida font-serif text-white/90">{GRANDE.medida}</p>
      <p className="ts-tam-uso text-lead text-white/65 max-w-[36ch]">{USO["2400x1200"]}</p>
    </div>
  </>
);
/* Movimento reduzido, tela baixa e sem JavaScript: as duas placas lado a lado, paradas. */
const ESTATICO = (
  <div className="ts-tam-estatico ds-wrap">
    <div className="ts-tam-est-grade">
      <svg aria-hidden viewBox="250 880 340 1730" className="ts-tam-est-pessoa"><Pessoa /></svg>
      {FORMATOS.map((f) => (
        <span key={f.value} aria-hidden className={`ts-tam-est-placa ts-tam-est-${f.value === "1200x600" ? "pequena" : "grande"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={texturaMiniatura(DO_TAMANHO[f.value][0])} alt="" loading="lazy" decoding="async" />
        </span>
      ))}
      <p className="ts-tam-est-legenda text-legenda text-white/60 tabular-nums">1,70&nbsp;m</p>
      {FORMATOS.map((f) => (
        <p key={f.value} className="ts-tam-est-legenda">
          <span className="block font-serif text-t3 tabular-nums">{f.rotulo}</span>
          <span className="mt-1 block text-legenda text-white/65">{f.medida}</span>
        </p>
      ))}
    </div>
  </div>
);

const Revelacao = memo(function Revelacao({ escolhidos, escolherModelo }: {
  escolhidos: Escolhidos;
  escolherModelo: (m: ModeloTechStone) => void;
}) {
  const { ref, estado, alternar } = useToque<HTMLDivElement>(DURACAO);
  const quadro = useRef<HTMLDivElement>(null);
  const faixa = useRef<HTMLDivElement>(null);
  const blocoB = useRef<HTMLDivElement>(null);
  const blocoC = useRef<HTMLDivElement>(null);
  // Tamanho que a placa mostra agora (vem do andamento da animação).
  // `direto`: a troca veio de um salto do --p (a seção voltou à faixa dela
  // fora da vista, veja useToque): sem fusão, e nome e textura trocam juntos,
  // numa renderização só.
  const [placa, setPlaca] = useState<{ t: FormatoTechStone; direto: boolean }>({ t: "1200x600", direto: false });
  const modelo = modeloDe(placa.t, escolhidos);
  const textura = texturaPlaca(modelo);
  // A pedra em tela cheia só aparece antes da placa pequena: sempre a textura dela.
  const pedra = texturaPlaca(modeloDe("1200x600", escolhidos));
  // Textura anterior guardada no estado (ajuste durante a renderização, sem
  // efeito) para a nova entrar em fusão por cima dela.
  const [par, setPar] = useState<{ atual: string; anterior: string | null; t: FormatoTechStone }>({ atual: textura, anterior: null, t: placa.t });
  if (par.atual !== textura) {
    const semFusao = placa.direto && par.t !== placa.t;
    setPar({ atual: textura, anterior: semFusao ? null : par.atual, t: placa.t });
  }
  // Nome do modelo e cor do número grande: trocam no meio da fusão da textura,
  // não no toque. Até lá o nome sai em fusão (data-saindo) e volta já trocado.
  const [mostrado, setMostrado] = useState(modelo);
  if (placa.direto && mostrado.formato !== placa.t) setMostrado(modelo);
  const trocando = mostrado !== modelo;
  // Lida uma vez na montagem (e quando o movimento reduzido muda): ler o estilo
  // computado na troca pela rolagem forçaria um recálculo de estilo no meio dela.
  const meia = useRef(260);
  useEffect(() => {
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ler = () => { meia.current = meiaFusao(); };
    ler();
    reduzido.addEventListener("change", ler);
    return () => reduzido.removeEventListener("change", ler);
  }, []);
  useEffect(() => {
    if (!trocando) return;
    const id = window.setTimeout(() => setMostrado(modelo), meia.current);
    return () => window.clearTimeout(id);
  }, [modelo, trocando]);

  // Medidas: o CSS posiciona tudo com --u, --fy, --xp… (veja geometria).
  useEffect(() => {
    const el = ref.current, q = quadro.current, f = faixa.current, b = blocoB.current, c = blocoC.current;
    if (!el || !q || !f || !b || !c) return;
    const medir = () => {
      const W = q.clientWidth, H = q.clientHeight;
      if (!W || !H) return;
      const cs = getComputedStyle(f);
      const L = f.offsetLeft + parseFloat(cs.paddingLeft);
      const R = f.offsetLeft + f.clientWidth - parseFloat(cs.paddingRight);
      const textoFim = Math.max(b.offsetTop + b.offsetHeight, c.offsetTop + c.offsetHeight);
      const g = geometria(W, H, L, R, textoFim);
      for (const k of ["--fb", "--fc"]) if (!(k in g)) el.style.removeProperty(k);
      for (const [k, v] of Object.entries(g)) el.style.setProperty(k, v);
    };
    const ro = new ResizeObserver(medir);
    ro.observe(q); ro.observe(b); ro.observe(c);
    return () => ro.disconnect();
  }, [ref]);

  // Etapa, placa e troca de tamanho, a partir do --p que o useToque escreve no style.
  // Em transição: o React fatia a renderização entre os quadros da animação.
  const trocar = useEffectEvent((t: FormatoTechStone, direto: boolean) => {
    startTransition(() => setPlaca({ t, direto }));
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Lido pelo evento change, não a cada quadro.
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce), (max-height: 480px)");
    let estatico = consulta.matches;
    let grupo: FormatoTechStone | null = null;
    let faixaAntes = -1;
    let pAntes = 0;
    let ativoAntes = false;
    let voltou = false;
    let aquecido = false;
    const ler = () => {
      const ativo = "ativo" in el.dataset;
      if (ativo && !ativoAntes) voltou = true;
      ativoAntes = ativo;
      // Ao chegar perto (data-ativo), decodifica as amostras, que ficam ocultas até a
      // etapa delas: sem isso a decodificação cai no quadro em que elas aparecem.
      if (!aquecido && ativo) {
        aquecido = true;
        el.querySelectorAll<HTMLImageElement>(".ts-tam-amostras img").forEach((i) => {
          i.loading = "eager";
          i.decode().catch(() => {});
        });
      }
      const p = parseFloat(el.style.getPropertyValue("--p")) || 0;
      // Salto: o primeiro valor depois de a seção voltar à faixa dela pula longe (o
      // useToque zera a seção fora da vista). O andamento normal,
      // dentro da faixa, anda pouco por quadro.
      const salto = voltou && Math.abs(p - pAntes) > 0.15;
      if (p !== pAntes) voltou = false;
      const sobe = p > pAntes, desce = p < pAntes;
      pAntes = p;
      // O --p muda a cada quadro, mas nada aqui muda dentro de uma mesma faixa (a
      // não ser na da placa, onde o sentido decide).
      let faixa = 0;
      while (faixa < LIMITES.length && p >= LIMITES[faixa]) faixa++;
      if (faixa === faixaAntes && faixa !== FAIXA_PLACA) return;
      faixaAntes = faixa;
      // Só as amostras da etapa à vista recebem foco e toque (o CSS lê data-etapa):
      // as pequenas de ENTRA_B até a troca, as grandes de ENTRA_C em diante.
      const etapa = p >= ENTRA_C ? "c" : p >= TROCA ? "cresce" : p >= ENTRA_B ? "b" : "a";
      if (el.dataset.etapa !== etapa) el.dataset.etapa = etapa;
      // Depois da fusão para a imagem da placa, a pedra grande some (visibility no CSS).
      // Some em PLACA rolando para baixo e volta abaixo de VOLTA rolando para cima.
      const ligada = "placa" in el.dataset;
      const placaGrande = !estatico && (p >= VOLTA || (p >= PLACA && (ligada ? !desce : sobe)));
      if (placaGrande !== ligada) el.toggleAttribute("data-placa", placaGrande);
      if (estatico) return;
      // A placa vira a grande na troca, quando começa a crescer. Chama só quando muda
      // de verdade: a troca só vale quando o andamento passa por aqui.
      const novo: FormatoTechStone = p >= TROCA ? "2400x1200" : "1200x600";
      if (novo === grupo) return;
      const antes = grupo;
      grupo = novo;
      if (antes !== null || novo !== "1200x600") trocar(novo, antes === null || salto);
    };
    const mudou = () => { estatico = consulta.matches; faixaAntes = -1; ler(); };
    consulta.addEventListener("change", mudou);
    ler();
    const mo = new MutationObserver(ler);
    mo.observe(el, { attributes: true, attributeFilter: ["style", "data-ativo"] });
    return () => { mo.disconnect(); consulta.removeEventListener("change", mudou); };
  }, [ref]);

  return (
    <div ref={ref} id="tamanhos-escala" className="ts-tam ts-encaixe-ponto ds-escuro relative bg-[#141210] text-white"
      data-tom={mostrado.tom}>
      {/* Sem JavaScript: só em motor sem `scripting: none` (veja o CSS_SEM_JS). Inerte com JS. */}
      <noscript><style dangerouslySetInnerHTML={{ __html: CSS_SEM_JS }} /></noscript>
      <div ref={quadro} className="ts-tam-quadro relative h-[100svh] overflow-hidden">
        {/* A pedra: tela cheia no começo; encolhe até o tamanho da placa pequena. */}
        <div aria-hidden className="ts-tam-pedra">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pedra} alt="" loading="lazy" decoding="async" />
        </div>
        {/* Véu do tamanho do quadro, sem escala: escurece a pedra e some no fundo da mesma cor. */}
        <div aria-hidden className="ts-tam-veu" />

        <div ref={faixa} className="ts-tam-a ts-tam-entra ds-wrap" style={ESTILO_A}>{TITULO_A}</div>

        <div className="ts-tam-cena">
          {/* A placa depois do zoom: uma imagem do tamanho da placa grande (escala ≤ 1), que
              entra em fusão sobre a pedra quando as duas têm o mesmo tamanho na tela. A troca
              de modelo entra em fusão aqui. */}
          <div aria-hidden className="ts-tam-placa">
            {par.anterior && (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={par.anterior} src={par.anterior} alt="" decoding="async" />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={par.atual} src={par.atual} alt="" loading="lazy" decoding="async"
              className={par.anterior ? "ts-folha-entra" : undefined} />
          </div>
          <div aria-hidden className="ts-tam-chao" />
          {PESSOA_CENA}
          <p className="ts-tam-nome ts-tam-entra text-legenda text-white/60" style={ESTILO_NOME}>
            <span className="ts-tam-nome-texto" data-saindo={trocando || undefined}>{mostrado.nome}</span>
          </p>

          <div ref={blocoB} className="ts-tam-b">{TEXTO_B}</div>
          <Amostras formato="1200x600" inicio={ENTRA_B} saida={SAI_B} ativo={modeloDe("1200x600", escolhidos).slug} escolherModelo={escolherModelo} />

          <div ref={blocoC} className="ts-tam-c">{TEXTO_C}</div>
          <Amostras formato="2400x1200" inicio={ENTRA_C} ativo={modeloDe("2400x1200", escolhidos).slug} escolherModelo={escolherModelo} />
        </div>

        {ESTATICO}

        <BotaoToque estado={estado} alternar={alternar} nome="dois tamanhos" />
      </div>
    </div>
  );
});

/** Fileira de amostras de um tamanho: em pé no chão, como placas pequenas. */
const Amostras = memo(function Amostras({ formato, inicio, saida = 2, ativo, escolherModelo }: {
  formato: FormatoTechStone; inicio: number; saida?: number;
  /** slug do modelo escolhido deste tamanho (ou do primeiro). */
  ativo: string; escolherModelo: (m: ModeloTechStone) => void;
}) {
  const lista = DO_TAMANHO[formato];
  const rotulo = FORMATOS.find((f) => f.value === formato)!.rotulo;
  // Entram uma a uma; a última chega em inicio + 0,093.
  const passo = lista.length > 1 ? 0.037 / (lista.length - 1) : 0;
  return (
    <ul aria-label={`Modelos em ${rotulo}`}
      className={`ts-tam-amostras ts-tam-amostras-${formato === "1200x600" ? "b" : "c"}`}>
      {lista.map((m, i) => (
        <li key={m.slug} className="ts-tam-entra shrink-0" style={{ "--a": inicio + i * passo, "--d": 0.056, "--b": saida } as Vars}>
          <button type="button" onClick={() => escolherModelo(m)}
            aria-pressed={m.slug === ativo} aria-label={`Ver ${m.nome} na placa`}
            className="ts-modelo ts-tam-amostra">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={texturaMiniatura(m)} alt="" loading="lazy" decoding="async" />
            <span aria-hidden className="ts-modelo-linha" />
          </button>
        </li>
      ))}
    </ul>
  );
});

/** Pessoa de 1,70 m em traço de planta (mm; chão em y = 2600), com traço de ~1 px na tela. */
function Pessoa() {
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="420" cy="1012" r="102" vectorEffect="non-scaling-stroke" />
      <path vectorEffect="non-scaling-stroke"
        d="M420 1114 L420 1690 M300 1300 Q420 1180 540 1300 M420 1690 L340 2300 L330 2600 M420 1690 L500 2300 L510 2600 M300 1300 L270 1760 M540 1300 L570 1760" />
    </g>
  );
}

