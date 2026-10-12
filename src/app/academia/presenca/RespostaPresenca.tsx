"use client";

import { useState } from "react";

type Resposta = "sim" | "nao";

export default function RespostaPresenca({
  id, token, nome, inicial,
}: { id: string; token: string; nome: string; inicial: Resposta | null }) {
  const [resposta, setResposta] = useState<Resposta | null>(inicial);
  const [enviando, setEnviando] = useState<Resposta | null>(null);
  const [erro, setErro] = useState("");

  async function responder(r: Resposta) {
    setErro("");
    setEnviando(r);
    try {
      const res = await fetch("/api/academia/presenca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ i: id, t: token, resposta: r }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Não foi possível registrar. Tente de novo.");
      setResposta(r);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Sem conexão. Tente de novo.");
    } finally {
      setEnviando(null);
    }
  }

  const botao = "w-full min-h-14 px-6 py-4 text-sm tracking-[0.12em] uppercase font-extrabold transition-colors disabled:opacity-50";

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight leading-tight mb-4">
        {nome ? `${nome}, você vai ao workshop?` : "Você vai ao workshop?"}
      </h1>

      {resposta === "sim" && (
        <p className="bg-[#36A35C] text-[#0D1830] font-semibold px-5 py-4 mb-6" role="status">
          Presença confirmada. Nos vemos lá! Qualquer dúvida, é só chamar a Orbital no WhatsApp.
        </p>
      )}
      {resposta === "nao" && (
        <p className="bg-white/10 text-white px-5 py-4 mb-6" role="status">
          Obrigado por avisar — a sua vaga foi liberada para outro profissional. Quando abrirmos a próxima turma,
          você fica sabendo.
        </p>
      )}
      {!resposta && (
        <p className="text-white/70 leading-relaxed mb-8">
          As vagas são limitadíssimas. Se não puder ir, avise aqui: a sua vaga passa para outro profissional.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button" onClick={() => responder("sim")} disabled={!!enviando}
          className={`${botao} ${resposta === "sim" ? "bg-white text-[#0B1F45]" : "bg-[#36A35C] text-[#0D1830] hover:bg-[#4BB571]"}`}
        >
          {enviando === "sim" ? "Enviando…" : resposta === "sim" ? "✓ Vou" : "Vou"}
        </button>
        <button
          type="button" onClick={() => responder("nao")} disabled={!!enviando}
          className={`${botao} border ${resposta === "nao" ? "bg-white text-[#0B1F45] border-white" : "border-white/40 text-white hover:border-white"}`}
        >
          {enviando === "nao" ? "Enviando…" : resposta === "nao" ? "✓ Não vou" : "Não vou"}
        </button>
      </div>
      {resposta && <p className="text-white/50 text-xs mt-4">Mudou de ideia? Toque na outra opção.</p>}
      {erro && <p className="text-[#ffb4ab] text-sm mt-4" role="alert">{erro}</p>}
    </div>
  );
}
