"use client";

import { useEffect, useId, useRef, useState } from "react";
import { abrirParceiro, totalPerguntas, type PerfilParceiro } from "@/lib/parceiro-contato";
import { CHAMADA } from "@/lib/parcerias-textos";

/**
 * Chamada curta para o pré-contato de parceiros (ParceiroSheet), no lugar do
 * cadastro com senha: título, frase de apoio, "Copiar link" e um cartão com o
 * botão que abre as perguntas do perfil. Fica em /parcerias/marceneiros e
 * /engenheiros (#cadastro) e no fim de /onde-comprar (#quero-revender).
 *
 * O link copiado termina na âncora da seção (com o `?rep=` do representante,
 * quando houver) e abre a página com o pré-contato já aberto: na carga e
 * quando a âncora muda (o botão do topo da página aponta para ela).
 */

const ESTILO_BOTAO = "ds-botao ds-botao-cheio min-h-12 w-full justify-center active:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1F45]";

export default function ChamadaParceiro({ perfil, ancora, titulo = CHAMADA.titulo, apoio = CHAMADA.apoio, botao = CHAMADA.botao, claro = true, children }: {
  perfil: PerfilParceiro;
  /** id da seção: o link copiado termina em #ancora. */
  ancora: string;
  titulo?: string;
  apoio?: string;
  botao?: string;
  /** Fundo claro (padrão) ou transparente, quando a página já dá o fundo. */
  claro?: boolean;
  /** Conteúdo curto entre a frase de apoio e o "Copiar link" (os pontos da revenda). */
  children?: React.ReactNode;
}) {
  const id = useId();
  const botaoRef = useRef<HTMLButtonElement>(null);
  const [copia, setCopia] = useState<"" | "ok" | "manual">("");
  const [link, setLink] = useState("");
  const campoLink = useRef<HTMLInputElement>(null);
  const avisoCopia = useRef(0);

  useEffect(() => () => window.clearTimeout(avisoCopia.current), []);
  useEffect(() => { if (copia === "manual") campoLink.current?.select(); }, [copia]);

  // #ancora na URL (o link que o dono manda): abre o pré-contato direto.
  useEffect(() => {
    const ver = () => { if (window.location.hash === `#${ancora}`) abrirParceiro(perfil, botaoRef.current); };
    const raf = requestAnimationFrame(ver);
    window.addEventListener("hashchange", ver);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("hashchange", ver); };
  }, [ancora, perfil]);

  async function copiarLink() {
    const u = new URL(window.location.href);
    const rep = u.searchParams.get("rep");
    const endereco = `${u.origin}${u.pathname}${rep ? `?rep=${encodeURIComponent(rep)}` : ""}#${ancora}`;
    window.clearTimeout(avisoCopia.current);
    try {
      await navigator.clipboard.writeText(endereco);
      setCopia("ok");
      avisoCopia.current = window.setTimeout(() => setCopia(""), 2200);
    } catch {
      // Sem acesso à área de transferência: mostra o link já selecionado para copiar à mão.
      setLink(endereco);
      setCopia("manual");
    }
  }

  return (
    <section id={ancora} aria-labelledby={`${id}-titulo`} className={`scroll-mt-20 ${claro ? "bg-[#F6F5F2]" : ""}`}>
      <div className="ds-wrap ds-secao grid gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-20 lg:items-start">
        <div>
          <h2 id={`${id}-titulo`} className="font-serif text-t1 text-[#0B1F45] text-balance max-w-[18ch]">{titulo}</h2>
          <p className="mt-4 text-lead text-[#43474e] max-w-[36ch]">{apoio}</p>
          {children}
          <button type="button" onClick={copiarLink} data-teste="copiar-link"
            className="mt-6 inline-flex items-center gap-2 min-h-11 text-legenda font-semibold text-[#0B1F45] underline underline-offset-4 decoration-[#0B1F45]/30 hover:decoration-[#0B1F45] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1F45]">
            <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07l-1.5 1.5M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07l1.5-1.5" />
            </svg>
            <span aria-live="polite">{copia === "ok" ? CHAMADA.copiado : CHAMADA.copiar}</span>
          </button>
          {copia === "manual" && (
            <div className="mt-2 max-w-[36ch]">
              <label htmlFor={`${id}-link`} className="block text-legenda text-[#43474e] mb-1.5">Copie o link abaixo</label>
              <input ref={campoLink} id={`${id}-link`} readOnly value={link} onFocus={(e) => e.currentTarget.select()}
                className="w-full border border-[#0B1F45]/20 bg-white px-4 py-3 text-legenda text-[#0B1F45] focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[#0B1F45]" />
            </div>
          )}
        </div>

        <div className="bg-white border border-[#0B1F45]/12 p-6 sm:p-8">
          <p className="font-serif text-t2 text-[#0B1F45]">{totalPerguntas(perfil)} {CHAMADA.perguntas}</p>
          <p className="mt-3 text-corpo text-[#43474e] max-w-[40ch]">{CHAMADA.cartao}</p>
          <button ref={botaoRef} type="button" data-teste="abrir-parceiro" onClick={(e) => abrirParceiro(perfil, e.currentTarget)} className={`mt-6 ${ESTILO_BOTAO}`}>
            {botao}
          </button>
        </div>
      </div>
    </section>
  );
}

/**
 * Botão solto que abre o pré-contato de um perfil (topo das páginas de
 * perfil, Academia). Com `href`, é um link para a âncora da chamada: sem
 * JavaScript, ao menos leva até ela.
 */
export function BotaoParceiro({ perfil, href, className, children }: { perfil: PerfilParceiro; href?: string; className?: string; children: React.ReactNode }) {
  if (href) {
    return (
      <a href={href} data-teste="abrir-parceiro" className={className}
        onClick={(e) => { e.preventDefault(); abrirParceiro(perfil, e.currentTarget); }}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" data-teste="abrir-parceiro" className={className} onClick={(e) => abrirParceiro(perfil, e.currentTarget)}>
      {children}
    </button>
  );
}
