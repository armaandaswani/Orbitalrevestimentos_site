import type { Acao } from "@/lib/pontos-de-venda";

/** Ícones dos botões da lista e da folha (os mesmos do quadro aprovado da Fase 0). */

export function IconeWhatsApp({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" className={`shrink-0 ${className}`}>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1 2.7.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3Z" />
    </svg>
  );
}

export function IconeRota({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" focusable="false" className={`shrink-0 ${className}`}>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

export function IconeFechar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" focusable="false">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

/** Ícone de cada ação (Waze e Instagram vão só com o texto, como no quadro). */
export function IconeDaAcao({ tipo }: { tipo: Acao["tipo"] }) {
  if (tipo === "whatsapp") return <IconeWhatsApp />;
  if (tipo === "rota") return <IconeRota />;
  return null;
}

/** Botões no desenho aprovado: 48 px, texto de 16 px em caixa normal, canto reto, sem quebrar linha. */
export const BOTAO_PDV =
  "inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap px-[18px] font-sans text-base font-medium leading-none no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-surface-tint";
export const BOTAO_PDV_CHEIO = `${BOTAO_PDV} bg-primary text-on-primary hover:bg-surface-tint`;
export const BOTAO_PDV_CLARO = `${BOTAO_PDV} bg-[#ECEAE4] text-primary hover:bg-[#E2DFD7]`;
export const BOTAO_PDV_VAZADO = `${BOTAO_PDV} border border-primary/25 text-primary hover:border-primary`;
