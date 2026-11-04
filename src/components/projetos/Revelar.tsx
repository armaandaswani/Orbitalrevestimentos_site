"use client";

import { useEffect, useRef, useState } from "react";

/** Os três jeitos de entrar: o texto sobe, a foto se desvela, a lista surge. */
export type EfeitoRevelar = "sobe" | "desvela" | "surge";

/**
 * Entrada suave ao rolar. Três jeitos, para a página nunca repetir a mesma
 * entrada em toda seção:
 *
 * - `sobe` (padrão): o bloco sobe e aparece. Para títulos e listas de texto.
 * - `desvela`: o recorte abre de baixo para cima (12% do topo) enquanto a foto
 *   se acomoda de 1,06 a 1. Para quadros de foto; quanto mais baixo o nível
 *   de movimento, menos ela se acomoda.
 * - `surge`: só a opacidade. Para o que vem em volta e não deve chamar a vez.
 *
 * - Caminho principal só em CSS (`.mv-revelar*`, animation-timeline: view()):
 *   a animação segue a rolagem no compositor, sem JavaScript.
 * - Navegador sem animation-timeline: um IntersectionObserver faz o mesmo
 *   (classes `.mv-io-*`). O que já está na tela ao carregar não anima.
 * - Sem JavaScript, ou com movimento reduzido, nada fica escondido.
 * - Só opacidade, transform e clip-path: não mexe no layout (CLS 0).
 * - `ordem` escalona vizinhos (0, 1, 2…), como os cartões de uma linha.
 *   `atraso` (ms) continua aceito e vira uma ordem equivalente.
 * - O view() olha o ancestral que rola mais próximo. Dentro de um trilho que rola
 *   de lado ele não acompanharia a página: envolva o trilho inteiro, não cada cartão.
 */
export default function Revelar({
  children, ordem, atraso = 0, className = "", como: Tag = "div", id, efeito = "sobe", camada = false,
}: {
  children: React.ReactNode;
  ordem?: number;
  atraso?: number;
  className?: string;
  como?: "div" | "li" | "section" | "article" | "figure" | "header";
  id?: string;
  efeito?: EfeitoRevelar;
  /** Bloco alto (texto longo): pede a camada de composição antes da entrada. O `desvela` já pede. */
  camada?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const [estado, setEstado] = useState<"css" | "espera" | "entrou" | "feito">("css");
  const i = ordem ?? Math.round(atraso / 80);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof CSS !== "undefined" && CSS.supports?.("animation-timeline: view()")) return;
    const r = el.getBoundingClientRect();
    // Já visível ao carregar (ou acima, ao voltar na página): fica como está.
    if (r.top < window.innerHeight && r.bottom > 0) return;
    if (r.bottom <= 0) return;
    const obs = new IntersectionObserver((entradas) => {
      if (entradas.some((e) => e.isIntersecting)) { setEstado("entrou"); obs.disconnect(); }
    }, { rootMargin: "0px 0px -8% 0px" });
    // Esconde só agora, já fora da tela: o visitante nunca vê o "sumir".
    const t = setTimeout(() => { setEstado("espera"); obs.observe(el); }, 0);
    return () => { clearTimeout(t); obs.disconnect(); };
  }, []);

  // Camada só perto da faixa ativa: o `desvela` (e quem pede `camada`) ganha `data-ativo`
  // enquanto estiver dentro da janela abaixo, e o CSS liga o will-change só nela. Longe da
  // janela o atributo sai e a camada é devolvida. Sem animação por rolagem (ou com movimento
  // reduzido) não há o que dar de dica: não observa nada.
  // A janela é larga (6 alturas de tela para cada lado) de propósito. Por que uma camada
  // criada cedo ajuda não está confirmado: é uma hipótese (a camada de um bloco grande seria
  // cara de criar perto da hora de animar), e o mecanismo exato não foi encontrado. O que foi
  // medido, a 4× de CPU em /tecnologia: com 1 altura sobravam +3 quadros acima de 33 ms; com 3
  // sobrou +1 de forma consistente no iphone-se (1,1,1 contra 0,0,0, fora da variação do
  // gate); com 6 voltou ao nível de antes, e por isso 6 fica. Em página curta essa janela
  // cobre quase a página inteira, então ali a camada praticamente não é devolvida. Em página
  // longa ela some quando a página já passou.
  const querCamada = efeito === "desvela" || camada;
  useEffect(() => {
    const el = ref.current;
    if (!querCamada || !el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof CSS === "undefined" || !CSS.supports?.("animation-timeline: view()")) return;
    const obs = new IntersectionObserver((entradas) => {
      const e = entradas[entradas.length - 1];
      if (e) el.toggleAttribute("data-ativo", e.isIntersecting);
    }, { rootMargin: "600% 0px 600% 0px" });
    obs.observe(el);
    return () => { obs.disconnect(); el.removeAttribute("data-ativo"); };
  }, [querCamada]);

  // O recorte do `desvela` fica preso depois de entrar e cortaria o contorno de
  // foco e as sombras de quem está dentro: terminada a transição, a classe sai
  // (o visual é o mesmo) e o bloco volta a ser um bloco comum.
  // Quem avisa é o `transitionend` do clip-path. A rede de segurança (a transição pode
  // ser cancelada, ou o navegador não disparar o evento) usa a duração e o atraso que o
  // CSS de fato aplicou (--mv-lento e --mv-i), lidos do estilo calculado, sem número fixo.
  useEffect(() => {
    const el = ref.current;
    if (estado !== "entrou" || efeito !== "desvela" || !el) return;
    const fim = () => setEstado("feito");
    const aoTerminar = (e: TransitionEvent) => { if (e.target === el && e.propertyName === "clip-path") fim(); };
    el.addEventListener("transitionend", aoTerminar);
    const cs = getComputedStyle(el);
    const maior = (lista: string) => Math.max(0, ...lista.split(",").map((v) => (parseFloat(v) || 0) * (v.trim().endsWith("ms") ? 1 : 1000)));
    const t = setTimeout(fim, maior(cs.transitionDuration) + maior(cs.transitionDelay) + 150);
    return () => { el.removeEventListener("transitionend", aoTerminar); clearTimeout(t); };
  }, [estado, efeito]);

  const sufixo = efeito === "sobe" ? "" : `-${efeito}`;
  const classe =
    estado === "css" ? `mv-revelar${sufixo}`
    : estado === "espera" ? `mv-io-espera${sufixo}`
    : estado === "entrou" ? `mv-io-entrou${sufixo}`
    : "";
  return (
    <Tag
      ref={ref as React.Ref<never>}
      id={id}
      data-camada={camada ? "" : undefined}
      className={`${classe} ${className}`.trim()}
      style={i ? ({ "--mv-i": i } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
