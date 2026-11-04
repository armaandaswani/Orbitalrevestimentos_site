"use client";

import {
  startTransition, useCallback, useEffect, useEffectEvent, useImperativeHandle, useRef, useState,
  type CSSProperties, type Ref,
} from "react";
import Lupa from "@/components/movimento/Lupa";
import { useProgresso } from "@/components/ds/useProgresso";
import {
  ESPESSURA_MM, FORMATOS, MODELOS_TECHSTONE, texturaDownload, texturaMiniatura,
  type FormatoTechStone, type ModeloTechStone,
} from "@/lib/techstone";

type Vars = CSSProperties & Record<`--${string}`, string | number>;
type Escolhidos = Record<FormatoTechStone, string | null>;

/** Para que serve cada tamanho (texto aprovado pelo dono). */
const USO: Record<FormatoTechStone, string> = {
  "1200x600": "Para detalhes, nichos e paginações.",
  "2400x1200": "Para panos contínuos, com menos juntas.",
};

const DO_TAMANHO: Record<FormatoTechStone, ModeloTechStone[]> = {
  "1200x600": MODELOS_TECHSTONE.filter((m) => m.formato === "1200x600"),
  "2400x1200": MODELOS_TECHSTONE.filter((m) => m.formato === "2400x1200"),
};
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

/** Folga depois do fim da rolagem de "ver tamanho": o --p suavizado ainda chega ao destino. */
const FOLGA_TRAVA = 700;

/** Alça para fora da seção: "ver tamanho" das ideias. */
export type TamanhosAlca = { verTamanho: (t: FormatoTechStone) => void };

/**
 * "Dois tamanhos": primeiro a diferença contada pela rolagem (revelação presa
 * na tela), depois a grade dos modelos, solta, com as abas de tamanho. A
 * revelação termina num dos tamanhos e a grade abre nele.
 */
export default function Tamanhos({ ref, interesse }: {
  ref?: Ref<TamanhosAlca>;
  /** Abre a lista de espera com este modelo já marcado. */
  interesse: (nome: string) => void;
}) {
  // Tamanho da grade (aba). Muda pela aba, pela revelação ao trocar de tamanho e por "ver tamanho".
  const [tamanho, setTamanho] = useState<FormatoTechStone>("1200x600");
  // A rolagem de "ver tamanho" até a grade atravessa a revelação, que trocaria
  // o tamanho pelo caminho. Enquanto ela dura (até o fim da rolagem, mais a folga
  // da suavização do --p), a troca pela rolagem é ignorada.
  const trava = useRef(0);
  const soltarTrava = useRef<(() => void) | null>(null);
  useEffect(() => () => soltarTrava.current?.(), []);
  useImperativeHandle(ref, () => ({
    verTamanho(t) {
      setTamanho(t);
      soltarTrava.current?.();
      const alvo = document.getElementById("tamanhos");
      const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // Variável à parte: o "in" direto estreitaria window para never no else (o tipo já tem onscrollend).
      const temFim = "onscrollend" in window;
      if (temFim) {
        trava.current = performance.now() + 10000;
        window.addEventListener("scrollend", () => { trava.current = performance.now() + FOLGA_TRAVA; }, { once: true });
      } else if (alvo) {
        // Sem scrollend, a posição decide: a trava acaba quando o alvo chega ao
        // topo de destino (scroll-padding da página + scroll-margin dele) ou quando
        // a rolagem fica parada 150 ms (fim da página, rolagem interrompida).
        const destino = (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0)
          + (parseFloat(getComputedStyle(alvo).scrollMarginTop) || 0);
        trava.current = Infinity;
        let parada = 0;
        const soltar = () => {
          window.clearTimeout(parada);
          window.removeEventListener("scroll", rolou);
          soltarTrava.current = null;
        };
        const fim = () => { soltar(); trava.current = performance.now() + FOLGA_TRAVA; };
        const rolou = () => {
          window.clearTimeout(parada);
          if (Math.abs(alvo.getBoundingClientRect().top - destino) < 2) fim();
          else parada = window.setTimeout(fim, 150);
        };
        window.addEventListener("scroll", rolou, { passive: true });
        parada = window.setTimeout(fim, 150);
        soltarTrava.current = soltar;
      }
      alvo?.scrollIntoView({ behavior: reduzir ? "auto" : "smooth", block: "start" });
    },
  }), []);
  const escolherPelaRolagem = useCallback((t: FormatoTechStone) => {
    if (performance.now() >= trava.current) setTamanho(t);
  }, []);
  // Um modelo escolhido por tamanho, comum à revelação e à grade. Sem escolha, vale o primeiro.
  const [escolhidos, setEscolhidos] = useState<Escolhidos>({ "1200x600": null, "2400x1200": null });
  const escolherModelo = (m: ModeloTechStone) => setEscolhidos((e) => ({ ...e, [m.formato]: m.slug }));
  return (
    <section aria-labelledby="ts-tamanhos" className="bg-[#EFEBE4]">
      <Revelacao escolhidos={escolhidos} escolherModelo={escolherModelo} aoTrocarTamanho={escolherPelaRolagem} />
      <Grade tamanho={tamanho} escolher={setTamanho} escolhidos={escolhidos} escolherModelo={escolherModelo} interesse={interesse} />
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
 * none)` em globals.css (TechStone: dois tamanhos pela rolagem); o <noscript>
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
 * Ritmo, em fração de --p (440svh: a parte presa anda 340svh, uma tela ≈ 0,29).
 * As frações fixas do bloco "dois tamanhos" em globals.css andam junto com estas.
 */
const ENTRA_B = 0.334; // amostras pequenas: 0,334 → 0,427 (clicáveis de 0,334 até a troca)
const SAI_B = 0.567; // tudo da placa pequena sai até a troca
const TROCA = 0.614; // fim da etapa B: a placa vira a grande e a grade troca de aba
const ENTRA_C = 0.708; // amostras grandes: 0,708 → 0,801 (clicáveis de 0,708 em diante)
const PLACA = 0.36; // a imagem da placa entrou (0,334 → 0,354): a pedra grande sai de cena

function Revelacao({ escolhidos, escolherModelo, aoTrocarTamanho }: {
  escolhidos: Escolhidos;
  escolherModelo: (m: ModeloTechStone) => void;
  aoTrocarTamanho: (t: FormatoTechStone) => void;
}) {
  const ref = useProgresso<HTMLDivElement>();
  const quadro = useRef<HTMLDivElement>(null);
  const faixa = useRef<HTMLDivElement>(null);
  const blocoB = useRef<HTMLDivElement>(null);
  const blocoC = useRef<HTMLDivElement>(null);
  // Tamanho que a placa mostra agora (vem da rolagem; não muda com as abas da grade).
  const [tamanhoPlaca, setTamanhoPlaca] = useState<FormatoTechStone>("1200x600");
  const modelo = modeloDe(tamanhoPlaca, escolhidos);
  const textura = texturaPlaca(modelo);
  // A pedra em tela cheia só aparece antes da placa pequena: sempre a textura dela.
  const pedra = texturaPlaca(modeloDe("1200x600", escolhidos));
  // Textura anterior guardada no estado (ajuste durante a renderização, sem
  // efeito) para a nova entrar em fusão por cima dela.
  const [par, setPar] = useState<{ atual: string; anterior: string | null }>({ atual: textura, anterior: null });
  if (par.atual !== textura) setPar({ atual: textura, anterior: par.atual });
  // Nome do modelo e cor do número grande: trocam no meio da fusão da textura,
  // não no toque. Até lá o nome sai em fusão (data-saindo) e volta já trocado.
  const [mostrado, setMostrado] = useState(modelo);
  const trocando = mostrado !== modelo;
  useEffect(() => {
    if (!trocando) return;
    const id = window.setTimeout(() => setMostrado(modelo), meiaFusao());
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

  // Etapa, placa e troca de tamanho, a partir do --p que o useProgresso escreve no style.
  // Em transição: o React fatia a renderização entre os quadros da rolagem.
  const trocar = useEffectEvent((t: FormatoTechStone) => {
    startTransition(() => {
      setTamanhoPlaca(t);
      aoTrocarTamanho(t);
    });
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const estatico = window.matchMedia("(prefers-reduced-motion: reduce), (max-height: 480px)");
    let grupo: FormatoTechStone | null = null;
    let aquecido = false;
    const ler = () => {
      // Ao chegar perto (data-ativo), decodifica as amostras, que ficam ocultas até a
      // etapa delas: sem isso a decodificação cai no quadro em que elas aparecem.
      if (!aquecido && "ativo" in el.dataset) {
        aquecido = true;
        el.querySelectorAll<HTMLImageElement>(".ts-tam-amostras img").forEach((i) => {
          i.loading = "eager";
          i.decode().catch(() => {});
        });
      }
      const p = parseFloat(el.style.getPropertyValue("--p")) || 0;
      // Só as amostras da etapa à vista recebem foco e toque (o CSS lê data-etapa):
      // as pequenas de ENTRA_B até a troca, as grandes de ENTRA_C em diante.
      const etapa = p >= ENTRA_C ? "c" : p >= TROCA ? "cresce" : p >= ENTRA_B ? "b" : "a";
      if (el.dataset.etapa !== etapa) el.dataset.etapa = etapa;
      // Depois da fusão para a imagem da placa, a pedra grande some (visibility no CSS).
      const placa = p >= PLACA && !estatico.matches;
      if (placa !== "placa" in el.dataset) el.toggleAttribute("data-placa", placa);
      if (estatico.matches) return;
      // A placa vira a grande na troca, quando começa a crescer. Chama só quando muda
      // de verdade: a escolha de aba na grade vale até a rolagem passar por aqui de novo.
      const novo: FormatoTechStone = p >= TROCA ? "2400x1200" : "1200x600";
      if (novo === grupo) return;
      const antes = grupo;
      grupo = novo;
      if (antes !== null || novo !== "1200x600") trocar(novo);
    };
    ler();
    const mo = new MutationObserver(ler);
    mo.observe(el, { attributes: true, attributeFilter: ["style", "data-ativo"] });
    return () => mo.disconnect();
  }, [ref]);

  const entra = (a: number, b = 2, extra?: Vars): Vars => ({ "--a": a, "--b": b, ...extra });

  return (
    <div ref={ref} id="tamanhos-escala" className="ts-tam ds-escuro relative bg-[#141210] text-white"
      data-tom={mostrado.tom}>
      {/* Sem JavaScript: só em motor sem `scripting: none` (veja o CSS_SEM_JS). Inerte com JS. */}
      <noscript><style dangerouslySetInnerHTML={{ __html: CSS_SEM_JS }} /></noscript>
      <div ref={quadro} className="ts-tam-quadro sticky top-0 h-[100svh] overflow-hidden">
        {/* A pedra: tela cheia no começo; encolhe até o tamanho da placa pequena. */}
        <div aria-hidden className="ts-tam-pedra">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pedra} alt="" loading="lazy" decoding="async" />
        </div>
        {/* Véu do tamanho do quadro, sem escala: escurece a pedra e some no fundo da mesma cor. */}
        <div aria-hidden className="ts-tam-veu" />

        <div ref={faixa} className="ts-tam-a ts-tam-entra ds-wrap" style={entra(-1, 0.09, { "--d2": 0.084 })}>
          <h2 id="ts-tamanhos" className="ts-tam-titulo font-serif">Dois tamanhos.</h2>
          <p className="mt-5 sm:mt-7 text-lead text-white/85">Os dois com {ESPESSURA_MM}&nbsp;mm de espessura.</p>
        </div>

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
          {/* Pessoa de 1,70 m em traço fino, ao lado da placa. */}
          <svg aria-hidden viewBox="250 880 340 1730" className="ts-tam-pessoa ts-tam-entra" style={entra(0.24)}>
            <Pessoa />
          </svg>
          <p className="ts-tam-altura ts-tam-entra text-legenda text-white/60 tabular-nums" style={entra(0.259)}>1,70&nbsp;m</p>
          <p className="ts-tam-nome ts-tam-entra text-legenda text-white/60" style={entra(0.306)}>
            <span className="ts-tam-nome-texto" data-saindo={trocando || undefined}>{mostrado.nome}</span>
          </p>

          <div ref={blocoB} className="ts-tam-b">
            <h3 className="ts-tam-b-titulo ts-tam-entra font-serif tabular-nums" style={entra(0.268, SAI_B)}>{PEQUENO.rotulo}</h3>
            <div className="ts-tam-entra" style={entra(0.306, SAI_B)}>
              <p className="ts-tam-medida font-serif text-white/90">{PEQUENO.medida}</p>
              <p className="ts-tam-uso text-lead text-white/65 max-w-[36ch]">{USO["1200x600"]}</p>
            </div>
          </div>
          <Amostras formato="1200x600" inicio={ENTRA_B} saida={SAI_B} escolhidos={escolhidos} escolherModelo={escolherModelo} />

          <div ref={blocoC} className="ts-tam-c">
            <h3 className="ts-tam-c-titulo ts-tam-entra font-serif tabular-nums" style={entra(0.722)}>
              <span className="ts-tam-c-fora">{GRANDE.rotulo}</span>
              {/* Mesma linha em tinta escura, recortada no retângulo da placa: o número
                  troca de cor exatamente na borda da pedra. */}
              <span aria-hidden className="ts-tam-c-dentro">{GRANDE.rotulo}</span>
            </h3>
            <div className="ts-tam-c-texto ts-tam-entra" style={entra(0.75)}>
              <p className="ts-tam-medida font-serif text-white/90">{GRANDE.medida}</p>
              <p className="ts-tam-uso text-lead text-white/65 max-w-[36ch]">{USO["2400x1200"]}</p>
            </div>
          </div>
          <Amostras formato="2400x1200" inicio={ENTRA_C} escolhidos={escolhidos} escolherModelo={escolherModelo} />
        </div>

        {/* Movimento reduzido, tela baixa e sem JavaScript: as duas placas lado a lado, paradas. */}
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
      </div>
    </div>
  );
}

/** Fileira de amostras de um tamanho: em pé no chão, como placas pequenas. */
function Amostras({ formato, inicio, saida = 2, escolhidos, escolherModelo }: {
  formato: FormatoTechStone; inicio: number; saida?: number;
  escolhidos: Escolhidos; escolherModelo: (m: ModeloTechStone) => void;
}) {
  const lista = DO_TAMANHO[formato];
  const ativo = modeloDe(formato, escolhidos).slug;
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
}

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

/* ── Parte 2: a grade dos modelos ──────────────────────────────────────── */

/**
 * As abas de tamanho e os modelos daquele tamanho (textura para baixar e
 * "Tenho interesse"). No celular os modelos correm de lado, para a seção não
 * virar uma lista longa. É o destino de "ver tamanho" (id="tamanhos").
 */
function Grade({ tamanho, escolher, escolhidos, escolherModelo, interesse }: {
  tamanho: FormatoTechStone;
  escolher: (t: FormatoTechStone) => void;
  escolhidos: Escolhidos;
  escolherModelo: (m: ModeloTechStone) => void;
  interesse: (nome: string) => void;
}) {
  const lista = DO_TAMANHO[tamanho];
  const modeloAtivo = modeloDe(tamanho, escolhidos);
  return (
    <div id="tamanhos" data-tamanho={tamanho} className="ts-tamanhos ds-secao scroll-mt-16">
      <div className="ds-wrap">
        <h3 className="font-serif text-t2 text-[#22201C] text-balance">Escolha o tamanho e veja os modelos.</h3>

        <div role="tablist" aria-label="Tamanho da placa" className="mt-8 grid grid-cols-2 gap-2 sm:gap-3 max-w-2xl">
          {FORMATOS.map((f) => {
            const ativo = f.value === tamanho;
            const n = DO_TAMANHO[f.value].length;
            return (
              <button key={f.value} id={`ts-aba-${f.value}`} type="button" role="tab" aria-selected={ativo} aria-controls="ts-painel-tamanho"
                onClick={() => escolher(f.value)}
                className={`text-left px-3 py-4 sm:px-6 sm:py-5 border transition-colors duration-300 ${
                  ativo ? "bg-[#22201C] border-[#22201C] text-white" : "border-[#22201C]/20 text-[#22201C] hover:border-[#22201C]/50"
                }`}>
                <span className="block font-serif text-[1rem] min-[400px]:text-[1.125rem] sm:text-t3 leading-tight whitespace-nowrap tabular-nums">{f.rotulo}</span>
                <span className={`mt-1.5 block text-legenda ${ativo ? "text-white/70" : "text-[#6B6158]"}`}>{f.medida} · {n} modelos</span>
              </button>
            );
          })}
        </div>

        <div id="ts-painel-tamanho" role="tabpanel" aria-labelledby={`ts-aba-${tamanho}`}
          className="mv-brilho-fonte mt-10 grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16 lg:items-start">
          <p className="font-serif text-t2 text-[#22201C] max-w-[22ch]">{USO[tamanho]}</p>
          <div>
            <ul aria-label={`Modelos em ${FORMATOS.find((f) => f.value === tamanho)!.rotulo}`}
              className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-[clamp(1rem,4.2vw,4rem)] px-[clamp(1rem,4.2vw,4rem)] scroll-px-[clamp(1rem,4.2vw,4rem)] pb-2 sm:mx-0 sm:px-0 sm:scroll-px-0 sm:grid sm:grid-cols-5 sm:gap-x-4 sm:overflow-visible">
              {/* Do sm para cima cada item ocupa 3 linhas da grade (textura, nome, ações) em subgrade:
                  as linhas são compartilhadas, então nomes de 1, 2 ou 3 linhas não desalinham os links. */}
              {lista.map((m) => (
                <li key={m.slug} className="snap-start shrink-0 w-[38%] sm:w-auto sm:row-span-3 sm:grid sm:grid-rows-subgrid">
                  {/* A escala fica na revelação, acima. Aqui o botão marca o modelo escolhido,
                      que é o que a placa mostra quando a rolagem volta a este tamanho. */}
                  <button type="button" onClick={() => escolherModelo(m)}
                    aria-pressed={m.slug === modeloAtivo.slug} aria-label={`Ver ${m.nome} na placa`}
                    className="ts-modelo relative block w-full text-left">
                    {/* Lupa: passar o mouse (ou segurar 250 ms no celular) mostra a textura 2,5× do arquivo grande;
                        o clique/toque rápido continua escolhendo o modelo. */}
                    <Lupa fonte={texturaDownload(m)}>
                      <span className="mv-brilho relative block aspect-[1/2] overflow-hidden bg-[#D9D1C4]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={texturaMiniatura(m)} alt="" loading="lazy" decoding="async"
                          className="absolute inset-0 w-full h-full object-cover" />
                      </span>
                    </Lupa>
                    <span aria-hidden className="ts-modelo-linha" />
                  </button>
                  <h4 className="mt-3 min-h-[2lh] sm:min-h-0 font-serif text-[1rem] leading-snug text-[#22201C]">{m.nome}</h4>
                  <div className="mt-1 flex flex-col items-start">
                    <a href={texturaDownload(m)} download className="min-h-10 inline-flex items-center text-legenda text-[#22201C] underline underline-offset-4 decoration-[#22201C]/30 hover:decoration-[#22201C]">
                      Baixar textura
                    </a>
                    <button type="button" onClick={() => interesse(m.nome)}
                      className="min-h-10 inline-flex items-center text-legenda font-semibold text-[#1F7A44] hover:text-[#22201C]">
                      Tenho interesse
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sobre text-[#8C7B63]">A cor real pode variar um pouco em relação à tela.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
