import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#1e212a] text-white">
      <div className="max-w-[1280px] mx-auto px-8 lg:px-16 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          {/* Brand */}
          <div className="md:col-span-4">
            <div className="text-xl font-bold tracking-[0.22em] font-[var(--font-noto-serif)] mb-4">
              ORBITAL
            </div>
            <p className="text-[#9c9faa] text-sm leading-relaxed mb-6 font-[var(--font-inter)]">
              Revestimentos eco-premium de Placas Flexíveis de Bambu.
              Instalado em horas. Admirado por anos.
            </p>
            <a
              href="https://wa.me/5592988150149"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#3b6934] text-white text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] px-5 py-3 hover:bg-[#2d5228] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp (92) 98815-0149
            </a>
          </div>

          {/* Links */}
          <div className="md:col-span-2 md:col-start-6">
            <p className="text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] text-[#9c9faa] mb-5">
              Navegação
            </p>
            <nav className="flex flex-col gap-3">
              {[
                { href: "/", label: "Home" },
                { href: "/produtos", label: "Produtos" },
                { href: "/tecnologia", label: "Tecnologia" },
                { href: "/projetos", label: "Projetos" },
                { href: "/contato", label: "Contato" },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-sm text-[#9c9faa] hover:text-white transition-colors font-[var(--font-inter)]"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Info */}
          <div className="md:col-span-3">
            <p className="text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] text-[#9c9faa] mb-5">
              Informações
            </p>
            <div className="flex flex-col gap-3 text-sm text-[#9c9faa] font-[var(--font-inter)]">
              <div>
                <p className="text-white font-medium mb-1">Showroom</p>
                <p>Manaus, Amazonas</p>
              </div>
              <div>
                <p className="text-white font-medium mb-1">Instagram</p>
                <a
                  href="https://instagram.com/orbital.revestimentos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  @orbital.revestimentos
                </a>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="md:col-span-3">
            <p className="text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] text-[#9c9faa] mb-5">
              Produto
            </p>
            <div className="flex flex-col gap-2 text-sm text-[#9c9faa] font-[var(--font-inter)]">
              <p>3 Linhas · 15 Acabamentos</p>
              <p>5mm · 1,2m × 2,9m</p>
              <p>Pronta-entrega</p>
              <p className="mt-2 italic text-xs">
                Somos fornecedores diretos —<br />não fazemos instalação.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-[#333640] mt-12 pt-8 flex flex-col md:flex-row justify-between gap-4">
          <p className="text-xs text-[#9c9faa] font-[var(--font-inter)]">
            © 2026 Orbital Revestimentos. Todos os direitos reservados.
          </p>
          <p className="text-xs text-[#9c9faa] font-[var(--font-inter)] italic">
            Orbital · Catálogo Varejo 2026 · Dados sujeitos a alteração sem aviso prévio.
          </p>
        </div>
      </div>
    </footer>
  );
}
