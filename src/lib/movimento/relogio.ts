/**
 * Relógio único do site: um só laço de requestAnimationFrame para tudo que
 * precisa de suavização (progresso de seções, profundidade, cursor). Cada
 * assinante recebe `tick(dt)` com o tempo real decorrido e devolve `true`
 * enquanto ainda está se movendo; quando todos assentam, o laço dorme até
 * alguém chamar `acordar()` (rolagem, resize, ponteiro).
 *
 * `criarRelogio` recebe as dependências do navegador, então os testes rodam em
 * Node com quadros falsos. O singleton `relogio` é criado só no primeiro uso,
 * por isso importar este módulo no servidor é seguro.
 *
 * As constantes abaixo repetem as de suavizar.ts de propósito: o teste de Node
 * não resolve importação sem extensão entre módulos, e o relogio.test.mjs
 * confere que os valores continuam iguais.
 */

export const TAU_PADRAO_MS = 110;
export const DT_MAX_MS = 50;

export interface Assinante {
  /** Devolve `true` enquanto ainda está se movendo. */
  tick(dtMs: number): boolean;
}

export interface DependenciasRelogio {
  agendar(cb: (t: number) => void): number;
  cancelar(id: number): void;
  agora(): number;
  oculto(): boolean;
}

export interface Relogio {
  assinar(a: Assinante): () => void;
  acordar(): void;
  /** Esquece a base de tempo: o próximo quadro entrega dt = 0. */
  reiniciarBase(): void;
}

export function criarRelogio(deps: DependenciasRelogio): Relogio {
  const assinantes = new Set<Assinante>();
  let pedido: number | null = null;
  let anterior: number | null = null;

  const quadro = () => {
    pedido = null;
    if (deps.oculto()) {
      // Aba escondida: não gasta CPU. `acordar()` retoma quando ela voltar.
      anterior = null;
      return;
    }
    const agora = deps.agora();
    const dt = anterior === null ? 0 : Math.min(Math.max(agora - anterior, 0), DT_MAX_MS);
    anterior = agora;
    let movendo = false;
    for (const a of [...assinantes]) {
      if (a.tick(dt)) movendo = true;
    }
    if (movendo && assinantes.size > 0) {
      pedido = deps.agendar(quadro);
    } else {
      anterior = null;
    }
  };

  const acordar = () => {
    if (pedido !== null || assinantes.size === 0 || deps.oculto()) return;
    pedido = deps.agendar(quadro);
  };

  return {
    assinar(a) {
      assinantes.add(a);
      acordar();
      return () => {
        assinantes.delete(a);
        if (assinantes.size === 0 && pedido !== null) {
          deps.cancelar(pedido);
          pedido = null;
          anterior = null;
        }
      };
    },
    acordar,
    reiniciarBase() {
      anterior = null;
    },
  };
}

let instancia: Relogio | null = null;

function obter(): Relogio {
  if (!instancia) {
    const r = criarRelogio({
      agendar: (cb) => requestAnimationFrame(cb),
      cancelar: (id) => cancelAnimationFrame(id),
      agora: () => performance.now(),
      oculto: () => document.hidden,
    });
    document.addEventListener("visibilitychange", () => {
      // Volta (ou sai) da aba: o tempo parado não pode virar um passo grande.
      r.reiniciarBase();
      if (!document.hidden) r.acordar();
    });
    instancia = r;
  }
  return instancia;
}

/** Singleton do navegador. Só chame no cliente (efeitos e handlers). */
export const relogio: Relogio = {
  assinar: (a) => obter().assinar(a),
  acordar: () => obter().acordar(),
  reiniciarBase: () => obter().reiniciarBase(),
};

/** Constante de tempo atual: 0 com movimento reduzido (segue a entrada na hora). */
export function tauAtual(): number {
  if (typeof window === "undefined") return TAU_PADRAO_MS;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : TAU_PADRAO_MS;
}
