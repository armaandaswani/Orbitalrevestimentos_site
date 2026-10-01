import type { ReactNode } from "react";

/**
 * Moldura das páginas institucionais de texto (Privacidade, Termos de Uso):
 * faixa azul-marinho com título e data, seguida de seções numeradas.
 */

export type SecaoLegal = { titulo: string; corpo: ReactNode };

export const EMPRESA = {
  razao: "Orbital Materiais de Construção LTDA",
  cnpj: "58.013.651/0001-04",
  endereco: "Avenida Visconde de Porto Alegre, 130, Sala 1 – Centro, Manaus/AM, CEP 69010-125",
  email: "orbitalrevestimentos@gmail.com",
  whatsapp: "(92) 98815-0149",
};

export default function PaginaLegal({
  titulo,
  atualizado,
  intro,
  secoes,
}: {
  titulo: string;
  atualizado: string;
  intro: ReactNode;
  secoes: SecaoLegal[];
}) {
  return (
    <>
      <section className="bg-[#002045] text-white pt-28 pb-12 lg:pt-36 lg:pb-16">
        <div className="max-w-[800px] mx-auto px-4 lg:px-8">
          <p className="text-[#a1d494] text-[10px] tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-4">
            Orbital Revestimentos
          </p>
          <h1 className="font-serif text-3xl lg:text-5xl font-normal leading-tight tracking-[-0.02em] mb-4">{titulo}</h1>
          <p className="text-white/60 text-xs font-[var(--font-inter)]">Última atualização: {atualizado}</p>
        </div>
      </section>

      <section className="bg-white py-12 lg:py-16">
        <div className="max-w-[800px] mx-auto px-4 lg:px-8 font-[var(--font-inter)] text-[#43474e] text-[15px] leading-relaxed">
          <div className="space-y-4 mb-10">{intro}</div>

          <nav aria-label="Seções" className="border border-[#e2e2e2] bg-[#f9f9f9] p-5 mb-12">
            <p className="text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f] mb-3">Nesta página</p>
            <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              {secoes.map((s, i) => (
                <li key={s.titulo}>
                  <a href={`#secao-${i + 1}`} className="text-[#002045] hover:underline">
                    {i + 1}. {s.titulo}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="space-y-10">
            {secoes.map((s, i) => (
              <section key={s.titulo} id={`secao-${i + 1}`} className="scroll-mt-28">
                <h2 className="font-serif text-[#002045] text-xl lg:text-2xl font-normal mb-3">
                  {i + 1}. {s.titulo}
                </h2>
                <div className="space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-[#002045] [&_a]:underline [&_strong]:text-[#1a1c1c]">
                  {s.corpo}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
