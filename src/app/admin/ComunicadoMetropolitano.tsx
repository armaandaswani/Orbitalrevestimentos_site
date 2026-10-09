"use client";

import { useState } from "react";
import { EMAIL_EMPRESA } from "@/lib/email-destinos";

/** Card da aba Campanhas: prévia e teste do comunicado do Núcleo Metropolitano. */
export default function ComunicadoMetropolitano() {
  const [estado, setEstado] = useState<"" | "enviando" | "ok" | "erro">("");
  const [msg, setMsg] = useState("");

  async function enviarTeste() {
    setEstado("enviando"); setMsg("");
    try {
      const r = await fetch("/api/admin/comunicados/metropolitano", { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `Erro ${r.status}`);
      setEstado("ok"); setMsg(`Teste enviado para ${j.to}.`);
    } catch (e) {
      setEstado("erro"); setMsg(e instanceof Error ? e.message : "Falha ao enviar.");
    }
  }

  return (
    <div className="bg-white border border-[#e2e2e2] px-5 sm:px-6 py-5 mb-6">
      <p className="text-[9px] uppercase tracking-widest font-bold text-[#74777f] mb-1">Comunicado · envio único</p>
      <p className="font-semibold text-[#0B1F45] text-sm mb-1">A Orbital agora faz parte do Núcleo Metropolitano</p>
      <p className="text-[#74777f] text-xs mb-4">
        Para arquitetos. O teste vai só para {EMAIL_EMPRESA}; o disparo para a lista ainda não está ativo.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <a
          href="/api/admin/comunicados/metropolitano"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto text-center border border-[#0B1F45] text-[#0B1F45] text-xs tracking-[0.12em] uppercase font-bold px-5 py-2.5 hover:bg-[#0B1F45] hover:text-white transition-colors"
        >
          Ver prévia
        </a>
        <button
          onClick={enviarTeste}
          disabled={estado === "enviando"}
          className="w-full sm:w-auto bg-[#0B1F45] text-white text-xs tracking-[0.12em] uppercase font-bold px-5 py-2.5 hover:bg-[#2347A0] transition-colors disabled:opacity-50"
        >
          {estado === "enviando" ? "Enviando..." : "Enviar teste"}
        </button>
      </div>
      {msg && <p className={`text-xs mt-3 ${estado === "erro" ? "text-[#b42318]" : "text-[#1F7A44]"}`}>{msg}</p>}
    </div>
  );
}
