import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { verificarParabens } from "@/lib/ia/parabens";
import {
  BUCKET_AGENDA, contaDoToken, dataValida, garantirBucket, gravarAgendado, guardarToken, hojeManaus,
  horaManaus, lerAgendado, listarAgendados, podePublicar, tokenDoPedido, type Agendado,
} from "@/lib/instagram-agenda";

/**
 * Agenda um Story já aprovado pelo dono para sair sozinho no dia (cron
 * /api/cron/instagram-stories, a partir das 8h em Manaus). Quem chama é o script de
 * publicação do Mac, com o token do Instagram da Orbital no Authorization.
 *   POST   { tipo, data, nome, handle?, mensagem?, aprovacao } → { id, signedUrl }
 *          (o script sobe a mídia na signedUrl; o token fica guardado cifrado para o cron)
 *   GET    → { agendados: [...] }   (sem a mensagem)
 *   DELETE { id, data } → { ok: true }   (cancela um agendamento ainda pendente)
 */

export const dynamic = "force-dynamic";

const TIPOS: Record<string, string> = { "image/jpeg": "jpg", "video/mp4": "mp4" };
const MAX_DIAS = 60;
// O cron roda de hora em hora das 8h às 11h de Manaus: para hoje, só dá para agendar antes da última.
const ULTIMA_HORA_CRON = 11;

function texto(v: unknown, max: number): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}

export async function POST(req: NextRequest) {
  const token = tokenDoPedido(req);
  const igUser = await contaDoToken(token);
  if (!igUser) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));

  const ext = TIPOS[b.tipo as string];
  if (!ext) return NextResponse.json({ error: "tipo não aceito", aceitos: Object.keys(TIPOS) }, { status: 400 });
  const hoje = hojeManaus();
  if (!dataValida(b.data)) return NextResponse.json({ error: "data precisa ser AAAA-MM-DD e existir no calendário" }, { status: 400 });
  const data: string = b.data;
  const dias = (Date.parse(data) - Date.parse(hoje)) / 86400000;
  if (dias < 0 || dias > MAX_DIAS) return NextResponse.json({ error: `data precisa ser entre hoje (${hoje}) e ${MAX_DIAS} dias à frente` }, { status: 400 });
  if (dias === 0 && horaManaus() >= ULTIMA_HORA_CRON) {
    return NextResponse.json({ error: `para hoje só dá para agendar antes das ${ULTIMA_HORA_CRON}h de Manaus; publique pelo Mac (comando story)` }, { status: 400 });
  }
  const nome = texto(b.nome, 120);
  const aprovacao = texto(b.aprovacao, 300);
  if (!nome || !aprovacao) return NextResponse.json({ error: "nome e aprovacao são obrigatórios" }, { status: 400 });
  const handle = texto(b.handle, 30);
  if (handle && !/^[a-z0-9._]{1,30}$/.test(handle)) return NextResponse.json({ error: "handle inválido" }, { status: 400 });
  const mensagem = texto(b.mensagem, 1000);
  const problemas = mensagem ? verificarParabens(mensagem, nome) : [];
  if (problemas.length) return NextResponse.json({ error: `mensagem recusada: ${problemas.join(" ")}` }, { status: 400 });
  // Só guarda token que publica de verdade: um token sem a permissão derrubaria todos os agendados.
  if (!(await podePublicar(token, igUser))) return NextResponse.json({ error: "o token não tem permissão de publicar (instagram_business_content_publish)" }, { status: 403 });

  await garantirBucket();
  await guardarToken(token);

  const id = crypto.randomBytes(16).toString("hex");
  const midia = `${data}/${id}.${ext}`;
  const { data: up, error } = await supabaseAdmin().storage.from(BUCKET_AGENDA).createSignedUploadUrl(midia);
  if (error || !up) return NextResponse.json({ error: error?.message ?? "falha ao preparar o envio" }, { status: 500 });

  const a: Agendado = {
    id, data, tipo: b.tipo, midia, nome, handle, mensagem, aprovacao,
    status: "pendente", criado_em: new Date().toISOString(),
  };
  await gravarAgendado(a);
  return NextResponse.json({ id, signedUrl: up.signedUrl });
}

export async function GET(req: NextRequest) {
  if (!(await contaDoToken(tokenDoPedido(req)))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await garantirBucket();
  const agendados = (await listarAgendados()).map((a) => ({ ...a, mensagem: a.mensagem ? "(definida)" : null }));
  return NextResponse.json({ agendados });
}

export async function DELETE(req: NextRequest) {
  if (!(await contaDoToken(tokenDoPedido(req)))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id, data } = await req.json().catch(() => ({}));
  if (typeof id !== "string" || !/^[a-f0-9]{32}$/.test(id) || typeof data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return NextResponse.json({ error: "id ou data inválidos" }, { status: 400 });
  }
  const a = await lerAgendado(`${data}/${id}.json`);
  if (!a) return NextResponse.json({ error: "agendamento não encontrado" }, { status: 404 });
  if (a.status === "publicado" || a.status === "processando") {
    return NextResponse.json({ error: a.status === "publicado" ? "já publicado: apague no app se precisar" : "a Meta já está processando: não dá mais para cancelar" }, { status: 409 });
  }
  const { error } = await supabaseAdmin().storage.from(BUCKET_AGENDA).remove([a.midia, `${data}/${id}.json`]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
