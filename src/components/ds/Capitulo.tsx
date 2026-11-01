/**
 * Um capítulo da apresentação: uma <section> com id (âncora), número e rótulo
 * que o ProgressoCapitulos lê do próprio DOM (data-capitulo / data-numero).
 * Server component: não traz JavaScript.
 */
export default function Capitulo({
  id, numero, rotulo, children, className = "", escuro = false, rotuladoPor,
}: {
  id: string;
  numero: string;
  rotulo: string;
  children: React.ReactNode;
  className?: string;
  escuro?: boolean;
  /** id do título da seção (aria-labelledby). */
  rotuladoPor?: string;
}) {
  return (
    <section id={id} data-capitulo={rotulo} data-numero={numero} aria-labelledby={rotuladoPor}
      className={`relative scroll-mt-20 ${escuro ? "ds-escuro" : ""} ${className}`}>
      {children}
    </section>
  );
}
