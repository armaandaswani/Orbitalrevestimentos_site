import { acoesDaLoja, type PontoComNome } from "@/lib/pontos-de-venda";
import { HORARIO_ROTULO_PDV, complementoLeitorPdv, notaFeriadoPdv } from "@/lib/onde-comprar-textos";
import { atributosDeMedicao, ondeFica } from "./apresentacao-pdv";
import { BOTAO_PDV_CHEIO, BOTAO_PDV_CLARO, IconeDaAcao } from "./IconesPdv";
import TrilhoPdv from "./TrilhoPdv";

/**
 * Lista das revendas (v2, 08/11/2026): cada loja mostra só o nome e o bairro.
 * O toque no cartão (o link `?loja=` do nome cobre o cartão inteiro) abre a
 * folha da loja (IlhaPdv → FolhaPdv), com o endereço, o horário, a descrição,
 * o WhatsApp, as rotas e o Instagram. No celular os cartões deslizam um por
 * vez e acendem o pino no mapa (`TrilhoPdv`); no computador, linhas finas.
 *
 * Sem JavaScript a folha não abre, então cada cartão leva também o bloco da v1
 * (bairro e endereço, horário com a nota de feriado e os botões WhatsApp e
 * Como chegar), que só aparece sem JavaScript (`.pdv-sem-js`: o
 * `SCRIPT_JS_PDV` da página liga `data-pdv-js` no `<html>` antes da pintura).
 * Cada link externo leva os `data-pdv-*` que a ilha mede. Com `?loja=`, o
 * SCRIPT_ABERTURA_PDV põe a loja pedida em primeiro (`order`) antes da pintura.
 */
export default function ListaPdv({ pontos }: { pontos: PontoComNome[] }) {
  return (
    <TrilhoPdv rotulo="Lojas em Manaus">
      {pontos.map((p) => {
        const nome = p.nomeCurto;
        const acoes = acoesDaLoja(p).filter((a) => a.tipo === "whatsapp" || a.tipo === "rota");
        const onde = ondeFica(p);
        return (
          <li key={p.slug} id={`loja-${p.slug}`} data-loja={p.slug} className="pdv-cartao group">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-serif text-[1.5rem] font-normal leading-[1.2] tracking-[-0.01em] text-primary lg:text-[1.375rem]">
                  <a
                    href={`?loja=${encodeURIComponent(p.slug)}`}
                    className="pdv-cartao-link decoration-primary/30 underline-offset-[5px] group-hover:underline focus-visible:outline-none"
                  >
                    {nome}
                  </a>
                </h2>
                {p.bairro && <p className="mt-1 text-[0.875rem] leading-5 text-on-surface-variant">{p.bairro}</p>}
              </div>
              <span aria-hidden="true" className="pfb-mais mt-1 text-[1.375rem] leading-none text-primary">
                +
              </span>
            </div>
            <div className="pdv-sem-js">
              {onde && <p className="mt-2 text-[15px] leading-[1.45] text-on-surface-variant">{onde}</p>}
              {p.horario && (
                <dl className="mt-3 text-[15px] leading-[1.45]">
                  <dt className="text-legenda font-semibold text-on-surface-variant">{HORARIO_ROTULO_PDV}</dt>
                  <dd className="text-on-surface">{p.horario}</dd>
                  <dd className="text-legenda text-on-surface-variant">{notaFeriadoPdv(Boolean(p.whatsapp))}</dd>
                </dl>
              )}
              <div className="relative z-10 mt-3.5 flex gap-2 max-[359px]:gap-1.5">
                {acoes.map((a, i) => (
                  <a
                    key={a.tipo}
                    href={a.href}
                    target="_blank"
                    rel="noopener"
                    className={`${i === 0 ? BOTAO_PDV_CHEIO : BOTAO_PDV_CLARO} max-[359px]:gap-1.5 max-[359px]:px-3`}
                    {...atributosDeMedicao(a, p.slug)}
                  >
                    <IconeDaAcao tipo={a.tipo} />
                    {a.rotulo}
                    <span className="sr-only">{complementoLeitorPdv(a.tipo, nome)}</span>
                  </a>
                ))}
              </div>
            </div>
          </li>
        );
      })}
    </TrilhoPdv>
  );
}
