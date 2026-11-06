import type { Metadata } from "next";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { COOKIE_CONTATO, lerTokenContato } from "@/lib/aniversario-link";
import { dataCurta } from "@/lib/aniversarios";
import FormContato from "./FormContato";

/**
 * Completar o contato de um aniversariante (link do e-mail diário): confirmar
 * o Instagram e adicionar o WhatsApp pelo celular, sem login no admin. Quem é
 * vem do cookie que /aniversario/<token> grava.
 */
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Contato do aniversariante",
  robots: { index: false, follow: false },
};

export default async function ContatoAniversarioPage() {
  const id = lerTokenContato((await cookies()).get(COOKIE_CONTATO)?.value);
  const { data: p } = id
    ? await supabaseAdmin().from("aniversarios").select("nome, profissao, escritorio, instagram, instagram_confirmado, whatsapp, dia, mes").eq("id", id).eq("ativo", true).maybeSingle()
    : { data: null };

  return (
    <div className="pt-28 pb-24 px-4">
      <div className="w-full max-w-md mx-auto">
        {p ? (
          <>
            <p className="text-sm text-on-surface-variant">Aniversário em {dataCurta(p.dia, p.mes)}</p>
            <h1 className="font-serif text-primary text-2xl mt-1">{p.nome}</h1>
            {(p.profissao || p.escritorio) && (
              <p className="text-sm text-on-surface-variant mt-1">{[p.profissao, p.escritorio].filter(Boolean).join(", ")}</p>
            )}
            <FormContato
              nome={p.nome}
              instagram={p.instagram ?? ""}
              confirmado={!!p.instagram_confirmado}
              whatsapp={p.whatsapp ?? ""}
            />
          </>
        ) : (
          <>
            <h1 className="font-serif text-primary text-2xl">Link vencido</h1>
            <p className="text-sm text-on-surface-variant mt-3">
              O link do e-mail vale 15 dias. Abra de novo pelo e-mail de aniversários ou use Admin → Aniversários.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
