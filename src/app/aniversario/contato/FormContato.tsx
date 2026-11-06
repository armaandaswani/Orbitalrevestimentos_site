"use client";

import { useState } from "react";
import { linkBusca } from "@/lib/aniversarios";

const campo = "w-full min-h-12 border border-outline-variant bg-white px-3 text-base text-on-surface focus:outline-none focus:border-primary";

export default function FormContato(p: { nome: string; instagram: string; confirmado: boolean; whatsapp: string }) {
  const [instagram, setInstagram] = useState(p.instagram ? `@${p.instagram}` : "");
  const [confirmado, setConfirmado] = useState(p.confirmado || !p.instagram);
  const [whatsapp, setWhatsapp] = useState(p.whatsapp);
  const [estado, setEstado] = useState<"" | "salvando" | "salvo">("");
  const [erro, setErro] = useState("");
  const handle = instagram.replace(/^@+/, "").trim();

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setEstado("salvando");
    setErro("");
    const res = await fetch("/api/aniversario/contato", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instagram, instagram_confirmado: confirmado, whatsapp }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) {
      setErro(json.error || "Não foi possível salvar. Tente de novo.");
      setEstado("");
      return;
    }
    setEstado("salvo");
  }

  return (
    <form onSubmit={salvar} className="mt-8 flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="ig" className="text-sm font-semibold text-on-surface">Instagram</label>
        <input id="ig" className={campo} value={instagram} onChange={(e) => { setInstagram(e.target.value); setEstado(""); }} placeholder="@perfil" autoCapitalize="none" autoCorrect="off" inputMode="url" />
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {handle && <a href={`https://instagram.com/${encodeURIComponent(handle)}`} target="_blank" rel="noopener noreferrer" className="text-[#2347A0] underline min-h-11 inline-flex items-center">Abrir o perfil</a>}
          <a href={linkBusca({ nome: p.nome, detalhe: "" }, "instagram")} target="_blank" rel="noopener noreferrer" className="text-[#2347A0] underline min-h-11 inline-flex items-center">Buscar no Google</a>
        </div>
        {handle && (
          <label className="flex items-center gap-3 min-h-11 text-sm text-on-surface">
            <input type="checkbox" className="w-5 h-5" checked={confirmado} onChange={(e) => { setConfirmado(e.target.checked); setEstado(""); }} />
            É este o perfil da pessoa (confirmado)
          </label>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="wa" className="text-sm font-semibold text-on-surface">WhatsApp</label>
        <input id="wa" className={campo} value={whatsapp} onChange={(e) => { setWhatsapp(e.target.value); setEstado(""); }} placeholder="(92) 99999-9999" inputMode="tel" autoComplete="off" />
      </div>

      {erro && <p className="text-sm text-[#b3261e]">{erro}</p>}
      <button type="submit" disabled={estado === "salvando"} className="w-full min-h-12 bg-primary text-white font-semibold disabled:opacity-60">
        {estado === "salvando" ? "Salvando…" : estado === "salvo" ? "Salvo ✓" : "Salvar"}
      </button>
    </form>
  );
}
