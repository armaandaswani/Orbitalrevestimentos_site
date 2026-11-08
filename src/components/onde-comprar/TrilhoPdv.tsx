"use client";

import { Children, useEffect, useRef, useState } from "react";

/**
 * As lojas de /onde-comprar como trilho (v2, 08/11/2026). No celular, um cartão
 * por vez em largura cheia, com encaixe e marcador de posição, e o cartão na
 * tela acende o seu pino no mapa (`data-pdv-foco` no `[data-pdv-pino]` da
 * loja). No computador a lista é vertical e o pino acende quando o mouse ou o
 * foco passa pela linha da loja.
 *
 * A loja do cartão é lida do `data-loja` do `li`; a posição vem da ordem na tela
 * (`offsetLeft`), porque com `?loja=` a loja pedida vem primeiro por `order`
 * (SCRIPT_ABERTURA_PDV). Os pontos são só marcador (aria-hidden). Sem
 * JavaScript, a lista rola de lado e cada cartão mostra o endereço, o horário e
 * os botões (`.pdv-sem-js`, globals.css).
 */
export default function TrilhoPdv({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  const n = Children.count(children);
  const [ativo, setAtivo] = useState(0);

  useEffect(() => {
    const ul = ref.current;
    if (!ul) return;
    const acender = (slug: string | null) => {
      document.querySelectorAll<HTMLElement>("[data-pdv-pino]").forEach((p) => p.toggleAttribute("data-pdv-foco", slug !== null && p.dataset.pdvPino === slug));
    };
    const itens = () => [...ul.querySelectorAll<HTMLLIElement>(":scope > li")].sort((a, b) => a.offsetLeft - b.offsetLeft);
    const celular = window.matchMedia("(max-width: 63.99rem)");
    let obs: IntersectionObserver | null = null;

    const ligarCelular = () => {
      obs = new IntersectionObserver(
        (entradas) => {
          for (const e of entradas) {
            if (!e.isIntersecting) continue;
            const li = e.target as HTMLLIElement;
            setAtivo(Math.max(0, itens().indexOf(li)));
            acender(li.dataset.loja ?? null);
          }
        },
        { root: ul, threshold: 0.6 },
      );
      ul.querySelectorAll(":scope > li").forEach((li) => obs?.observe(li));
    };
    const sobre = (e: Event) => {
      const li = (e.target as Element | null)?.closest?.<HTMLLIElement>("li[data-loja]");
      if (li) acender(li.dataset.loja ?? null);
    };
    const fora = () => acender(null);
    const ligar = () => {
      obs?.disconnect();
      obs = null;
      ul.removeEventListener("pointerover", sobre);
      ul.removeEventListener("focusin", sobre);
      ul.removeEventListener("pointerleave", fora);
      ul.removeEventListener("focusout", fora);
      acender(null);
      if (celular.matches) ligarCelular();
      else {
        ul.addEventListener("pointerover", sobre);
        ul.addEventListener("focusin", sobre);
        ul.addEventListener("pointerleave", fora);
        ul.addEventListener("focusout", fora);
      }
    };
    ligar();
    celular.addEventListener("change", ligar);
    return () => {
      celular.removeEventListener("change", ligar);
      obs?.disconnect();
      ul.removeEventListener("pointerover", sobre);
      ul.removeEventListener("focusin", sobre);
      ul.removeEventListener("pointerleave", fora);
      ul.removeEventListener("focusout", fora);
      acender(null);
    };
  }, []);

  return (
    <div>
      <ul ref={ref} aria-label={rotulo} tabIndex={0} className="pdv-trilho list-none">
        {children}
      </ul>
      {n > 1 && (
        <div aria-hidden="true" className="pfb-pontos lg:hidden">
          {Array.from({ length: n }, (_, i) => (
            <span key={i} data-ativo={i === ativo ? "" : undefined} />
          ))}
        </div>
      )}
    </div>
  );
}
