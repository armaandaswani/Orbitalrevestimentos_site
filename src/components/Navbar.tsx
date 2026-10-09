"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const CATALOGUE_URL =
  "https://drive.google.com/file/d/1zhm5MgKGSDRThqk8FqqwfX-WijI7K-iD/view?usp=drive_link";

const navLinks = [
  { href: "/", label: "Home" },
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

  return (
    <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-sm border-b border-[#e8e8e8] shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
      <div className="grid grid-cols-[auto_1fr_auto] items-center h-20 px-6 sm:px-8 xl:px-12 max-w-[1440px] mx-auto gap-x-10">
        {/* Logo — left third */}
        <div className="flex items-center">
          <Link
            href="/"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Orbital Revestimentos — início"
            className="block shrink-0 py-2.5"
          >
            {/* Assinatura horizontal oficial (manual da marca). 40px de altura =
                128px de largura, acima do mínimo de 120px; o py-2.5 é a área de
                proteção (¼ da altura do globo). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/brand/orbital-assinatura.svg"
              alt="Orbital Revestimentos"
              width={128}
              height={40}
              className="h-10 w-auto max-w-none"
            />
          </Link>
        </div>

        {/* Desktop Nav — center third */}
        <nav className="hidden xl:flex items-center justify-center gap-7 min-[1400px]:gap-10">
          {navLinks.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={label}
                href={href}
                className={`text-xs tracking-[0.1em] uppercase font-semibold whitespace-nowrap transition-colors duration-200 pb-0.5 ${
                  active
                    ? "text-[#0B1F45] border-b border-[#0B1F45]"
                    : "text-[#74777f] hover:text-[#0B1F45]"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right CTAs — right third */}
        <div className="hidden xl:flex items-center justify-end gap-3">
          <Link
            href="/parceiro"
            className="whitespace-nowrap text-xs tracking-[0.08em] uppercase font-semibold text-[#74777f] hover:text-[#0B1F45] transition-colors border border-[#e2e2e2] hover:border-[#0B1F45] px-4 py-2"
          >
            Portal Parceiro
          </Link>
          <a
            href={CATALOGUE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs tracking-[0.1em] uppercase font-semibold bg-[#0B1F45] text-white px-5 py-2.5 hover:bg-[#2347A0] transition-colors duration-200"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Baixar Catálogo
          </a>
        </div>

        {/* Mobile Hamburger — right third on mobile */}
        <div className="xl:hidden flex justify-end">
          <button
            className="p-2 text-[#0B1F45]"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            )}
          </button>
        </div>
      </div>{/* end grid */}

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="xl:hidden bg-white border-t border-[#e8e8e8] px-8 py-6 flex flex-col gap-5">
          {navLinks.map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`text-xs tracking-[0.1em] uppercase font-semibold ${
                pathname === href ? "text-[#0B1F45]" : "text-[#74777f]"
              }`}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/parceiro"
            onClick={() => setMobileOpen(false)}
            className="text-xs tracking-[0.08em] uppercase font-semibold text-[#74777f] border border-[#e2e2e2] px-4 py-2.5 self-start"
          >
            Portal Parceiro
          </Link>
          <a
            href={CATALOGUE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start inline-flex items-center gap-1.5 text-xs tracking-[0.1em] uppercase font-semibold bg-[#0B1F45] text-white px-5 py-2.5 mt-2"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Baixar Catálogo
          </a>
        </div>
      )}
    </header>
  );
}
