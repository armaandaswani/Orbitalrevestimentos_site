import { track } from "@vercel/analytics";

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
  | "editar_projeto";

type Props = Record<string, string | number | boolean | null>;

export function trackFunnel(event: FunnelEvent, props?: Props) {
  try {
    track(event, props);
  } catch {
    // analytics é best-effort — nunca quebra o fluxo.
  }
}
