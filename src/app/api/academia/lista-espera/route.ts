import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingColumn, isMissingTable } from "@/lib/db-compat";
import { ATUACOES, EXPERIENCIAS, FOCOS, digitos, valido } from "@/lib/academia-waitlist";

/**
 * Lista de espera da Academia Orbital.
 *
 * O curso ainda não existe — isto só registra interesse. Nada aqui cobra,
 * reserva vaga ou promete data.
 *
 * Prioridade de contato definida pela Orbital: WhatsApp e nome obrigatórios,
 * e-mail opcional. Cidade, atuação, foco principal e tempo de profissão
 * qualificam o inscrito e também são obrigatórios.
 */

/** Corta espaços e limita o tamanho — texto livre de formulário público. */
function limpo(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  // Honeypot: campo escondido que só robô preenche. Responde sucesso para o
  // robô não aprender que foi barrado — e não grava nada.
  if (limpo(body.website, 200)) {
    return NextResponse.json({ ok: true });
  }

  const name = limpo(body.name, 120);
  const phone = limpo(body.phone, 30);
  const email = limpo(body.email, 160).toLowerCase();
  const city = limpo(body.city, 80);
  const role = limpo(body.role, 30);
  const roleOther = limpo(body.role_other, 80);
  const focus = limpo(body.main_focus, 40);
  const focusOther = limpo(body.main_focus_other, 80);
  const years = limpo(body.years_experience, 20);
  const source = limpo(body.source, 120);

  if (!name) return NextResponse.json({ error: "Informe seu nome." }, { status: 400 });
  // DDD + número: pelo menos 10 dígitos, venha com a máscara que vier.
  if (digitos(phone).length < 10) {
    return NextResponse.json({ error: "Informe o WhatsApp com DDD." }, { status: 400 });
  }
  // E-mail é opcional, mas se vier tem que ser um e-mail.
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Confira o e-mail informado." }, { status: 400 });
  }
  if (!city) return NextResponse.json({ error: "Informe sua cidade." }, { status: 400 });
  if (!valido(ATUACOES, role)) {
    return NextResponse.json({ error: "Selecione sua atuação profissional." }, { status: 400 });
  }
  if (!valido(FOCOS, focus)) {
    return NextResponse.json({ error: "Selecione o que você mais instala hoje." }, { status: 400 });
  }
  if (!valido(EXPERIENCIAS, years)) {
    return NextResponse.json({ error: "Selecione seu tempo de profissão." }, { status: 400 });
  }

  const { error } = await supabaseAdmin().from("academy_waitlist").insert({
    name,
    phone,
    email: email || null,
    city,
    role,
    role_other: role === "outro" ? roleOther || null : null,
    main_focus: focus,
    main_focus_other: focus === "outro" ? focusOther || null : null,
    years_experience: years,
    source: source || null,
  });

  if (error) {
    // Mesmo WhatsApp (ou e-mail) de novo: a pessoa já está na lista. Responder
    // sucesso evita que alguém use o formulário para descobrir quem está inscrito.
    if (error.code === "23505") return NextResponse.json({ ok: true });

    // Migration 056 não aplicada (ou aplicada só na versão antiga, sem as
    // colunas novas). NÃO fingir sucesso — o cadastro seria perdido.
    if (isMissingTable(error) || isMissingColumn(error)) {
      console.error("[academia/lista-espera] schema de academy_waitlist desatualizado — rodar a migration 056:", error.message);
      return NextResponse.json(
        { error: "Não foi possível concluir o cadastro agora. Tente novamente em instantes." },
        { status: 503 },
      );
    }

    console.error("[academia/lista-espera]", error.message);
    return NextResponse.json(
      { error: "Não foi possível concluir o cadastro. Tente novamente." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
