/**
 * Abertura de uma seção: sobretítulo com o traço verde, título e uma linha de
 * apoio. Mesma peça em toda seção da página de Projetos e do showroom, em fundo
 * claro (padrão) ou escuro.
 */
export function Sobretitulo({ children, escuro = false }: { children: React.ReactNode; escuro?: boolean }) {
  return (
    <p className={`inline-flex items-center gap-3 text-xs tracking-[0.18em] uppercase font-semibold ${escuro ? "text-secondary" : "text-[#2347A0]"}`}>
      <span aria-hidden className="w-5 h-px bg-secondary" />
      {children}
    </p>
  );
}

export default function SecaoCabecalho({
  id, sobretitulo, titulo, texto, escuro = false, acao,
}: {
  id?: string;
  sobretitulo: string;
  titulo: string;
  texto?: string;
  escuro?: boolean;
  /** Botão ou link opcional, alinhado à direita no computador. */
  acao?: React.ReactNode;
}) {
  return (
    <div className="mb-8 lg:mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div className="max-w-2xl">
        <Sobretitulo escuro={escuro}>{sobretitulo}</Sobretitulo>
        <h2 id={id} className={`font-serif text-3xl lg:text-4xl font-normal leading-tight mt-3 ${escuro ? "text-white" : "text-primary"}`}>
          {titulo}
        </h2>
        {texto && <p className={`text-base leading-relaxed mt-3 ${escuro ? "text-white/70" : "text-on-surface-variant"}`}>{texto}</p>}
      </div>
      {acao && <div className="flex-shrink-0">{acao}</div>}
    </div>
  );
}
