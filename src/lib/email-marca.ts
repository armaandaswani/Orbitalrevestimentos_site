/**
 * Identidade visual dos e-mails (Manual da Marca, ed. 01).
 *
 * - Cabeçalho em azul-noite (#0B1F45) com a assinatura em NEGATIVO (texto
 *   branco, globo em Azul Vivo) — é a única versão permitida sobre fundo azul.
 *   Largura mínima da assinatura horizontal: 120px.
 * - Fontes: Arial nos textos e Georgia nos títulos (decisão do dono: manter as
 *   fontes antigas do site, não as do manual).
 * - E-mail não aceita SVG (o Gmail bloqueia): o logo vai em PNG.
 */

const SITE = "https://orbitalrevestimentos.com.br";

/** Arquivo novo se o logo mudar — as imagens ficam 1 ano em cache. */
const LOGO_NEGATIVO_PNG = `${SITE}/images/brand/orbital-assinatura-negativo-email.png`;

/** Assinatura em negativo para o cabeçalho azul-noite (proporção 480×151). */
export function emailLogo(width = 160, marginBottom = 0): string {
  const height = Math.round((width * 151) / 480);
  return `<img src="${LOGO_NEGATIVO_PNG}" width="${width}" height="${height}" alt="Orbital Revestimentos" style="display:block;border:0;outline:none;width:${width}px;height:${height}px;margin:0 0 ${marginBottom}px 0;">`;
}

/** Faixa azul-noite com a assinatura, para e-mails simples (sem tabela). */
export function emailTopo(maxWidth: number): string {
  return `<div style="max-width:${maxWidth}px;margin:0 auto;background:#0B1F45;padding:20px 24px;">${emailLogo(140)}</div>`;
}
