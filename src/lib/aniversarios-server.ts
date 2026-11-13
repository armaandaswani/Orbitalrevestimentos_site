import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingTable } from "@/lib/db-compat";
import { emailLogo } from "@/lib/email-marca";
import { linkContato } from "@/lib/aniversario-link";
import {
  MESES, chaveNome, dataCurta, diasAte, digitosWhatsapp, hojeEmManaus, idade, linkBusca, linkInstagram, linkParabens,
  mensagemParabens, proximosDias, type Aniversariante, type Aniversario,
} from "@/lib/aniversarios";

/**
 * E-mail diário de aniversariantes (cron /api/cron/daily e o botão "Enviar
 * agora" do admin). Junta três fontes, sem repetir a mesma pessoa:
 *   1. profissionais (tabela aniversarios — a planilha importada);
 *   2. parceiros ativos (partners.birthday);
 *   3. representantes ativos (sales_reps.birthday).
 * Quem é parceiro e também está na planilha aparece uma vez só, como
 * parceiro, com o Instagram da planilha e o telefone mais completo.
 */

const DIAS_A_FRENTE = 7;

type Data = { dia: number; mes: number };

function dataDeIso(iso: string | null): Data | null {
  if (!iso) return null;
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? { dia: Number(m[3]), mes: Number(m[2]) } : null;
}
const anoDeIso = (iso: string | null) => {
  const m = String(iso ?? "").match(/^(\d{4})-/);
  return m ? Number(m[1]) : null;
};

/**
 * Todos os aniversariantes de hoje e dos próximos dias, já sem duplicados. O e-mail usa 7 dias;
 * a preparação dos Stories antes de uma viagem do dono pede mais (até 60, o limite do agendamento).
 */
export async function aniversariantes(db: SupabaseClient, agora = new Date(), diasAFrente = DIAS_A_FRENTE) {
  const hoje = hojeEmManaus(agora);
  const datas: Data[] = [{ dia: hoje.dia, mes: hoje.mes }, ...proximosDias(hoje, diasAFrente)];
  const naJanela = (d: Data) => datas.some((x) => x.dia === d.dia && x.mes === d.mes);
  const meses = [...new Set(datas.map((d) => d.mes))];

  const [prof, parc, reps] = await Promise.all([
    db.from("aniversarios").select("*").eq("ativo", true).in("mes", meses),
    db.from("partners").select("id, name, email, phone, coupon_code, birthday, profession").eq("status", "active").not("birthday", "is", null),
    db.from("sales_reps").select("id, name, email, phone, birthday").eq("status", "active").not("birthday", "is", null),
  ]);
  if (prof.error && !isMissingTable(prof.error)) console.error("[aniversarios]", prof.error.message);

  const lista: Aniversariante[] = [];
  const porChave = new Map<string, Aniversariante>();
  const chaves = (a: Pick<Aniversariante, "nome" | "whatsapp" | "email">) => [
    `n:${chaveNome(a.nome)}`,
    ...(digitosWhatsapp(a.whatsapp) ? [`w:${digitosWhatsapp(a.whatsapp)!.slice(-8)}`] : []),
    ...(a.email ? [`e:${a.email.toLowerCase()}`] : []),
  ];
  const guardar = (a: Aniversariante) => { lista.push(a); for (const k of chaves(a)) porChave.set(k, a); };
  const achar = (a: Pick<Aniversariante, "nome" | "whatsapp" | "email">) => chaves(a).map((k) => porChave.get(k)).find(Boolean);

  for (const p of ((prof.data ?? []) as Aniversario[])) {
    if (!naJanela(p)) continue;
    guardar({
      ref: `profissional:${p.id}`,
      idProfissional: p.id,
      nome: p.nome,
      tipo: "profissional",
      detalhe: [p.profissao, p.escritorio].filter(Boolean).join(", "),
      instagram: p.instagram,
      instagramConfirmado: p.instagram_confirmado,
      whatsapp: p.whatsapp,
      email: p.email,
      dia: p.dia,
      mes: p.mes,
      ano: p.ano,
    });
  }

  type Pessoa = { id: string; name: string; email: string | null; phone: string | null; birthday: string | null; coupon_code?: string; profession?: string | null };
  const juntar = (p: Pessoa, tipo: "parceiro" | "representante") => {
    const d = dataDeIso(p.birthday);
    if (!d || !naJanela(d)) return;
    const novo: Aniversariante = {
      ref: `${tipo}:${p.id}`,
      nome: p.name,
      tipo,
      detalhe: tipo === "parceiro" ? [p.profession, p.coupon_code && `cupom ${p.coupon_code}`].filter(Boolean).join(", ") : "",
      instagram: null,
      instagramConfirmado: false,
      whatsapp: p.phone,
      email: p.email,
      dia: d.dia,
      mes: d.mes,
      ano: anoDeIso(p.birthday),
      cupom: p.coupon_code ?? null,
    };
    const ja = achar(novo);
    if (ja) {
      // Mesma pessoa na planilha: vira parceiro, completa o que faltar.
      ja.tipo = tipo;
      ja.ref = novo.ref;
      ja.detalhe = novo.detalhe || ja.detalhe;
      ja.cupom = novo.cupom;
      ja.whatsapp = ja.whatsapp || novo.whatsapp;
      ja.email = ja.email || novo.email;
      ja.ano = ja.ano || novo.ano;
      return;
    }
    guardar(novo);
  };
  for (const p of (parc.data ?? []) as Pessoa[]) juntar(p, "parceiro");
  for (const r of (reps.data ?? []) as Pessoa[]) juntar(r, "representante");

  const ordem = (a: Aniversariante) => datas.findIndex((d) => d.dia === a.dia && d.mes === a.mes);
  lista.sort((a, b) => ordem(a) - ordem(b) || a.nome.localeCompare(b.nome, "pt-BR"));
  return {
    hoje,
    deHoje: lista.filter((a) => a.dia === hoje.dia && a.mes === hoje.mes),
    proximos: lista.filter((a) => !(a.dia === hoje.dia && a.mes === hoje.mes)),
    semTabela: !!prof.error && isMissingTable(prof.error),
  };
}

// ── HTML ─────────────────────────────────────────────────────────────────────

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const TIPO: Record<Aniversariante["tipo"], string> = { profissional: "", parceiro: "Parceiro", representante: "Representante" };

/** Link assinado para completar o contato; só para quem está na tabela de profissionais. */
function linkCompletar(a: Aniversariante): string | null {
  return a.idProfissional ? linkContato(a.idProfissional) : null;
}

function blocoHoje(a: Aniversariante, hojeAno: number): string {
  const anos = idade(a.ano, hojeAno);
  const parabens = linkParabens(a);
  const completar = linkCompletar(a);
  const link = (href: string, txt: string) => `<a href="${esc(href)}" style="color:#2347A0;text-decoration:underline">${txt}</a>`;
  const acao = (txt: string) => (completar ? ` · <a href="${esc(completar)}" style="color:#1f7a3d;font-weight:700;text-decoration:underline">${txt}</a>` : "");
  const linhas: string[] = [];
  linhas.push(a.instagram
    ? `Instagram: ${link(linkInstagram(a.instagram), `@${esc(a.instagram)}`)}${a.instagramConfirmado ? "" : ` <span style="color:#8a5a00">(a confirmar)</span>${acao("confirmar")}`}`
    : `Instagram: <span style="color:#8a5a00">não temos</span> · ${link(linkBusca(a, "instagram"), "buscar")}${acao("adicionar")}`);
  const fone = digitosWhatsapp(a.whatsapp);
  linhas.push(fone
    ? `WhatsApp: ${link(`https://wa.me/${fone}`, esc(a.whatsapp ?? fone))}`
    : `WhatsApp: <span style="color:#8a5a00">não temos</span> · ${link(linkBusca(a, "whatsapp"), "buscar")}${acao("adicionar")}`);
  if (a.email) linhas.push(`E-mail: ${link(`mailto:${a.email}`, esc(a.email))}`);

  return `
    <tr><td style="padding:18px 0;border-bottom:1px solid #e6e8ec">
      <p style="margin:0;font-family:Georgia,serif;font-size:19px;color:#0B1F45">${esc(a.nome)}${anos ? `<span style="font-family:Arial,sans-serif;font-size:14px;color:#43474e"> · ${anos} anos</span>` : ""}</p>
      ${a.detalhe || TIPO[a.tipo] ? `<p style="margin:4px 0 0;font-size:14px;color:#43474e">${esc([TIPO[a.tipo], a.detalhe].filter(Boolean).join(" · "))}</p>` : ""}
      <p style="margin:10px 0 0;font-size:14px;line-height:1.7;color:#0D1830">${linhas.join("<br>")}</p>
      <p style="margin:14px 0 6px;font-size:12px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#43474e">Mensagem para copiar</p>
      <div style="background:#F6F5F2;border-left:3px solid #36A35C;padding:12px 14px;font-size:14px;line-height:1.55;color:#0D1830;white-space:pre-line;-webkit-user-select:all;user-select:all">${esc(mensagemParabens(a.nome))}</div>
      ${parabens ? `<a href="${esc(parabens)}" style="display:inline-block;margin-top:12px;background:#36A35C;color:#0B1F45;text-decoration:none;padding:11px 20px;font-size:14px;font-weight:700;border-radius:999px">Parabenizar no WhatsApp</a>` : ""}
    </td></tr>`;
}

const SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function linhaProxima(a: Aniversariante): string {
  const contato = [
    a.instagram ? `<a href="${esc(linkInstagram(a.instagram))}" style="color:#2347A0">@${esc(a.instagram)}</a>${a.instagramConfirmado ? "" : ' <span style="color:#8a5a00">(a confirmar)</span>'}` : "",
    digitosWhatsapp(a.whatsapp) ? `<a href="https://wa.me/${digitosWhatsapp(a.whatsapp)}" style="color:#2347A0">WhatsApp</a>` : "",
  ];
  const completar = linkCompletar(a);
  if (completar && (!a.instagram || !a.instagramConfirmado || !digitosWhatsapp(a.whatsapp))) {
    contato.push(`<a href="${esc(completar)}" style="color:#1f7a3d;font-weight:700">completar contato</a>`);
  }
  const contatoHtml = contato.filter(Boolean).join(" · ");
  return `
    <tr><td style="padding:7px 0 7px 14px;border-left:2px solid #d9dde4;font-size:14px;color:#0D1830">
      ${esc(a.nome)}${a.tipo !== "profissional" ? ` <span style="color:#43474e">(${TIPO[a.tipo].toLowerCase()})</span>` : ""}${contatoHtml ? `<br><span style="font-size:13px">${contatoHtml}</span>` : ""}
    </td></tr>`;
}

/** Um bloco por data: o dia aparece uma vez só, com as pessoas embaixo. */
function proximosPorDia(proximos: Aniversariante[], hoje: { dia: number; mes: number; ano: number }): string {
  const dias: Aniversariante[][] = [];
  for (const a of proximos) {
    const ultimo = dias[dias.length - 1];
    if (ultimo && ultimo[0].dia === a.dia && ultimo[0].mes === a.mes) ultimo.push(a);
    else dias.push([a]);
  }
  return dias.map((pessoas, i) => {
    const { dia, mes } = pessoas[0];
    const falta = diasAte(hoje, dia, mes);
    const semana = SEMANA[new Date(Date.UTC(hoje.ano + (mes < hoje.mes ? 1 : 0), mes - 1, dia)).getUTCDay()];
    const nota = [falta === 1 ? "amanhã" : `em ${falta} dias`, `${pessoas.length} ${pessoas.length === 1 ? "aniversário" : "aniversários"}`].join(" · ");
    return `
    <tr><td style="padding:${i ? "20px" : "8px"} 0 8px">
      <span style="font-size:13px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#0B1F45">${semana}, ${dataCurta(dia, mes)}</span>
      <span style="font-size:13px;color:#74777f">&nbsp;·&nbsp;${nota}</span>
    </td></tr>
    ${pessoas.map(linhaProxima).join("")}`;
  }).join("");
}

export function emailAniversarios(r: Awaited<ReturnType<typeof aniversariantes>>): { assunto: string; html: string } {
  const { hoje, deHoje, proximos } = r;
  const quando = `${hoje.dia} de ${MESES[hoje.mes - 1]}`;
  const assunto = deHoje.length
    ? `🎂 Aniversários hoje (${deHoje.length}): ${deHoje.slice(0, 3).map((a) => a.nome.replace(/\(.*?\)/g, "").trim()).join(", ")}${deHoje.length > 3 ? "…" : ""}`
    : `Aniversários: nenhum hoje, ${proximos.length} nos próximos ${DIAS_A_FRENTE} dias`;
  const html = `
  <div style="background:#F6F5F2;padding:24px 0;font-family:Arial,sans-serif">
    <div style="max-width:560px;margin:0 auto;background:#ffffff">
      <div style="background:#0B1F45;padding:20px 24px">${emailLogo(140)}</div>
      <div style="padding:28px 24px 8px">
        <p style="margin:0;font-family:Georgia,serif;font-size:24px;color:#0B1F45">${deHoje.length ? `Aniversariantes de hoje, ${quando}` : `Nenhum aniversário hoje, ${quando}`}</p>
        ${deHoje.length ? `<p style="margin:6px 0 0;font-size:14px;color:#43474e">${deHoje.length} ${deHoje.length === 1 ? "pessoa faz" : "pessoas fazem"} aniversário hoje.</p>` : ""}
        ${deHoje.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:8px">${deHoje.map((a) => blocoHoje(a, hoje.ano)).join("")}</table>` : ""}
      </div>
      <div style="padding:20px 24px 28px">
        <p style="margin:0 0 6px;font-family:Georgia,serif;font-size:18px;color:#0B1F45">Próximos ${DIAS_A_FRENTE} dias</p>
        ${proximos.length
          ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${proximosPorDia(proximos, hoje)}</table>`
          : `<p style="margin:0;font-size:14px;color:#43474e">Ninguém faz aniversário nos próximos ${DIAS_A_FRENTE} dias.</p>`}
      </div>
      <div style="padding:16px 24px;border-top:1px solid #e6e8ec;font-size:12px;color:#74777f">
        Lista completa e edição em Admin → Aniversários. Orbital Revestimentos, envio automático diário.
      </div>
    </div>
  </div>`;
  return { assunto, html };
}
