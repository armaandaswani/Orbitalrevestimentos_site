import Revelar from "@/components/projetos/Revelar";

// Selos do Painel Flexível em Fibra de Bambu (seção "Conheça o produto") — os
// mesmos do material comercial da Orbital, na mesma ordem e com o mesmo tom.
// Ícones do material da marca (vetorizados), em public/images/selos.
const PFB_SELOS: { t: string; d: string; img: string }[] = [
  { t: "Resistente à água", d: "Água, umidade e mofo", img: "agua" },
  { t: "Protegido contra pragas", d: "Cupins e outras pragas", img: "pragas" },
  { t: "Não propaga chamas", d: "Retardante de chamas", img: "chamas" },
  { t: "Instalação rápida", d: "Prática, com cola PU", img: "pu" },
  { t: "Materiais ecológicos", d: "Fibra de bambu renovável", img: "eco" },
  { t: "Flexível e durável", d: "Paredes e forros internos", img: "flex" },
];

/**
 * Versão curta (Academia): só os diferenciais, numa faixa de 6 (3×2 no
 * celular), com ícones menores e as medidas da placa. Sem o leque.
 * `tituloClassName` deixa a página usar a própria tipografia no título.
 */
export function DiferenciaisPfb({ tituloClassName }: { tituloClassName?: string }) {
  return (
    <section className="py-12 lg:py-20 bg-[#F6F5F2] text-[#0D1830]">
      <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
        <Revelar className="mb-8 lg:mb-10">
          <p className="text-[#2347A0] text-xs tracking-[0.2em] uppercase font-semibold mb-3">
            Conheça o produto
          </p>
          <h2 className={tituloClassName ?? "font-serif text-[#0B1F45] text-2xl lg:text-3xl font-normal"}>
            Painel Flexível em Fibra de Bambu (PFB)
          </h2>
        </Revelar>
        <ul className="grid grid-cols-3 lg:grid-cols-6 border-t border-l border-[#0D1830]/10 bg-white">
          {PFB_SELOS.map((f, i) => (
            <li key={f.t} className="border-r border-b border-[#0D1830]/10">
              <Revelar efeito="surge" ordem={i % 3} className="flex flex-col items-center text-center px-2 py-4 lg:py-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/images/selos/pfb-icone-${f.img}.svg`} alt="" width={28} height={28} loading="lazy" className="h-7 w-7 object-contain" />
                <span className="block text-[#0B1F45] text-[12px] lg:text-[13px] font-semibold leading-tight mt-2">{f.t}</span>
                <span className="hidden sm:block text-[#74777f] text-[12px] leading-snug mt-0.5">{f.d}</span>
              </Revelar>
            </li>
          ))}
        </ul>
        <p className="text-[#74777f] text-[13px] leading-relaxed mt-4">
          <span className="whitespace-nowrap">Placa de <strong className="text-[#0B1F45] font-semibold">1,20 × 2,90 m</strong></span> · <span className="whitespace-nowrap"><strong className="text-[#0B1F45] font-semibold">5 mm</strong> de espessura</span> · <span className="whitespace-nowrap"><strong className="text-[#0B1F45] font-semibold">3,48 m²</strong> por placa</span> · <span className="whitespace-nowrap">parede e forro</span>
        </p>
      </div>
    </section>
  );
}
