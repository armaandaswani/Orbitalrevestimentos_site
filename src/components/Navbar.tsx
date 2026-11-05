"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ContatoCta from "@/components/ContatoCta";
import { LINHAS, SITUACAO_ROTULO } from "@/lib/linhas";

const CATALOGUE_URL =
  "https://drive.google.com/file/d/1zhm5MgKGSDRThqk8FqqwfX-WijI7K-iD/view?usp=drive_link";

/**
 * Cabeçalho do site. A ordem segue a apresentação: produtos → tecnologia →
 * projetos (obras e showrooms) → parcerias → simulador. O caminho comercial
 * ("Falar com um consultor") abre o pré-contato, nunca um link cru.
 *
 * Ao descer a página o cabeçalho se recolhe (só transform) e volta assim que
 * o visitante sobe — a apresentação ganha a tela inteira. Com o menu do
 * celular aberto, nunca se recolhe. `data-site` marca a página pública (a
 * escala de telas grandes em globals.css depende disso).
 */
const navLinks = [
  { href: "/produtos", label: "Produtos" },
  { href: "/tecnologia", label: "Tecnologia" },
  { href: "/projetos", label: "Projetos" },
  { href: "/parcerias", label: "Parcerias" },
  { href: "/visualizador", label: "Simulador" },
  // Sem "Orçamentos": o cliente escolhe o produto e fala com um consultor
  // dentro dele. O orçamento instantâneo (/simulador) segue no ar, só fora
  // da navegação.
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [oculto, setOculto] = useState(false);
  const botao = useRef<HTMLButtonElement>(null);
  const ativo = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  // Páginas de linha fora de /produtos (ex.: /techstone) também acendem "Produtos".
  const emLinha = LINHAS.some((l) => l.href && !l.href.startsWith("/produtos") && ativo(l.href));

  // Recolhe ao descer, volta ao subir. Escreve estado só quando muda.
  useEffect(() => {
    let ultimo = window.scrollY;
    let raf = 0;
    const medir = () => {
      raf = 0;
      const y = window.scrollY;
      const desceu = y > ultimo + 4;
      const subiu = y < ultimo - 4;
      // 160 e 80: visualizador/VizShell.tsx › rolarParaTopo prevê esta regra.
      if (desceu && y > 160) setOculto(true);
      else if (subiu || y <= 80) setOculto(false);
      ultimo = y;
    };
    const pedir = () => { if (!raf) raf = requestAnimationFrame(medir); };
    window.addEventListener("scroll", pedir, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", pedir); };
  }, []);

  // Menu do celular: trocar de página fecha (ajuste durante o render, sem efeito); Esc fecha.
  const [caminhoAnterior, setCaminhoAnterior] = useState(pathname);
  if (caminhoAnterior !== pathname) { setCaminhoAnterior(pathname); setMobileOpen(false); }
  useEffect(() => {
    if (!mobileOpen) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") { setMobileOpen(false); botao.current?.focus(); } };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [mobileOpen]);

  const link = "text-xs tracking-[0.1em] uppercase font-semibold whitespace-nowrap transition-colors duration-200";

  return (
    // Nome próprio de view transition: na troca de página o cabeçalho fica
    // parado (globals.css › cabecalho) enquanto só o conteúdo se move.
    <header data-site data-oculto={oculto && !mobileOpen ? "1" : undefined}
      style={{ viewTransitionName: "cabecalho" }}
      className="mv-cabecalho fixed top-0 w-full z-50 bg-white/95 backdrop-blur-sm border-b border-[#e8e8e8]">
      <div className="grid grid-cols-[auto_1fr_auto] items-center h-20 px-4 sm:px-8 xl:px-12 max-w-[90rem] mx-auto gap-x-6 min-[1400px]:gap-x-10">
        {/* Assinatura — terço esquerdo */}
        <div className="flex items-center">
          <Link href="/" aria-label="Orbital Revestimentos — início" className="block shrink-0 py-2.5">
            {/* Assinatura horizontal oficial (manual da marca). 40px de altura =
                128px de largura, acima do mínimo de 120px; o py-2.5 é a área de
                proteção (¼ da altura do globo). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/brand/orbital-assinatura.svg" alt="Orbital Revestimentos" width={128} height={40} className="h-10 w-auto max-w-none" />
          </Link>
        </div>

        {/* Navegação — terço central (computador) */}
        <nav aria-label="Principal" className="hidden xl:flex items-center justify-center gap-6 min-[1400px]:gap-9">
          {navLinks.map(({ href, label }) => {
            const item = (
              <Link key={label} href={href} aria-current={ativo(href) ? "page" : undefined}
                className={`${link} inline-flex items-center min-h-11 border-b ${ativo(href) || (href === "/produtos" && emLinha) ? "text-[#0B1F45] border-[#0B1F45]" : "text-[#74777f] border-transparent hover:text-[#0B1F45]"}`}>
                {label}
              </Link>
            );
            if (href !== "/produtos") return item;
            // Produtos abre as linhas ao passar o mouse ou focar pelo teclado;
            // o clique continua levando à vitrine.
            return (
              <div key={label} className="relative group">
                {item}
                <div className="absolute left-1/2 top-full -translate-x-1/2 pt-3 invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 transition-opacity duration-150">
                  <ul className="w-72 bg-white border border-[#e8e8e8] py-2">
                    {LINHAS.map((l) => (
                      <li key={l.slug}>
                        {l.href ? (
                          <Link href={l.href} className="flex items-baseline justify-between gap-4 px-5 py-3 hover:bg-[#F6F5F2]">
                            <span className="font-serif text-[#0B1F45]">{l.curto}</span>
                            <span className="text-sobre text-[#74777f]">{SITUACAO_ROTULO[l.situacao]}</span>
                          </Link>
                        ) : (
                          <span className="flex items-baseline justify-between gap-4 px-5 py-3">
                            <span className="font-serif text-[#0B1F45]/60">{l.curto}</span>
                            <span className="text-sobre text-[#74777f]">{SITUACAO_ROTULO[l.situacao]}</span>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Ações — terço direito (computador) */}
        <div className="hidden xl:flex items-center justify-end gap-2 min-[1400px]:gap-3">
          <Link href="/parceiro" className={`${link} inline-flex items-center min-h-11 px-3 text-[#74777f] hover:text-[#0B1F45]`}>
            Portal Parceiro
          </Link>
          <a href={CATALOGUE_URL} target="_blank" rel="noopener noreferrer"
            className={`${link} inline-flex items-center gap-1.5 min-h-11 px-4 border border-[#e2e2e2] text-[#0B1F45] hover:border-[#0B1F45] transition-colors`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Catálogo
          </a>
          <ContatoCta className={`${link} inline-flex items-center min-h-11 px-5 bg-[#0B1F45] text-white hover:bg-[#2347A0]`}>
            Falar com um consultor
          </ContatoCta>
        </div>

        {/* Botão do menu (celular e tablet) */}
        <div className="xl:hidden flex justify-end">
          <button ref={botao} type="button" onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen} aria-controls="menu-site" aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            className="w-11 h-11 -mr-2 flex items-center justify-center text-[#0B1F45]">
            {mobileOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M18 6L6 18M6 6l12 12" /></svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M3 12h18M3 6h18M3 18h18" /></svg>
            )}
          </button>
        </div>
      </div>

      {/* Menu do celular: lista de 44 px por linha, rola se a tela for baixa. */}
      <div id="menu-site" hidden={!mobileOpen}
        className="xl:hidden bg-white border-t border-[#e8e8e8] max-h-[calc(100dvh-5rem)] overflow-y-auto ds-folha-rola">
        <nav aria-label="Principal" className="px-4 sm:px-8 py-3 flex flex-col">
          {[{ href: "/", label: "Início" }, ...navLinks, { href: "/parceiro", label: "Portal Parceiro" }].map(({ href, label }) => (
            <div key={label}>
              <Link href={href} onClick={() => setMobileOpen(false)}
                aria-current={href === "/" ? (pathname === "/" ? "page" : undefined) : ativo(href) ? "page" : undefined}
                className={`${link} flex items-center min-h-12 border-b border-[#f0f0f0] ${(href === "/" ? pathname === "/" : ativo(href)) ? "text-[#0B1F45]" : "text-[#43474e]"}`}>
                {label}
              </Link>
              {href === "/produtos" && LINHAS.filter((l) => l.href).map((l) => (
                <Link key={l.slug} href={l.href} onClick={() => setMobileOpen(false)}
                  aria-current={ativo(l.href) ? "page" : undefined}
                  className={`flex items-center justify-between gap-4 min-h-12 pl-4 border-b border-[#f0f0f0] font-serif ${ativo(l.href) ? "text-[#0B1F45]" : "text-[#43474e]"}`}>
                  {l.curto}
                  <span className="font-sans text-sobre text-[#74777f]">{SITUACAO_ROTULO[l.situacao]}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="px-4 sm:px-8 pb-5 flex flex-col sm:flex-row gap-2">
          <ContatoCta onClick={() => setMobileOpen(false)} className="ds-botao ds-botao-cheio w-full sm:w-auto">
            Falar com um consultor
          </ContatoCta>
          <a href={CATALOGUE_URL} target="_blank" rel="noopener noreferrer" className="ds-botao ds-botao-vazado w-full sm:w-auto">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Baixar catálogo
          </a>
        </div>
        <p className="px-4 sm:px-8 pb-5 font-serif italic text-[#0B1F45]/70 text-legenda">Novas possibilidades para seus projetos.</p>
      </div>
    </header>
  );
}
