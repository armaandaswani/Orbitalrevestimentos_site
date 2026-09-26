"use client";

import { useState } from "react";
import { ATUACOES, EXPERIENCIAS, FOCOS } from "@/lib/academia-waitlist";

const labelCls =
  "block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2";
const inputCls =
  "w-full border border-[#e2e2e2] bg-white px-4 py-3 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] placeholder-[#b0b4bc]";
/** Mesma caixa dos inputs, com a seta desenhada — o select nativo destoa do resto. */
const selectCls = `${inputCls} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2374777f%22 stroke-width=%222%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-no-repeat bg-[position:right_1rem_center] pr-10`;

/** (92) 9 0000-0000 — só formata o que foi digitado, nunca bloqueia. */
function mascaraWhats(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 3) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`;
}

const VAZIO = {
  name: "", phone: "", email: "", city: "",
  role: "", role_other: "",
  main_focus: "", main_focus_other: "",
  years_experience: "",
};

export default function ListaEsperaForm() {
  const [form, setForm] = useState(VAZIO);
  // Campo-isca: fica fora da tela. Pessoa não vê, robô preenche.
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const set = (campo: keyof typeof VAZIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }));

  /**
   * De onde a pessoa veio (campanha ou site anterior) — ajuda a saber qual canal
   * enche a lista. Lido na hora do envio, e não guardado num efeito: não há nada
   * a renderizar com isso.
   */
  function origem(): string {
    const p = new URLSearchParams(window.location.search);
    const utm = [p.get("utm_source"), p.get("utm_medium"), p.get("utm_campaign")].filter(Boolean).join(" / ");
    if (utm) return utm;
    try {
      const r = document.referrer ? new URL(document.referrer) : null;
      if (r && r.host !== window.location.host) return r.host;
    } catch {}
    return "";
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/academia/lista-espera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, website, source: origem() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Não foi possível concluir o cadastro. Tente novamente.");
        return;
      }
      setDone(true);
    } catch {
      setError("Sem conexão. Verifique a internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="bg-white border border-[#e2e2e2] px-6 py-10 lg:px-10 lg:py-14" role="status" aria-live="polite">
        <div className="w-11 h-11 bg-[#002045] flex items-center justify-center mb-6">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a1d494" strokeWidth="2.5" aria-hidden>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="font-serif text-[#002045] text-2xl lg:text-3xl font-normal mb-3">
          Cadastro realizado.
        </p>
        <p className="text-[#43474e] text-sm lg:text-base font-[var(--font-inter)] leading-relaxed max-w-md">
          Você agora faz parte da lista de espera da Academia Orbital. Quando tivermos novidades sobre a
          abertura do treinamento, entraremos em contato.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="relative bg-white border border-[#e2e2e2] p-5 lg:p-8">
      {/* Nome e WhatsApp primeiro: é por eles que a Orbital vai chamar. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="ae-nome" className={labelCls}>Nome</label>
          <input
            id="ae-nome" required autoComplete="name"
            value={form.name} onChange={set("name")}
            className={inputCls} placeholder="Seu nome completo"
          />
        </div>
        <div>
          <label htmlFor="ae-whats" className={labelCls}>WhatsApp</label>
          <input
            id="ae-whats" required type="tel" inputMode="tel" autoComplete="tel"
            value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: mascaraWhats(e.target.value) }))}
            className={inputCls} placeholder="(92) 9 0000-0000"
          />
        </div>
        <div>
          <label htmlFor="ae-email" className={labelCls}>
            E-mail <span className="normal-case tracking-normal font-normal text-[#b0b4bc]">(opcional)</span>
          </label>
          <input
            id="ae-email" type="email" inputMode="email" autoComplete="email"
            value={form.email} onChange={set("email")}
            className={inputCls} placeholder="seu@email.com"
          />
        </div>
        <div>
          <label htmlFor="ae-cidade" className={labelCls}>Cidade</label>
          <input
            id="ae-cidade" required autoComplete="address-level2"
            value={form.city} onChange={set("city")}
            className={inputCls} placeholder="Ex.: Manaus"
          />
        </div>

        <div>
          <label htmlFor="ae-atuacao" className={labelCls}>Atuação profissional</label>
          <select
            id="ae-atuacao" required value={form.role} onChange={set("role")}
            className={`${selectCls} ${form.role ? "" : "text-[#b0b4bc]"}`}
          >
            <option value="" disabled>Selecione</option>
            {ATUACOES.map((o) => <option key={o.value} value={o.value} className="text-[#002045]">{o.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="ae-anos" className={labelCls}>Tempo de profissão</label>
          <select
            id="ae-anos" required value={form.years_experience} onChange={set("years_experience")}
            className={`${selectCls} ${form.years_experience ? "" : "text-[#b0b4bc]"}`}
          >
            <option value="" disabled>Selecione</option>
            {EXPERIENCIAS.map((o) => <option key={o.value} value={o.value} className="text-[#002045]">{o.label}</option>)}
          </select>
        </div>
        {form.role === "outro" && (
          <div className="sm:col-span-2">
            <label htmlFor="ae-atuacao-outro" className={labelCls}>Qual sua atuação?</label>
            <input
              id="ae-atuacao-outro" value={form.role_other} onChange={set("role_other")}
              className={inputCls} placeholder="Conte brevemente"
            />
          </div>
        )}

        <div className="sm:col-span-2">
          <label htmlFor="ae-foco" className={labelCls}>O que você mais instala ou aplica hoje?</label>
          <select
            id="ae-foco" required value={form.main_focus} onChange={set("main_focus")}
            className={`${selectCls} ${form.main_focus ? "" : "text-[#b0b4bc]"}`}
          >
            <option value="" disabled>Selecione seu principal foco</option>
            {FOCOS.map((o) => <option key={o.value} value={o.value} className="text-[#002045]">{o.label}</option>)}
          </select>
        </div>
        {form.main_focus === "outro" && (
          <div className="sm:col-span-2">
            <label htmlFor="ae-foco-outro" className={labelCls}>O que você instala?</label>
            <input
              id="ae-foco-outro" value={form.main_focus_other} onChange={set("main_focus_other")}
              className={inputCls} placeholder="Ex.: esquadrias, vidros, pisos vinílicos…"
            />
          </div>
        )}
      </div>

      {/* Campo-isca anti-robô. Fora da tela e fora da ordem de tabulação. */}
      <div aria-hidden className="absolute -left-[10000px] w-px h-px overflow-hidden">
        <label htmlFor="ae-site">Site</label>
        <input id="ae-site" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>

      {error && (
        <p className="text-[#b3261e] text-sm font-[var(--font-inter)] mb-4" role="alert">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#3b6934] text-white text-xs tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 hover:bg-[#2f5529] transition-colors disabled:opacity-50"
      >
        {loading ? "Enviando…" : "Quero entrar na lista"}
      </button>
      <p className="text-[#74777f] text-[11px] font-[var(--font-inter)] text-center mt-3 leading-relaxed">
        {/* "Cadastro gratuito", e não "sem custo": logo abaixo de um botão sobre o
            curso, "sem custo" seria lido como preço do treinamento — que não existe. */}
        Cadastro gratuito. Usamos seus dados apenas para avisar sobre a abertura da Academia Orbital.
      </p>
    </form>
  );
}
