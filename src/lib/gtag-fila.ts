// Envio ao gtag com fila: o gtag-init do layout é afterInteractive, então um
// clique pode chegar antes de window.gtag existir. Módulo puro (sem import e sem
// ler window) para rodar em node --test; quem usa injeta lerGtag e agendar.

export const FILA_MAX = 20;
const INTERVALO_MS = 250;
const TENTATIVAS_MAX = 40; // 40 x 250 ms = 10 s

type Gtag = (...a: unknown[]) => void;
type Props = Record<string, unknown>;

export function criarEnvioGtag(o: {
  lerGtag: () => Gtag | undefined;
  agendar: (fn: () => void, ms: number) => unknown;
  max?: number;
}): { enviar(evento: string, props?: Record<string, unknown>): void; pendentes(): number } {
  const max = o.max ?? FILA_MAX;
  const fila: Array<[string, Props | undefined]> = [];
  let agendada = false;
  let tentativas = 0;

  function chamar(gtag: Gtag, evento: string, props?: Props) {
    try {
      gtag("event", evento, props);
    } catch {
      // um erro do gtag nunca sai daqui, e o evento que falhou não volta para a fila.
    }
  }

  function esvaziar(gtag: Gtag) {
    while (fila.length > 0) {
      const [evento, props] = fila.shift()!;
      chamar(gtag, evento, props);
    }
  }

  function agendarTentativa() {
    if (agendada) return;
    agendada = true;
    tentativas = 0;
    o.agendar(tentar, INTERVALO_MS);
  }

  function tentar() {
    agendada = false;
    const gtag = o.lerGtag();
    if (typeof gtag === "function") {
      esvaziar(gtag);
      return;
    }
    tentativas += 1;
    if (tentativas < TENTATIVAS_MAX) {
      agendada = true;
      o.agendar(tentar, INTERVALO_MS);
    }
  }

  return {
    enviar(evento, props) {
      const gtag = o.lerGtag();
      if (typeof gtag === "function") {
        esvaziar(gtag);
        chamar(gtag, evento, props);
        return;
      }
      if (fila.length < max) fila.push([evento, props]);
      agendarTentativa();
    },
    pendentes() {
      return fila.length;
    },
  };
}
