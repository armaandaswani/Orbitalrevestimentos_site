import { adminWhatsappPhone, sendText, smclickConfigured } from "@/lib/smclick";
import { enviarPelaSte, steConfigurada } from "@/lib/whatsapp-ste";

/**
 * Aviso ao dono de que um Story de aniversário saiu e falta marcar o profissional.
 *
 * A marcação pela API (user_tags) entra calada: a pessoa não recebe "mencionou
 * você" e não consegue repostar, e uma menção feita assim não sai mais no app.
 * Decisão do dono (07/11/2026): o Story sai sem marcação e o WhatsApp da Ste
 * avisa o número dele, com o @, para ele marcar pelo app (com aviso de verdade).
 * Uma mensagem por Story publicado, pelo cron da nuvem ou pelo Mac.
 */

export function textoAvisoDono(nome: string, handle: string | null): string {
  return [
    `📸 O Story de aniversário de ${nome} já está no ar no Instagram da Orbital.`,
    handle
      ? `Falta marcar: @${handle}`
      : "Falta marcar, mas não temos o @ confirmado: procure o perfil antes.",
    "No app: abra o Story e toque em Mention.",
  ].join("\n");
}

/** Manda o aviso pelo WhatsApp da Ste (SM Click só se a ponte da Ste não existir). Não lança. */
export async function avisarDono(nome: string, handle: string | null): Promise<{ ok: boolean; detalhe: string }> {
  const para = adminWhatsappPhone();
  if (!para) return { ok: false, detalhe: "sem número do dono configurado" };
  const texto = textoAvisoDono(nome, handle);
  if (steConfigurada()) {
    const r = await enviarPelaSte({ telefone: para, texto, origem: "instagram-story-marcar" });
    return r.ok ? { ok: true, detalhe: "enviado pelo WhatsApp da Ste" } : { ok: false, detalhe: `Ste falhou: ${r.erro ?? `HTTP ${r.status}`}` };
  }
  if (smclickConfigured()) {
    const r = await sendText(para, texto);
    return r.ok ? { ok: true, detalhe: "enviado pelo SM Click" } : { ok: false, detalhe: `SM Click falhou: ${r.error ?? `HTTP ${r.status}`}` };
  }
  return { ok: false, detalhe: "nenhum WhatsApp configurado (Ste nem SM Click)" };
}
