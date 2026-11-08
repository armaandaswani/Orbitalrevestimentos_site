import { acoesDaLoja, type PontoDeVenda } from "@/lib/pontos-de-venda";
import { nomeLugar } from "@/lib/projetos-tipos";
import { HORARIO_ROTULO_PDV, SELO_PDV, VER_NO_MAPA_PDV, notaFeriadoPdv } from "@/lib/onde-comprar-textos";
import { atributosDeMedicao, ondeFica, temPino, SIMBOLO_SELO } from "./apresentacao-pdv";
import { BOTAO_PDV_CHEIO, BOTAO_PDV_CLARO, BOTAO_PDV_VAZADO, IconeDaAcao } from "./IconesPdv";

/**
 * Lista das revendas: o caminho que funciona sem JavaScript e o acessível.
 * Server Component; cada link externo leva os `data-pdv-*` que a ilha mede
 * com um ouvinte só. "Ver no mapa" é um link `?loja=` comum: com JS a ilha
 * abre a folha no lugar; sem JS, recarrega a mesma página.
 */
export default function ListaPdv({ pontos }: { pontos: PontoDeVenda[] }) {
  return (
    <ul className="ds-wrap list-none pb-12 pt-2 lg:w-auto lg:max-w-none lg:px-0 lg:pt-0" aria-label="Lojas em Manaus">
      {pontos.map((p) => {
        const acoes = acoesDaLoja(p);
        const onde = ondeFica(p);
        return (
          <li key={p.slug} id={`loja-${p.slug}`} className="border-t border-[#e2e0da] py-5 lg:py-6">
            <p className="flex items-center gap-2 text-legenda font-semibold text-on-secondary-container">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SIMBOLO_SELO} alt="" width={18} height={18} decoding="async" className="h-[18px] w-[18px]" />
              {SELO_PDV}
            </p>
            <h2 className="mt-1.5 font-serif text-[21px] font-normal leading-tight text-primary">{nomeLugar(p.name)}</h2>
            {onde && <p className="mt-1 text-[15px] leading-[1.45] text-on-surface-variant">{onde}</p>}
            {p.horario && (
              <dl className="mt-3 text-[15px] leading-[1.45]">
                <dt className="text-legenda font-semibold text-on-surface-variant">{HORARIO_ROTULO_PDV}</dt>
                <dd className="text-on-surface">{p.horario}</dd>
                <dd className="text-legenda text-on-surface-variant">{notaFeriadoPdv(Boolean(p.whatsapp))}</dd>
              </dl>
            )}
            {p.description && <p className="mt-3 text-[15px] leading-[1.45] text-on-surface">{p.description}</p>}
            <div className="mt-3.5 flex flex-wrap gap-2">
              {acoes.map((a) => (
                <a
                  key={a.tipo}
                  href={a.href}
                  target="_blank"
                  rel="noopener"
                  className={a.tipo === "whatsapp" ? BOTAO_PDV_CHEIO : a.tipo === "instagram" ? BOTAO_PDV_VAZADO : BOTAO_PDV_CLARO}
                  {...atributosDeMedicao(a, p.slug)}
                >
                  <IconeDaAcao tipo={a.tipo} />
                  {a.rotulo}
                </a>
              ))}
              {temPino(p) && (
                <a href={`?loja=${encodeURIComponent(p.slug)}`} className={BOTAO_PDV_VAZADO} aria-label={`${VER_NO_MAPA_PDV}: ${nomeLugar(p.name)}`}>
                  {VER_NO_MAPA_PDV}
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
