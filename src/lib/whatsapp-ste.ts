/**
 * Envio pelo WhatsApp da Ste (conexão por QR no servidor da atendente), no lugar
 * do SM Click. Usa a mesma ponte segura do admin (ATENDENTE_API_URL +
 * ATENDENTE_API_TOKEN) e o endpoint POST /api/whatsapp/enviar da Ste, que cria o
 * contato se preciso, envia, registra e pausa a IA nesse contato.
 */
export function steConfigurada(): boolean {
  return !!process.env.ATENDENTE_API_URL && !!process.env.ATENDENTE_API_TOKEN;
}

export async function enviarPelaSte(dados: { telefone: string; texto: string; origem: string; nome?: string }): Promise<{ ok: boolean; status: number; erro?: string }> {
  const base = process.env.ATENDENTE_API_URL?.replace(/\/+$/, "");
  const token = process.env.ATENDENTE_API_TOKEN;
  if (!base || !token) return { ok: false, status: 503, erro: "Ponte da Ste não configurada (ATENDENTE_API_URL / ATENDENTE_API_TOKEN)." };
  try {
    const res = await fetch(`${base}/api/whatsapp/enviar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(dados),
      signal: AbortSignal.timeout(30_000),
    });
    if (res.ok) return { ok: true, status: res.status };
    const j = await res.json().catch(() => ({}));
    const erro = typeof j?.error === "string" ? j.error
      : res.status === 404 ? "O servidor da Ste ainda não tem o envio direto (atualize a Ste)." : `HTTP ${res.status}`;
    return { ok: false, status: res.status, erro };
  } catch (e) {
    return { ok: false, status: 504, erro: `Servidor da Ste não respondeu (${e instanceof Error ? e.name : "falha"}).` };
  }
}
