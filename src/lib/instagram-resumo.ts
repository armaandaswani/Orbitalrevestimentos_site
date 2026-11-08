import { emailLogo } from "@/lib/email-marca";

/**
 * Resumo por e-mail do cron dos Stories agendados (/api/cron/instagram-stories).
 *
 * A API do Instagram não deixa começar conversa no Direct, e com o Mac
 * desligado ninguém manda o parabéns por lá. Decisão do dono (07/11/2026): a
 * equipe manda pelo celular. Para cada Story publicado de quem tem @ confirmado,
 * o resumo traz o botão que abre a conversa e o texto pronto para colar, sem link
 * do Story. A saudação foi escrita para as 8h; depois do meio-dia, "Boa tardeee".
 * O Story sai sem marcação (07/11/2026): o dono marca pelo app, avisado pelo
 * WhatsApp da Ste, e o resumo mostra o @ como "falta marcar no app".
 */

export interface DirectPendente {
  nome: string;
  handle: string;        // já validado: [a-z0-9._]{1,30}
  texto: string | null;  // versão do Direct gerada no Mac ao agendar
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const linkConversa = (handle: string) => `https://ig.me/m/${handle}`;
const primeiro = (nome: string) => nome.replace(/\(.*?\)/g, "").trim().split(/\s+/)[0];

const COMO = [
  "Pelo celular, no Instagram da @orbitalrevestimentos: toque em \"Abrir conversa no Instagram\", cole a mensagem e envie.",
  "Antes de mandar, olhe a conversa: se já tiver parabéns da Orbital de hoje (o Mac pode ter mandado), não mande de novo.",
  "A mensagem começa com \"Bom diaaa\". Depois do meio-dia, troque por \"Boa tardeee\"; depois das 18h, por \"Boa noiteee\".",
];

function blocoDirect(d: DirectPendente): string {
  return `
    <tr><td style="padding:18px 0;border-bottom:1px solid #e6e8ec">
      <p style="margin:0;font-family:Georgia,serif;font-size:19px;color:#0B1F45">${esc(d.nome)}</p>
      <p style="margin:4px 0 0;font-size:14px;color:#43474e">@${esc(d.handle)} · <span style="color:#8a5a00">falta marcar no app</span></p>
      <p style="margin:14px 0 6px;font-size:12px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#43474e">Mensagem para copiar</p>
      ${d.texto
        // <br> e não white-space:pre-line: o Outlook ignora pre-line e a mensagem colaria numa linha só.
        ? `<div style="background:#F6F5F2;border-left:3px solid #36A35C;padding:12px 14px;font-size:14px;line-height:1.55;color:#0D1830;-webkit-user-select:all;user-select:all">${esc(d.texto).replace(/\n/g, "<br>")}</div>`
        : `<p style="margin:0;font-size:14px;color:#8a5a00">Sem texto pronto: escreva o parabéns de sempre para ${esc(primeiro(d.nome))}.</p>`}
      <a href="${esc(linkConversa(d.handle))}" style="display:inline-block;margin-top:12px;background:#36A35C;color:#0B1F45;text-decoration:none;padding:11px 20px;font-size:14px;font-weight:700;border-radius:999px">Abrir conversa no Instagram</a>
    </td></tr>`;
}

export function resumoStories(hoje: string, linhas: string[], directs: DirectPendente[]): { assunto: string; html: string; texto: string } {
  const dia = hoje.split("-").reverse().slice(0, 2).join("/");
  const assunto = directs.length
    ? `🎂 Mandar parabéns no Direct (${dia}): ${directs.slice(0, 3).map((d) => primeiro(d.nome)).join(", ")}${directs.length > 3 ? "…" : ""}`
    : `Stories de aniversário agendados (${hoje.split("-").reverse().join("/")})`;

  const html = `
  <div style="background:#F6F5F2;padding:24px 0;font-family:Arial,sans-serif">
    <div style="max-width:560px;margin:0 auto;background:#ffffff">
      <div style="background:#0B1F45;padding:20px 24px">${emailLogo(140)}</div>
      ${directs.length ? `
      <div style="padding:28px 24px 8px">
        <p style="margin:0;font-family:Georgia,serif;font-size:24px;color:#0B1F45">Parabéns no Direct, pelo celular</p>
        <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:#43474e">O Story já saiu, ainda sem marcação: falta marcar no app (o dono recebe o aviso com o @ pelo WhatsApp da Ste). ${COMO.map(esc).join(" ")}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:8px">${directs.map(blocoDirect).join("")}</table>
      </div>` : ""}
      <div style="padding:20px 24px 28px">
        <p style="margin:0 0 6px;font-family:Georgia,serif;font-size:18px;color:#0B1F45">O que o agendamento fez hoje</p>
        <p style="margin:0;font-size:14px;line-height:1.7;color:#0D1830">${linhas.map(esc).join("<br>")}</p>
      </div>
      <div style="padding:16px 24px;border-top:1px solid #e6e8ec;font-size:12px;color:#74777f">
        O resultado do WhatsApp aparece na Central de aprovações do painel. Orbital Revestimentos, envio automático.
      </div>
    </div>
  </div>`;

  const texto = [
    ...(directs.length ? [
      "PARABÉNS NO DIRECT, PELO CELULAR",
      ...COMO,
      "",
      ...directs.flatMap((d) => [`${d.nome} (@${d.handle}, falta marcar no app)`, `Abrir conversa: ${linkConversa(d.handle)}`, d.texto ?? "(sem texto pronto)", ""]),
    ] : []),
    "O QUE O AGENDAMENTO FEZ HOJE",
    ...linhas,
    "",
    "O resultado do WhatsApp aparece na Central de aprovações do painel.",
  ].join("\n");

  return { assunto, html, texto };
}
