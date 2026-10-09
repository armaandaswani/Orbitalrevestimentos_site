"use client";

import React, { useState } from "react";

export interface NovoParceiro {
  name: string;
  email: string;
  phone: string;
}

export const NOVO_PARCEIRO_VAZIO: NovoParceiro = { name: "", email: "", phone: "" };

export type ConviteResultado =
  | { ok: true; partner_id: string; name: string; reenviado: boolean; enviado: { email: boolean; whatsapp: boolean } }
  | { ok: false; error: string; partner_id?: string };

/** Cadastra o parceiro e manda o convite (e-mail + WhatsApp). */
export async function convidarParceiro(p: NovoParceiro): Promise<ConviteResultado> {
  try {
    const res = await fetch("/api/representante/partners/convite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    const j = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: j?.error || "Não foi possível cadastrar o parceiro.", partner_id: j?.partner_id };
    return { ok: true, partner_id: j.partner_id, name: j.name, reenviado: !!j.reenviado, enviado: j.enviado ?? { email: false, whatsapp: false } };
  } catch {
    return { ok: false, error: "Sem conexão. Tente de novo." };
  }
}

/** Texto curto do que saiu: "por e-mail e WhatsApp", "por e-mail", ... */
export function canaisEnviados(e: { email: boolean; whatsapp: boolean }) {
  if (e.email && e.whatsapp) return "por e-mail e WhatsApp";
  if (e.email) return "por e-mail (o WhatsApp não saiu)";
  if (e.whatsapp) return "por WhatsApp (o e-mail não saiu)";
  return "— mas o e-mail e o WhatsApp não saíram; avise a Orbital";
}

const labelCls = "block text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f] mb-1.5";
const inputCls = "w-full border border-[#e2e2e2] px-3 py-2.5 text-sm text-[#0B1F45] focus:outline-none focus:border-[#0B1F45] bg-white";

/** Campos nome / e-mail / WhatsApp do parceiro novo. */
export function CamposNovoParceiro({ value, onChange }: { value: NovoParceiro; onChange: (v: NovoParceiro) => void }) {
  return (
    <div className="grid sm:grid-cols-3 gap-3">
      <div>
        <label className={labelCls}>Nome do parceiro *</label>
        <input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="Nome completo" autoComplete="off" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>E-mail *</label>
        <input type="email" inputMode="email" value={value.email} onChange={(e) => onChange({ ...value, email: e.target.value })} placeholder="nome@email.com" autoComplete="off" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>WhatsApp *</label>
        <input type="tel" inputMode="tel" value={value.phone} onChange={(e) => onChange({ ...value, phone: e.target.value })} placeholder="(92) 99999-9999" autoComplete="off" className={inputCls} />
      </div>
    </div>
  );
}

export function validarNovoParceiro(p: NovoParceiro): string | null {
  if (p.name.trim().length < 2) return "Informe o nome do parceiro.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email.trim())) return "Informe um e-mail válido para o parceiro.";
  if (p.phone.replace(/\D/g, "").length < 10) return "Informe o WhatsApp do parceiro com DDD.";
  return null;
}

/** Botão + formulário para convidar um parceiro (aba "Meus parceiros"). */
export default function ConvidarParceiro({ onConvidado }: { onConvidado?: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [dados, setDados] = useState<NovoParceiro>({ ...NOVO_PARCEIRO_VAZIO });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const invalido = validarNovoParceiro(dados);
    if (invalido) { setErro(invalido); return; }
    setEnviando(true);
    setErro("");
    const r = await convidarParceiro(dados);
    setEnviando(false);
    if (!r.ok) { setErro(r.error); return; }
    setAviso(`${r.reenviado ? "Convite reenviado" : "Convite enviado"} para ${r.name} ${canaisEnviados(r.enviado)}.`);
    setDados({ ...NOVO_PARCEIRO_VAZIO });
    setAberto(false);
    onConvidado?.();
  }

  return (
    <div className="mb-6">
      {!aberto ? (
        <button
          type="button"
          onClick={() => { setAberto(true); setAviso(""); setErro(""); }}
          className="bg-[#0B1F45] text-white text-xs tracking-[0.1em] uppercase font-bold px-5 py-2.5 hover:bg-[#2347A0] transition-colors"
        >
          + Convidar parceiro
        </button>
      ) : (
        <form onSubmit={enviar} className="bg-white border border-[#e2e2e2] px-4 sm:px-6 py-5 space-y-4">
          <div>
            <p className="text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f]">Convidar parceiro</p>
            <p className="text-xs text-[#74777f] mt-1">
              Ele recebe o link por e-mail e WhatsApp, aceita, cria a senha e já entra no portal.
            </p>
          </div>
          <CamposNovoParceiro value={dados} onChange={setDados} />
          {erro && <p className="text-red-600 text-sm">{erro}</p>}
          <div className="flex flex-wrap gap-3 items-center">
            <button type="submit" disabled={enviando}
              className="bg-[#0B1F45] text-white text-xs tracking-[0.1em] uppercase font-bold px-5 py-2.5 hover:bg-[#2347A0] transition-colors disabled:opacity-50">
              {enviando ? "Enviando..." : "Cadastrar e enviar convite"}
            </button>
            <button type="button" onClick={() => setAberto(false)} className="text-[#74777f] text-sm hover:text-[#0B1F45]">
              Cancelar
            </button>
          </div>
        </form>
      )}
      {aviso && <p className="mt-3 text-sm text-green-700">✓ {aviso}</p>}
    </div>
  );
}
