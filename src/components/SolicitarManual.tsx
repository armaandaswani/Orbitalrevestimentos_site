"use client";

import { useEffect, useState } from "react";

/**
 * Manual Técnico de Instalação — sem download direto (decisão do dono, out/2026).
 * O visitante diz quem é (arquiteto, proprietário, instalador ou outro) e cai
 * no WhatsApp da Orbital com a mensagem "Solicitar manual" pronta.
 *
 * variant "card": o bloco da página Tecnologia. "link": o link dentro do texto.
 */

const WHATSAPP = "5592988150149";
const PERFIS = ["Arquiteto(a)", "Proprietário(a)", "Instalador(a)", "Outro"] as const;
type Perfil = (typeof PERFIS)[number];

export default function SolicitarManual({ variant = "card" }: { variant?: "card" | "link" }) {
  const [aberto, setAberto] = useState(false);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [outro, setOutro] = useState("");

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberto]);

  const quem = perfil === "Outro" ? outro.trim() : perfil;
  const pronto = !!quem;
  const mensagem = `Olá! Gostaria de solicitar o Manual Técnico de Instalação do Painel Flexível Fibra de Bambu (PFB). Sou ${quem ?? ""}.`;
  const href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensagem)}`;

  const abrir = () => { setPerfil(null); setOutro(""); setAberto(true); };

  return (
    <>
      {variant === "card" ? (
        <button
          type="button"
          onClick={abrir}
          className="mt-6 lg:mt-8 w-full text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#2347A0] px-5 py-4 hover:bg-[#2347A0]/40 transition-colors group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 w-8 h-8 bg-[#2347A0] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#36A35C" strokeWidth="2" aria-hidden="true">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <path d="M14 2v6h6M8 13h8M8 17h5" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[#36A35C] text-[9px] tracking-[0.2em] uppercase font-bold">Orbital + Werk Engenharia</p>
              <p className="text-white text-sm font-semibold mt-0.5">Manual Técnico de Instalação</p>
              <p className="text-[#B4BBC8] text-[11px] mt-0.5">Paredes, portas, banheiros, box, curvas, forros e tetos · enviado pelo WhatsApp</p>
            </div>
          </div>
          <span className="flex-shrink-0 w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-[10px] tracking-[0.12em] uppercase font-bold text-white border border-[#B4BBC8]/50 group-hover:border-white px-3 py-2.5 sm:py-2 transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Solicitar manual
          </span>
        </button>
      ) : (
        <button type="button" onClick={abrir} className="text-white underline not-italic">
          Manual Técnico de Instalação
        </button>
      )}

      {aberto && (
        <div
          className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4"
          onClick={() => setAberto(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="solicitar-manual-titulo"
        >
          <div className="bg-white w-full sm:max-w-md p-6 sm:p-8 text-left not-italic" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 mb-1">
              <p id="solicitar-manual-titulo" className="text-[#0B1F45] text-lg font-semibold">Solicitar o manual</p>
              <button type="button" onClick={() => setAberto(false)} aria-label="Fechar" className="text-[#74777f] hover:text-[#0B1F45] text-xl leading-none">×</button>
            </div>
            <p className="text-[#74777f] text-sm mb-5">Enviamos o Manual Técnico de Instalação pelo WhatsApp. Você é:</p>
            <div className="grid grid-cols-2 gap-2">
              {PERFIS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPerfil(p)}
                  className={`px-3 py-3 text-sm font-semibold border transition-colors ${
                    perfil === p ? "bg-[#0B1F45] border-[#0B1F45] text-white" : "border-[#e2e2e2] text-[#0B1F45] hover:border-[#0B1F45]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            {perfil === "Outro" && (
              <input
                type="text"
                value={outro}
                onChange={(e) => setOutro(e.target.value)}
                placeholder="Ex.: engenheiro(a), designer, construtora…"
                maxLength={60}
                autoFocus
                className="mt-3 w-full border border-[#e2e2e2] px-3 py-3 text-sm text-[#0B1F45] focus:outline-none focus:border-[#0B1F45]"
              />
            )}
            <a
              href={pronto ? href : undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!pronto}
              onClick={(e) => { if (!pronto) e.preventDefault(); else setAberto(false); }}
              className={`mt-5 w-full inline-flex items-center justify-center gap-2 text-xs tracking-[0.12em] uppercase font-bold px-6 py-4 transition-colors ${
                pronto ? "bg-[#36A35C] text-[#0B1F45] hover:bg-[#4BB571]" : "bg-[#e2e2e2] text-[#74777f] cursor-not-allowed"
              }`}
            >
              Solicitar pelo WhatsApp
            </a>
          </div>
        </div>
      )}
    </>
  );
}
