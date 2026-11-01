/**
 * Abertura de uma seção: sobretítulo com o traço verde (e, nos capítulos da
 * apresentação, o número), título e uma linha de apoio. Mesma peça em toda
 * seção da home, da página de Projetos e do showroom, em fundo claro (padrão)
 * ou escuro. Tipografia fluida (text-t2 / text-lead).
 */
export function Sobretitulo({ children, escuro = false, numero }: { children: React.ReactNode; escuro?: boolean; numero?: string }) {
  return (
    <p className={`inline-flex items-center gap-3 text-sobre tracking-[0.18em] uppercase font-semibold ${escuro ? "text-secondary" : "text-[#2347A0]"}`}>
      {numero
        ? <span className={`font-serif normal-case tracking-normal text-sm ${escuro ? "text-white/70" : "text-primary/60"}`}>{numero}</span>
        : null}
      <span aria-hidden className="w-6 h-px bg-secondary" />
      {children}
    </p>
  );
}

export default function SecaoCabecalho({
  id, sobretitulo, titulo, texto, escuro = false, acao, numero, centro = false,
}: {
  id?: string;
  sobretitulo: string;
  titulo: React.ReactNode;
  texto?: React.ReactNode;
  escuro?: boolean;
  /** Botão ou link opcional, alinhado à direita no computador. */
  acao?: React.ReactNode;
  /** Número do capítulo ("03"), quando a seção faz parte da apresentação. */
  numero?: string;
  centro?: boolean;
}) {
  return (
    <div className={`mb-[clamp(2rem,1.4rem+2vw,3.5rem)] flex flex-col gap-5 ${centro ? "items-center text-center" : "md:flex-row md:items-end md:justify-between"}`}>
      <div className={centro ? "max-w-3xl" : "max-w-2xl"}>
        <Sobretitulo escuro={escuro} numero={numero}>{sobretitulo}</Sobretitulo>
        <h2 id={id} className={`font-serif text-t2 font-normal tracking-[-0.02em] mt-4 text-balance ${escuro ? "text-white" : "text-primary"}`}>
          {titulo}
        </h2>
        {texto && <p className={`text-lead mt-4 text-pretty ${escuro ? "text-white/75" : "text-on-surface-variant"}`}>{texto}</p>}
      </div>
      {acao && <div className="flex-shrink-0">{acao}</div>}
    </div>
  );
}
