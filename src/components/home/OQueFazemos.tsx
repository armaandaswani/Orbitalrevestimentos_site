import Trilho from "@/components/projetos/Trilho";
import Revelar from "@/components/projetos/Revelar";

/**
 * O que a Orbital faz, na ordem em que acontece: da fábrica até a obra. Os
 * números contam a sequência. Fonte: vault › Quem somos e História e símbolo.
 * Num trilho de lado, para o celular ver uma etapa por vez sem descer a página.
 */
const ETAPAS = [
  { titulo: "Curadoria", texto: "Percorremos fábricas e fornecedores pelo mundo atrás de materiais que resolvem um problema real do nosso mercado." },
  { titulo: "Fabricação com padrão Orbital", texto: "Produzimos em fábricas parceiras certificadas, com matéria-prima certificada, e só vendemos materiais originais Orbital." },
  { titulo: "Importação e logística própria", texto: "Somos nós que importamos. Trazemos até Manaus e levamos até a porta do cliente." },
  { titulo: "Estoque em Manaus", texto: "O material fica em Manaus, em pronta-entrega, sem espera de frete de fora." },
  { titulo: "Validação na região", texto: "Testamos aqui e fazemos estudos em laboratório na região, com ensaios, relatórios e ART." },
  { titulo: "Formação", texto: "A Academia Orbital forma profissionais para aplicar os nossos materiais no padrão Orbital." },
];

export default function OQueFazemos() {
  return (
    <section aria-labelledby="o-que-fazemos" className="ds-secao bg-[#0B1F45] text-white ds-escuro overflow-hidden">
      <div className="ds-wrap">
        <Revelar className="mb-10 lg:mb-14 max-w-2xl">
          <h2 id="o-que-fazemos" className="font-serif text-t1 font-normal tracking-[-0.02em] text-balance">Da fábrica até a sua obra.</h2>
          <p className="mt-4 text-lead text-white/75 text-pretty">
            Fábrica, importação, estoque, testes e formação: cuidamos de cada etapa até o material chegar à obra.
          </p>
        </Revelar>
        <Trilho rotulo="O que a Orbital faz" escuro largura="w-[78%] sm:w-[44%] lg:w-[30%]">
          {ETAPAS.map((e, i) => (
            <div key={e.titulo} className="h-full border-t border-white/25 pt-6 pr-4">
              <p aria-hidden className="font-serif text-[2.75rem] leading-none text-white/25 tabular-nums">{i + 1}</p>
              <h3 className="mt-6 font-serif text-t3 text-white">{e.titulo}</h3>
              <p className="mt-3 text-corpo text-white/70 text-pretty">{e.texto}</p>
            </div>
          ))}
        </Trilho>
      </div>
    </section>
  );
}
