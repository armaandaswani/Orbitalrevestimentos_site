import Link from "next/link";
import ContatoCta from "@/components/ContatoCta";
import type { ProdutoContato, RespostasContato } from "@/lib/contato";

/**
 * O botão do site, numa peça só. Cinco tons (ds-botao-* em globals.css):
 * cheio (azul-noite), vazado (contorno azul), claro (branco, sobre fundo
 * escuro), linha (contorno branco, sobre fundo escuro) e verde (Verde Bambu,
 * a conversão da Academia).
 *
 * - `href` → link (next/link; externo com target="_blank" quando `externo`).
 * - `contato` → abre o pré-contato (ContatoCta), nunca um link cru de WhatsApp.
 * - sem os dois → <button type="button"> com `onClick`.
 *
 * `seta` acrescenta a seta que desliza no hover (mv-seta). Server component.
 */
export type TomBotao = "cheio" | "vazado" | "claro" | "linha" | "verde";

interface Base {
  tom?: TomBotao;
  seta?: boolean;
  /** Altura 48 px (3rem) em vez de 44 px: o botão principal de uma seção. */
  grande?: boolean;
  /** Ocupa a largura toda no celular. */
  largo?: boolean;
  className?: string;
  children: React.ReactNode;
}

type Props = Base & (
  | { href: string; externo?: boolean; contato?: never; onClick?: never }
  | { contato: true; produtos?: ProdutoContato[]; inicial?: RespostasContato; href?: never; onClick?: () => void }
  | { href?: never; contato?: never; onClick?: () => void; type?: "button" | "submit" }
);

const Seta = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="mv-seta"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
);

export default function Botao(props: Props) {
  const { tom = "cheio", seta = false, grande = false, largo = false, className = "", children } = props;
  const classe = `ds-botao ds-botao-${tom} ${grande ? "min-h-12" : ""} ${largo ? "w-full sm:w-auto" : ""} ${className}`.trim();
  const miolo = <>{children}{seta && <Seta />}</>;
  if ("href" in props && props.href) {
    if (props.externo) return <a href={props.href} target="_blank" rel="noopener noreferrer" className={classe}>{miolo}</a>;
    return <Link href={props.href} className={classe}>{miolo}</Link>;
  }
  if ("contato" in props && props.contato) {
    return <ContatoCta produtos={props.produtos} inicial={props.inicial} onClick={props.onClick} className={classe}>{miolo}</ContatoCta>;
  }
  const { onClick, type = "button" } = props as { onClick?: () => void; type?: "button" | "submit" };
  return <button type={type} onClick={onClick} className={classe}>{miolo}</button>;
}
