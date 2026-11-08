import { acoesDaLoja, type PontoDeVenda } from "@/lib/pontos-de-venda";
import { nomeLugar } from "@/lib/projetos-tipos";
import { HORARIO_ROTULO_PDV, complementoLeitorPdv, notaFeriadoPdv } from "@/lib/onde-comprar-textos";
import { atributosDeMedicao, ondeFica } from "./apresentacao-pdv";
import { BOTAO_PDV_CHEIO, BOTAO_PDV_CLARO, IconeDaAcao } from "./IconesPdv";

/**
 * Lista das revendas, como no quadro aprovado (fase0/mapa.png): nome, "Bairro ·
 * endereço", horário com a nota de feriado e só dois botões numa linha,
 * WhatsApp e Como chegar (o primeiro cheio; sem WhatsApp, Como chegar é o
 * cheio). Selo, descrição, Waze e Instagram ficam só na folha.
 *
 * O caminho que funciona sem JavaScript e o acessível: o nome da loja é um
 * link `?loja=` (com JS a ilha abre a folha no lugar; sem JS, recarrega a
 * mesma página) e é por ele que o leitor de tela chega a Waze, Instagram e
 * descrição. Server Component; cada link externo leva os `data-pdv-*` que a
 * ilha mede com um ouvinte só. `flex flex-col` no <ul>: com `?loja=`, o
 * SCRIPT_ABERTURA_PDV põe a loja pedida em primeiro (order) antes da pintura.
 */
export default function ListaPdv({ pontos }: { pontos: PontoDeVenda[] }) {
  return (
    <ul className="ds-wrap flex list-none flex-col pb-24 pt-2 lg:w-auto lg:max-w-none lg:px-0 lg:pb-12 lg:pt-0" aria-label="Lojas em Manaus">
      {pontos.map((p) => {
        const nome = nomeLugar(p.name);
        const acoes = acoesDaLoja(p).filter((a) => a.tipo === "whatsapp" || a.tipo === "rota");
        const onde = ondeFica(p);
        return (
          <li key={p.slug} id={`loja-${p.slug}`} className="border-t border-[#e2e0da] py-5 lg:py-6">
            <h2 className="font-serif text-[21px] font-normal leading-tight text-primary">
              <a
                href={`?loja=${encodeURIComponent(p.slug)}`}
                className="underline decoration-primary/25 underline-offset-[5px] transition-colors hover:text-surface-tint hover:decoration-surface-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-surface-tint"
              >
                {nome}
              </a>
            </h2>
            {onde && <p className="mt-1 text-[15px] leading-[1.45] text-on-surface-variant">{onde}</p>}
            {p.horario && (
              <dl className="mt-3 text-[15px] leading-[1.45]">
                <dt className="text-legenda font-semibold text-on-surface-variant">{HORARIO_ROTULO_PDV}</dt>
                <dd className="text-on-surface">{p.horario}</dd>
                <dd className="text-legenda text-on-surface-variant">{notaFeriadoPdv(Boolean(p.whatsapp))}</dd>
              </dl>
            )}
            {/* Dois botões numa linha até 320 px: abaixo de 360, menos folga dentro e entre eles. */}
            <div className="mt-3.5 flex gap-2 max-[359px]:gap-1.5">
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
          </li>
        );
      })}
    </ul>
  );
}
