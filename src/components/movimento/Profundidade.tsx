"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { relogio } from "@/lib/movimento/relogio";
import { aproximar } from "@/lib/movimento/suavizar";

/**
 * Profundidade: uma foto em planos separados (fundo, assunto, frente) que
 * andam em ritmos levemente diferentes. É o que faz a cena ler como espaço
 * real em vez de papel colado na tela.
 *
 * - Rolagem: cada camada tem um `fator`. Com `rolagem="propria"` (padrão) o
 *   componente mede o próprio topo e desloca cada plano `(1 - fator)` vezes o
 *   que a página andou (fundo < 1 fica para trás, frente > 1 adianta). Com
 *   `rolagem="externa"` quem hospeda compõe o movimento no CSS a partir de
 *   `--mv-f` (a abertura da TechStone, que é um quadro fixo e usa o --p dela).
 * - Ponteiro: só com mouse de verdade, `(hover: hover) and (pointer: fine)`,
 *   no nível `completo` e sem movimento reduzido. O desvio vai para `--mv-mx`
 *   e `--mv-my` (-1 → 1), suavizado no relógio compartilhado com uma
 *   constante longa: a cena acompanha o olhar com peso, nunca balança.
 * - Nível `leve`: o CSS leva cada fator até a metade do caminho para 1.
 * - Movimento reduzido: planos empilhados e parados (o CSS zera o transform).
 *
 * Todas as camadas ocupam a mesma caixa com `object-cover`, então duas imagens
 * do mesmo tamanho ficam alinhadas pixel a pixel. A caixa sobra `--mv-sobra`
 * (12 px) em cada lado, o que cobre o ponteiro; o curso da rolagem depende
 * dos fatores e da altura do herói, então quem hospeda aumenta a sobra no CSS
 * ou recorta com overflow para nenhum deslocamento abrir fresta na borda.
 */

export interface CamadaProfundidade {
  /** Imagem do plano (computador; e celular, se `mobile` não for dado). */
  src: string;
  /** Texto alternativo. Só o plano de fundo descreve a cena; os outros são `""`. */
  alt: string;
  /** Multiplicador da rolagem: fundo ~0,94, assunto 1, frente > 1. */
  fator: number;
  /** Desvio máximo com o ponteiro, em px. Negativo = sentido inverso. */
  ponteiro?: number;
  /**
   * Imagem abaixo de 768 px. `null` tira o plano no celular (nem baixa o
   * arquivo): é como a TechStone fica num plano só no retrato.
   */
  mobile?: string | null;
}

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/** GIF transparente de 1 px: a fonte do celular para um plano que não existe lá. */
const VAZIO = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/** Constante do ponteiro: bem mais lenta que a da rolagem (110 ms), para pesar. */
const TAU_PONTEIRO_MS = 420;

export default function Profundidade({
  camadas,
  prioridade = false,
  rolagem = "propria",
  ancora = "50% 50%",
  className = "",
}: {
  camadas: CamadaProfundidade[];
  /** A imagem da primeira tela: carrega primeiro. */
  prioridade?: boolean;
  rolagem?: "propria" | "externa";
  /**
   * Ponto de contato da cena (transform-origin dos planos): onde o assunto
   * encosta no chão. Escalas diferentes giram em volta dele, então o banco
   * continua apoiado enquanto a parede se afasta do fundo.
   */
  ancora?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let visivel = true;
    // Ponteiro: alvo e valor suavizado, de -1 a 1.
    let ax = 0, ay = 0, mx = 0, my = 0;
    let escritoX = "", escritoY = "", escritoR = "";

    const escrever = (nome: string, valor: string, anterior: string) => {
      if (valor !== anterior) el.style.setProperty(nome, valor);
      return valor;
    };

    const assinante = {
      tick(dt: number) {
        if (rolagem === "propria" && visivel) {
          // Quanto a página já levou o topo do componente para cima, até uma tela.
          const topo = el.getBoundingClientRect().top;
          const y = Math.min(Math.max(-topo, 0), window.innerHeight);
          escritoR = escrever("--mv-ry", `${y.toFixed(1)}px`, escritoR);
        }
        mx = aproximar(mx, ax, dt, TAU_PONTEIRO_MS, 0.001);
        my = aproximar(my, ay, dt, TAU_PONTEIRO_MS, 0.001);
        escritoX = escrever("--mv-mx", mx.toFixed(4), escritoX);
        escritoY = escrever("--mv-my", my.toFixed(4), escritoY);
        return mx !== ax || my !== ay;
      },
    };

    const io = new IntersectionObserver((entradas) => {
      visivel = entradas[entradas.length - 1].isIntersecting;
      if (visivel) el.dataset.ativo = "";
      else {
        delete el.dataset.ativo;
        ax = 0;
        ay = 0;
      }
      relogio.acordar();
    });
    io.observe(el);

    // Ponteiro só com mouse ou trackpad, no nível completo, sem movimento
    // reduzido. O nível é lido a cada evento: o <Movimento /> o grava depois
    // da montagem, e as media queries ficam prontas aqui, uma vez.
    const fino = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mover = (e: PointerEvent) => {
      if (!visivel || e.pointerType !== "mouse") return;
      if (!fino.matches || reduzido.matches || document.documentElement.dataset.mvNivel !== "completo") return;
      ax = (e.clientX / window.innerWidth) * 2 - 1;
      ay = (e.clientY / window.innerHeight) * 2 - 1;
      relogio.acordar();
    };
    // Ponteiro saiu da janela: a cena volta ao centro, devagar.
    const sair = (e: PointerEvent) => {
      if (e.relatedTarget) return;
      ax = 0;
      ay = 0;
      relogio.acordar();
    };
    const acordar = () => relogio.acordar();

    const desassinar = relogio.assinar(assinante);
    window.addEventListener("pointermove", mover, { passive: true });
    document.addEventListener("pointerout", sair, { passive: true });
    if (rolagem === "propria") {
      window.addEventListener("scroll", acordar, { passive: true });
      window.addEventListener("resize", acordar);
    }
    return () => {
      desassinar();
      io.disconnect();
      delete el.dataset.ativo;
      window.removeEventListener("pointermove", mover);
      document.removeEventListener("pointerout", sair);
      window.removeEventListener("scroll", acordar);
      window.removeEventListener("resize", acordar);
    };
  }, [rolagem]);

  return (
    <div ref={ref} className={`mv-prof absolute inset-0 ${className}`} data-rolagem={rolagem}>
      {camadas.map((c, i) => (
        <div
          key={c.src}
          className="mv-camada absolute"
          // Sem versão de celular: o CSS some com o plano abaixo de 768 px, e a
          // fonte VAZIO garante que o arquivo de computador nem seja baixado.
          data-sem-celular={c.mobile === null ? "" : undefined}
          style={{ "--mv-f": c.fator, "--mv-k": c.ponteiro ?? 0, transformOrigin: ancora } as Vars}
        >
          <picture>
            {c.mobile !== undefined && <source media="(max-width: 767px)" srcSet={c.mobile ?? VAZIO} />}
            <img
              src={c.src}
              alt={c.alt}
              loading={prioridade ? "eager" : "lazy"}
              // Prioridade alta só para o primeiro plano (o fundo, que descreve
              // a cena); os outros vêm logo, sem disputar a banda com ele.
              fetchPriority={prioridade && i === 0 ? "high" : undefined}
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </picture>
        </div>
      ))}
    </div>
  );
}
