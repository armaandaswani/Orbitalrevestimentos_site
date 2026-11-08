import { track } from "@vercel/analytics";
import { criarEnvioGtag } from "./gtag-fila";

// Eventos nomeados do funil de orçamento (§40). Só enviam metadados NÃO pessoais
// (produto, ambiente, nº de placas, condição) — nunca nome/e-mail/telefone/CEP.
// Encapsulado aqui para manter os nomes consistentes e falhar em silêncio.
export type FunnelEvent =
  | "espaco_selecionado"
  | "modelo_selecionado"
  | "dimensoes_preenchidas"
  | "dados_iniciados"
  | "lead_capturado"
  | "resultado_visualizado"
  | "pagamento_selecionado"
  | "cta_formalizacao_clicado"
  | "formalizacao_iniciada"
  | "formalizacao_gerada"
  | "simulador_ambiente_aberto"
  | "instalador_clicado"
  | "link_copiado"
  | "editar_projeto"
  | "consultor_clicado"
  | "manual_solicitado"
  // /onde-comprar: só o slug da loja, a origem do link e o app de rota.
  | "pdv_pagina_aberta"
  | "pdv_loja_aberta"
  | "pdv_whatsapp"
  | "pdv_rota"
  | "pdv_instagram"
  | "pdv_loja_invalida";

type Props = Record<string, string | number | boolean | null>;

declare global {
  interface Window {
    gtag?: (...a: unknown[]) => void;
  }
}

// O gtag-init é afterInteractive: um clique pode chegar antes de window.gtag
// existir, então o envio ao GA4 passa por uma fila que espera ele carregar.
const envioGtag = criarEnvioGtag({
  lerGtag: () => (typeof window === "undefined" ? undefined : window.gtag),
  agendar: (fn, ms) => setTimeout(fn, ms),
});

/**
 * `saida`: o clique leva o visitante para fora (WhatsApp, rota, Instagram). Só
 * o envio ao GA4 recebe `transport_type: "beacon"`, para o evento sair mesmo
 * com a página indo embora; o Vercel Analytics recebe os mesmos `props`.
 */
export function trackFunnel(event: FunnelEvent, props?: Props, opcoes?: { saida?: boolean }) {
  try {
    track(event, props);
  } catch {
    // analytics é best-effort — nunca quebra o fluxo.
  }
  try {
    envioGtag.enviar(event, opcoes?.saida ? { ...props, transport_type: "beacon" } : props);
  } catch {
    // idem para o GA4.
  }
}
