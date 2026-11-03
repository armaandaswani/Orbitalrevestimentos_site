import { cena } from "@/lib/techstone";

/** Cena em tela cheia com recorte próprio para celular (retrato) e computador. */
export default function Cena({ nome, alt, prioridade = false, carregar, className = "" }: {
  nome: string;
  alt: string;
  /** A imagem da abertura: carrega primeiro. */
  prioridade?: boolean;
  carregar?: "eager" | "lazy";
  className?: string;
}) {
  const src = cena(nome);
  return (
    <picture>
      <source media="(max-width: 767px)" srcSet={src.mobile} />
      <img
        src={src.desktop}
        alt={alt}
        loading={carregar ?? (prioridade ? "eager" : "lazy")}
        fetchPriority={prioridade ? "high" : undefined}
        decoding="async"
        className={`absolute inset-0 w-full h-full object-cover ${className}`}
      />
    </picture>
  );
}
