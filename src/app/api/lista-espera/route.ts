import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/db-compat";
import {
  LINHAS_ESPERA, MAX_MODELOS, PERFIL_OUTRO_MAX, digitosWhatsapp, pendenciasEspera,
  type InscricaoEspera,
} from "@/lib/lista-espera";
import { MODELOS_TECHSTONE } from "@/lib/techstone";

/**
 * POST /api/lista-espera — inscreve alguém na lista de espera de uma linha em
 * chegada (TechStone, PFB Carbon). Grava em site_lista_espera (migração 075).
 *
 * Reenviar com o mesmo WhatsApp na mesma linha não grava de novo nem altera a
 * inscrição que já existe: quem manda a requisição é anônimo e não prova ser
 * dono do número, então não pode trocar o nome ou o e-mail de quem já está na
 * lista. A resposta é de sucesso nos dois casos, para não revelar se o número
 * já estava inscrito. Diferente do pré-contato, aqui o cliente espera a
 * resposta: a página só confirma a inscrição quando ela foi gravada.
 *
 * `modelos` entram na mensagem que a Orbital envia, então só passam nomes que
 * existem no catálogo da linha (hoje só a TechStone tem modelos).
 */

/** Modelos aceitos por linha; linha sem modelos (PFB Carbon) não guarda nenhum. */
const MODELOS_VALIDOS: Record<string, Set<string>> = {
  techstone: new Set(MODELOS_TECHSTONE.map((m) => m.nome)),
};

/** Texto de uma linha, sem caracteres de controle (o Postgres recusa \0), no limite. */
function limpo(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max) : "";
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | (Partial<InscricaoEspera> & { pagina?: string; website?: string })
    | null;
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  // Campo-isca: só robô preenche. Responde sucesso e não grava.
  if (limpo(body.website, 200)) return NextResponse.json({ ok: true });

  const i: Partial<InscricaoEspera> = {
    linha: limpo(body.linha, 20) as InscricaoEspera["linha"],
    nome: limpo(body.nome, 80),
    whatsapp: limpo(body.whatsapp, 30),
    email: limpo(body.email, 120).toLowerCase(),
    perfil: limpo(body.perfil, 20),
    perfilOutro: limpo(body.perfilOutro, PERFIL_OUTRO_MAX),
    prazo: limpo(body.prazo, 20),
    aceite: body.aceite === true,
  };
  if (!LINHAS_ESPERA.some((o) => o.value === i.linha)) {
    return NextResponse.json({ error: "Linha inválida." }, { status: 400 });
  }
  if (pendenciasEspera(i).length) {
    return NextResponse.json({ error: "Confira nome, WhatsApp, e-mail, perfil, prazo e o aceite." }, { status: 400 });
  }
  const validos = MODELOS_VALIDOS[i.linha as string];
  const modelos = validos
    ? [...new Set((Array.isArray(body.modelos) ? body.modelos : [])
        .slice(0, MAX_MODELOS).map((m) => limpo(m, 60)).filter((m) => validos.has(m)))]
    : [];

  // Guarda sempre com o 55: é o formato que o WhatsApp usa.
  const digitos = digitosWhatsapp(i.whatsapp!);
  const whatsapp = digitos.length <= 11 ? `55${digitos}` : digitos;

  const { error } = await supabaseAdmin()
    .from("site_lista_espera")
    .upsert({
      linha: i.linha,
      nome: i.nome,
      whatsapp,
      email: i.email,
      perfil: i.perfil,
      perfil_outro: i.perfil === "outro" ? i.perfilOutro : null,
      prazo: i.prazo,
      modelos: modelos.length ? modelos : null,
      pagina: limpo(body.pagina, 120) || null,
      aceite_lgpd: true,
    }, { onConflict: "linha,whatsapp", ignoreDuplicates: true });

  if (error) {
    if (isMissingTable(error)) console.error("[lista-espera] tabela site_lista_espera ausente — rodar a migration 075");
    else console.error("[lista-espera]", error.message);
    return NextResponse.json({ error: "Não foi possível registrar agora. Tente de novo em instantes." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
