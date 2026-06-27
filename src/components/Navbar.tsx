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
  { href: "/simulador", label: "Orçamentos" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-sm border-b border-[#e8e8e8] shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
      <div className="grid grid-cols-[auto_1fr_auto] items-center h-20 px-8 lg:px-16 max-w-[1280px] mx-auto gap-x-8">
        {/* Logo — left third */}
        <div className="flex items-center">
          <Link
            href="/"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="text-xl font-bold tracking-[0.22em] text-[#002045] font-[var(--font-noto-serif)]"
          >
            ORBITAL
          </Link>
        </div>

        {/* Desktop Nav — center third */}
        <nav className="hidden md:flex items-center justify-center gap-6">
          {navLinks.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] transition-colors duration-200 pb-0.5 ${
                  active
                    ? "text-[#002045] border-b border-[#002045]"
                    : "text-[#74777f] hover:text-[#002045]"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right CTAs — right third */}
        <div className="hidden md:flex items-center justify-end gap-3">
          <Link
            href="/parceiro"
            className="text-xs tracking-[0.08em] uppercase font-semibold font-[var(--font-inter)] text-[#74777f] hover:text-[#002045] transition-colors border border-[#e2e2e2] hover:border-[#002045] px-4 py-2"
          >
            Portal Parceiro
          </Link>
          <a
            href={CATALOGUE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] bg-[#1a365d] text-white px-5 py-2.5 hover:bg-[#002045] transition-colors duration-200"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Baixar Catálogo
          </a>
        </div>

        {/* Mobile Hamburger — right third on mobile */}
        <div className="md:hidden flex justify-end">
          <button
            className="p-2 text-[#002045]"
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
        <div className="md:hidden bg-white border-t border-[#e8e8e8] px-8 py-6 flex flex-col gap-5">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] ${
                pathname === href ? "text-[#002045]" : "text-[#74777f]"
              }`}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/parceiro"
            onClick={() => setMobileOpen(false)}
            className="text-xs tracking-[0.08em] uppercase font-semibold font-[var(--font-inter)] text-[#74777f] border border-[#e2e2e2] px-4 py-2.5 self-start"
          >
            Portal Parceiro
          </Link>
          <a
            href={CATALOGUE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start inline-flex items-center gap-1.5 text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] bg-[#1a365d] text-white px-5 py-2.5 mt-2"
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
