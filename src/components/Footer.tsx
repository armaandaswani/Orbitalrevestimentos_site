import Link from "next/link";
import ContatoCta from "@/components/ContatoCta";

/**
 * Rodapé do site. A assinatura oficial ("Novas possibilidades para seus
 * projetos.") fecha a apresentação; a Orbital se apresenta só pelos próprios
 * méritos. O endereço da empresa não aparece: o PFB se vê nos showrooms
 * parceiros, na revenda ou numa visita do consultor ao escritório.
 */
const colunaTitulo = "text-sobre tracking-[0.14em] uppercase font-semibold text-[#9c9faa] mb-4";
const item = "inline-flex items-center min-h-8 text-sm text-[#c9ccd6] hover:text-white transition-colors";

export default function Footer() {
  return (
    <footer className="bg-[#0B1F45] text-white ds-escuro">
      <div className="ds-wrap py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-8 lg:gap-12">

          {/* Marca e assinatura */}
          <div className="col-span-2 md:col-span-4">
            {/* Assinatura em negativo: texto branco e globo em Azul Vivo, só
                sobre o azul-noite (manual da marca). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/brand/orbital-assinatura-negativo.svg" alt="Orbital Revestimentos" width={144} height={45} loading="lazy" className="h-[45px] w-auto mb-6" />
            <p className="font-serif text-t3 leading-snug text-white mb-4 text-balance">
              Novas possibilidades para seus projetos.
            </p>
            <p className="text-[#c9ccd6] text-corpo leading-relaxed mb-2">
              Fornecedor exclusivo do Painel Flexível em Fibra de Bambu (PFB) em Manaus, Amazonas: revestimento
              para paredes e forros internos, pensado para o clima amazônico.
            </p>
            <p className="text-[#9c9faa] text-sm italic mb-6">Instalado em horas. Admirado por anos.</p>
            <ContatoCta className="ds-botao bg-[#36A35C] text-[#0B1F45] hover:bg-[#4BB571]">
              Falar com um consultor
            </ContatoCta>
          </div>

          {/* Navegação */}
          <div className="col-span-1 md:col-span-2 md:col-start-6">
            <p className={colunaTitulo}>Navegação</p>
            <nav aria-label="Rodapé" className="flex flex-col gap-1">
              {[
                { href: "/", label: "Início" },
                { href: "/produtos", label: "Produtos" },
                { href: "/tecnologia", label: "Tecnologia PFB" },
                { href: "/projetos", label: "Projetos" },
                { href: "/parcerias", label: "Parcerias" },
                { href: "/visualizador", label: "Simulador" },
                { href: "/sobre", label: "Sobre a Orbital" },
                { href: "/nossa-historia", label: "Nossa história" },
              ].map(({ href, label }) => (
                <Link key={label} href={href} className={item}>{label}</Link>
              ))}
            </nav>
          </div>

          {/* Profissionais */}
          <div className="col-span-1 md:col-span-2">
            <p className={colunaTitulo}>Profissionais</p>
            <div className="flex flex-col gap-1">
              <Link href="/parcerias" className={item}>Arquitetos</Link>
              <Link href="/parcerias" className={item}>Designers de Interiores</Link>
              <Link href="/parcerias" className={item}>Marceneiros</Link>
              <Link href="/parcerias" className={item}>Engenheiros</Link>
              <Link href="/parcerias" className={item}>Revendedores</Link>
              <Link href="/academia" className={item}>Aplicadores e Instaladores</Link>
              <div className="mt-3 pt-3 border-t border-[#333640] flex flex-col gap-1">
                <Link href="/parceiro" className={`${item} font-medium text-white/90`}>Portal do Parceiro →</Link>
                <Link href="/academia" className={`${item} font-medium text-white/90`}>Academia Orbital →</Link>
              </div>
            </div>
          </div>

          {/* Onde ver o PFB */}
          <div className="col-span-2 md:col-span-2">
            <p className={colunaTitulo}>Onde ver o PFB</p>
            <div className="flex flex-col gap-1">
              <Link href="/projetos#parceiros" className={item}>Showrooms parceiros</Link>
              <Link href="/projetos#revenda" className={item}>Casa do Eletricista (revenda)</Link>
              <Link href="/projetos#obras" className={item}>Obras em Manaus</Link>
              <p className="text-[#c9ccd6] text-sm leading-snug mt-2">Ou peça a visita de um consultor com as amostras no seu escritório.</p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#333640]">
              <p className={colunaTitulo}>Instagram</p>
              <a href="https://instagram.com/orbitalrevestimentos" target="_blank" rel="noopener noreferrer" className={item}>
                @orbitalrevestimentos
              </a>
            </div>
          </div>

        </div>

        {/* Faixa final */}
        <div className="border-t border-[#333640] mt-12 pt-8 flex flex-col gap-3 md:flex-row md:justify-between md:items-center md:gap-4">
          <p className="text-sobre text-[#9c9faa]">
            © 2026 Orbital Revestimentos · Manaus, AM · Todos os direitos reservados.
          </p>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-5">
            <p className="text-sobre text-[#9c9faa] italic">
              Revestimento de parede e forro interno · PFB · Feito para a Amazônia
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 md:border-l md:border-[#333640] md:pl-5">
              <Link href="/privacidade" className="inline-flex items-center min-h-8 text-sobre text-[#9c9faa] hover:text-white transition-colors tracking-[0.08em] uppercase">Privacidade</Link>
              <Link href="/termos" className="inline-flex items-center min-h-8 text-sobre text-[#9c9faa] hover:text-white transition-colors tracking-[0.08em] uppercase">Termos de Uso</Link>
              <Link href="/representante" className="inline-flex items-center min-h-8 text-sobre text-[#8a8d97] hover:text-[#c9ccd6] transition-colors tracking-[0.08em] uppercase">Representante</Link>
              <Link href="/admin" className="inline-flex items-center min-h-8 text-sobre text-[#8a8d97] hover:text-[#c9ccd6] transition-colors tracking-[0.08em] uppercase">Admin</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
