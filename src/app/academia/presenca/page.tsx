import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase";
import { tokenPresencaValido } from "@/lib/academia-status";
import RespostaPresenca from "./RespostaPresenca";

/**
 * Link pessoal de confirmação de presença da formação (vai no WhatsApp/e-mail
 * uma semana antes). Sem login: a assinatura do link identifica a inscrição.
 */

export const metadata: Metadata = {
  title: "Confirmação de presença — Academia Orbital",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Params = Promise<{ [k: string]: string | string[] | undefined }>;

async function carregar(id: string): Promise<{ nome: string; presenca: "sim" | "nao" | null } | null> {
  if (id === "teste") return { nome: "Orbital", presenca: null };
  try {
    const { data, error } = await supabaseAdmin()
      .from("academy_waitlist")
      .select("name, presenca")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return { nome: (data.name ?? "").trim().split(/\s+/)[0] ?? "", presenca: data.presenca === "sim" || data.presenca === "nao" ? data.presenca : null };
  } catch {
    return null;
  }
}

export default async function PresencaPage({ searchParams }: { searchParams: Params }) {
  const sp = await searchParams;
  const id = typeof sp.i === "string" ? sp.i : "";
  const token = typeof sp.t === "string" ? sp.t : "";
  const inscricao = tokenPresencaValido(id, token) ? await carregar(id) : null;

  return (
    <div className="pt-20 min-h-[80vh] bg-[#0B1F45] text-white">
      <div className="max-w-lg mx-auto px-4 py-14 lg:py-24">
        <p className="text-[11px] tracking-[0.22em] uppercase font-bold text-[#36A35C] mb-4">
          Academia Orbital · Formação
        </p>
        {inscricao ? (
          <RespostaPresenca id={id} token={token} nome={inscricao.nome} inicial={inscricao.presenca} />
        ) : (
          <>
            <h1 className="text-3xl font-extrabold uppercase tracking-tight mb-4">Link inválido</h1>
            <p className="text-white/70 leading-relaxed">
              Não encontramos esta inscrição. Confirme a sua presença falando com a Orbital pelo{" "}
              <a href="https://wa.me/5592988150149" className="text-[#36A35C] underline">WhatsApp (92) 98815-0149</a>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
