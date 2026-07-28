"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NavIcon, NAV_GROUPS, NAV_LABELS, type AdminTab } from "./ui";

/**
 * Moldura do painel para as rotas próprias do módulo de Projetos
 * (/admin/projetos, /novo, /[id], /organizacao).
 *
 * A página /admin é uma SPA de abas; estas telas são rotas de verdade, então
 * precisam repetir duas coisas: a barra lateral (para o usuário não sentir que
 * saiu do sistema) e a verificação de sessão. A sessão é o mesmo cookie httpOnly
 * do resto do painel — aqui só perguntamos ao servidor se ele vale; quem protege
 * os dados é o isAdminRequest de cada rota de API, não esta checagem visual.
 */
export default function AdminShell({
  active = "projetos",
  breadcrumb,
  title,
  action,
  children,
}: {
  active?: AdminTab;
  /** Trilha acima do título, ex.: [{label:"Projetos", href:"/admin/projetos"}] */
  breadcrumb?: Array<{ label: string; href?: string }>;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/admin/login")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setAuthed(!!d?.authed))
      .catch(() => setAuthed(false));
  }, []);

  if (authed === null) {
    return (
      <div className="min-h-screen bg-[#f5f5f3] flex items-center justify-center">
        <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Carregando…</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#f5f5f3] flex items-center justify-center px-6">
        <div className="bg-white border border-[#e2e2e2] px-8 py-10 text-center max-w-sm">
          <p className="font-[var(--font-noto-serif)] text-[#002045] text-xl mb-2">Sessão encerrada</p>
          <p className="text-[#74777f] text-sm font-[var(--font-inter)] mb-6">Entre novamente para continuar.</p>
          <Link href="/admin" className="inline-block bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-5 py-2.5 hover:bg-[#1a365d] transition-colors">
            Ir para o login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f3] px-4 sm:px-6 py-6">
      <div className="max-w-[1400px] mx-auto flex gap-6">
        <aside className="hidden md:flex w-56 flex-shrink-0 md:sticky md:top-6 flex-col gap-5 max-h-[calc(100vh-3rem)] overflow-y-auto pr-1">
          <div className="px-3 pb-3 mb-1 border-b border-[#e2e2e2] flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#002045] text-white flex items-center justify-center font-[var(--font-noto-serif)] text-base flex-shrink-0">O</span>
            <div className="min-w-0">
              <p className="font-[var(--font-noto-serif)] text-[#002045] text-lg leading-none">Orbital</p>
              <p className="text-[9px] tracking-[0.22em] uppercase font-bold font-[var(--font-inter)] text-[#a0a3a8] mt-1">Sistema Interno</p>
            </div>
          </div>
          {NAV_GROUPS.map((sec) => (
            <div key={sec.group}>
              <p className="text-[9px] tracking-[0.2em] uppercase font-bold font-[var(--font-inter)] text-[#a0a3a8] px-3 mb-1.5">{sec.group}</p>
              <div className="flex flex-col gap-0.5">
                {sec.items.map((t) => {
                  const isActive = t === active;
                  return (
                    <Link
                      key={t}
                      href={t === "projetos" ? "/admin/projetos" : `/admin?tab=${t}`}
                      className={`group flex items-center gap-2.5 px-3 py-2 text-xs font-[var(--font-inter)] rounded-md text-left transition-colors ${isActive ? "bg-[#002045] text-white font-bold" : "text-[#43474e] hover:bg-[#eef0f3]"}`}
                    >
                      <NavIcon id={t} className={isActive ? "text-white" : "text-[#a0a3a8] group-hover:text-[#43474e]"} />
                      <span className="truncate flex-1">{NAV_LABELS[t]}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        <main className="flex-1 min-w-0 w-full">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
            <div className="min-w-0">
              {breadcrumb && breadcrumb.length > 0 && (
                <nav className="flex flex-wrap items-center gap-1.5 mb-1.5 text-[11px] font-[var(--font-inter)] text-[#74777f]">
                  {breadcrumb.map((b, i) => (
                    <span key={`${b.label}-${i}`} className="flex items-center gap-1.5">
                      {i > 0 && <span className="text-[#c4c6ca]">›</span>}
                      {b.href ? (
                        <Link href={b.href} className="hover:text-[#002045] transition-colors">{b.label}</Link>
                      ) : (
                        <span>{b.label}</span>
                      )}
                    </span>
                  ))}
                </nav>
              )}
              <h1 className="font-[var(--font-noto-serif)] text-[#002045] text-2xl sm:text-3xl font-normal">{title}</h1>
            </div>
            {action}
          </div>

          {/* Atalho de volta no mobile, onde a barra lateral não aparece. */}
          <Link href="/admin/projetos" className="md:hidden inline-flex items-center gap-1.5 mb-4 text-[11px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] hover:text-[#002045] transition-colors">
            ‹ Projetos
          </Link>

          {children}
        </main>
      </div>
    </div>
  );
}
