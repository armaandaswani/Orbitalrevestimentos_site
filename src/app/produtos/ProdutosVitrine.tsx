"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Botao from "@/components/ds/Botao";
import Capitulo from "@/components/ds/Capitulo";
import ProgressoCapitulos from "@/components/ds/ProgressoCapitulos";
import ModeloCard from "@/components/produtos/ModeloCard";
import ModeloFolha from "@/components/produtos/ModeloFolha";
import GrupoChips from "@/components/projetos/GrupoChips";
import ProjetoCard from "@/components/projetos/ProjetoCard";
import Revelar from "@/components/projetos/Revelar";
import SecaoCabecalho, { Sobretitulo } from "@/components/projetos/SecaoCabecalho";
import Trilho from "@/components/projetos/Trilho";
import { normalizeProductCode, productPath } from "@/lib/product-link";
import { modelosDoProjeto } from "@/lib/projeto-modelos";
import type { LinhaProduto, Produto } from "@/lib/produtos-dados";
import { porDestaque, type Projeto } from "@/lib/projetos-tipos";

const CATALOGUE_URL = "https://drive.google.com/file/d/1zhm5MgKGSDRThqk8FqqwfX-WijI7K-iD/view?usp=drive_link";

/**
 * Catálogo como apresentação: abertura → 01 Coleção (grade de modelos, com
 * filtro por linha) → 02 Linhas → 03 Em projetos → 04 Próximo passo.
 *
 * A ficha de um modelo abre numa folha por cima (?modelo=orb-003): é o mesmo
 * endereço dos QR Codes impressos e do "compartilhar"; voltar fecha; um
 * código que saiu do catálogo deixa um aviso em vez de página quebrada.
 * Sem JavaScript, cada cartão é um link para o mesmo endereço.
 */
type Filtro = "todos" | LinhaProduto;

const LINHAS: { key: LinhaProduto; sub: string; texto: string; img: string }[] = [
  { key: "Classic", sub: "Mármore fosco", texto: "Elegância discreta: acabamento fosco, sem reflexo, com veios naturais. Vai bem em qualquer iluminação.", img: "/images/catalogue/classic-branco-calacatta-orb006.jpeg" },
  { key: "Brilliance", sub: "Mármore polido", texto: "Veios marcados e acabamento espelhado: a luz reflete e o ambiente ganha amplitude. Para projetos de impacto.", img: "/images/catalogue/brilliance-gris-pietra-orb009.jpeg" },
  { key: "Elegance", sub: "Madeira texturizada", texto: "Calor natural com textura tátil: a alma da madeira, sem verniz, sem lixamento, sem manutenção.", img: "/images/catalogue/elegance-imbuia-orb002.jpeg" },
];

function lerModelo(): string {
  return normalizeProductCode(new URLSearchParams(window.location.search).get("modelo") ?? "");
}

export default function ProdutosVitrine({ produtos, projetos }: { produtos: Produto[]; projetos: Projeto[] }) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [codigo, setCodigo] = useState("");
  const [ausente, setAusente] = useState<string | null>(null);

  const lista = filtro === "todos" ? produtos : produtos.filter((p) => p.linha === filtro);
  const aberto = codigo ? produtos.find((p) => normalizeProductCode(p.code) === codigo) ?? null : null;
  const pos = aberto ? lista.indexOf(aberto) : -1;
  const navegaveis = pos >= 0 ? lista : produtos;
  const posAberto = aberto ? navegaveis.indexOf(aberto) : -1;

  // Projetos por modelo (código principal ou extra), em ordem de destaque.
  const projetosPorCodigo = useMemo(() => {
    const m = new Map<string, Projeto[]>();
    for (const p of [...projetos].sort(porDestaque)) {
      for (const c of modelosDoProjeto(p)) {
        const k = normalizeProductCode(c);
        if (!m.has(k)) m.set(k, []);
        m.get(k)!.push(p);
      }
    }
    return m;
  }, [projetos]);
  const comObra = useMemo(() => {
    const vistas = new Set<string>();
    return [...projetos].sort(porDestaque).filter((p) => !p.showroom_id && !vistas.has(p.image_after) && vistas.add(p.image_after)).slice(0, 10);
  }, [projetos]);

  const ir = useCallback((p: Produto | null, modo: "push" | "replace") => {
    const url = p ? productPath(p.code) : "/produtos";
    const atual = (window.history.state?.visor as number | undefined) ?? 0;
    window.history[modo === "push" ? "pushState" : "replaceState"]({ ...(window.history.state ?? {}), visor: modo === "push" ? atual + 1 : atual }, "", url);
    setCodigo(p ? normalizeProductCode(p.code) : "");
  }, []);
  const abrir = (p: Produto) => ir(p, "push");
  const fechar = () => {
    if (((window.history.state?.visor as number | undefined) ?? 0) > 0) window.history.back();
    else ir(null, "replace");
  };

  // Link direto (QR, compartilhar) e voltar/avançar do navegador.
  useEffect(() => {
    const sincronizar = () => {
      const quer = lerModelo();
      setCodigo(quer);
      if (quer && !produtos.some((p) => normalizeProductCode(p.code) === quer)) setAusente(quer.toUpperCase());
    };
    const t = setTimeout(sincronizar, 0);
    window.addEventListener("popstate", sincronizar);
    return () => { clearTimeout(t); window.removeEventListener("popstate", sincronizar); };
  }, [produtos]);

  const chips = [
    { valor: "todos", rotulo: "Todos", conta: produtos.length },
    ...LINHAS.map((l) => ({ valor: l.key, rotulo: l.key, conta: produtos.filter((p) => p.linha === l.key).length })),
  ].filter((c) => c.conta > 0);

  const verLinha = (l: Filtro) => {
    setFiltro(l);
    document.getElementById("colecao")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  return (
    <div className="pt-20">
      <ProgressoCapitulos />
      {aberto && (
        <ModeloFolha produto={aberto} projetos={projetosPorCodigo.get(normalizeProductCode(aberto.code)) ?? []}
          posicao={`${posAberto + 1} / ${navegaveis.length}`}
          anterior={posAberto > 0 ? navegaveis[posAberto - 1] : null}
          proximo={posAberto >= 0 && posAberto < navegaveis.length - 1 ? navegaveis[posAberto + 1] : null}
          onFechar={fechar} onIr={(p) => ir(p, "replace")} />
      )}

      {ausente && (
        <div className="bg-[#fdf6e7] border-b border-[#f0e0b8]" role="status">
          <div className="ds-wrap py-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[#7a5c00] text-legenda">O modelo <strong>{ausente}</strong> não está mais no catálogo. Veja abaixo os acabamentos atuais.</p>
            <button type="button" onClick={() => setAusente(null)} className="min-h-11 px-2 text-[#7a5c00] text-xs tracking-[0.1em] uppercase font-bold hover:underline">Fechar</button>
          </div>
        </div>
      )}

      {/* ── Abertura ───────────────────────────────────────────────────────── */}
      <section className="bg-[#0B1F45] text-white ds-escuro">
        <div className="ds-wrap pt-10 pb-10 lg:py-16 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-14 items-center">
          <div>
            <Sobretitulo escuro>Orbital Revestimentos · Catálogo 2026</Sobretitulo>
            <h1 className="font-serif text-white text-t1 font-normal tracking-[-0.025em] mt-4 mb-4 text-balance">
              Catálogo de acabamentos do Painel Flexível em Fibra de Bambu (PFB)
            </h1>
            <p className="text-white/75 text-lead max-w-xl text-pretty">
              3 linhas, 15 acabamentos em pronta-entrega em Manaus. Toque em um modelo para ver as fotos, a placa e os ambientes onde ele já foi aplicado.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-7">
              <Botao href="#colecao" tom="claro" largo>Ver os modelos</Botao>
              <Botao href={CATALOGUE_URL} externo tom="linha" largo>Baixar catálogo</Botao>
            </div>
          </div>
          <ul className="grid grid-cols-3 gap-2">
            {LINHAS.map((l) => (
              <li key={l.key}>
                <button type="button" onClick={() => verLinha(l.key)} className="group block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary">
                  <span className="relative block aspect-[4/5] overflow-hidden bg-primary-container">
                    <Image src={l.img} alt="" fill sizes="(max-width: 1023px) 30vw, 180px" className="object-cover mv-zoom" />
                  </span>
                  <span className="block mt-2 text-sobre tracking-[0.12em] uppercase font-bold">{l.key}</span>
                  <span className="block text-white/65 text-sobre">{l.sub}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 01 Coleção ─────────────────────────────────────────────────────── */}
      <Capitulo id="colecao" numero="01" rotulo="Coleção" rotuladoPor="colecao-titulo" className="ds-secao bg-background">
        <div className="ds-wrap">
          <Revelar>
            <SecaoCabecalho id="colecao-titulo" numero="01" sobretitulo="A coleção" titulo="15 acabamentos, uma só placa."
              texto="Placa de 2,90 × 1,20 m com 5 mm, para paredes e forros. Escolha o acabamento; valores e condições ficam com o consultor." />
          </Revelar>
          <div className="mb-8">
            <GrupoChips rotulo="Linha" ativo={filtro} onMudar={(v) => setFiltro(v as Filtro)} opcoes={chips} />
          </div>
          {lista.length === 0 ? (
            <p className="text-on-surface-variant text-corpo py-10 text-center">Os modelos aparecem aqui em breve.</p>
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2" aria-live="polite">
              {lista.map((p, i) => (
                <Revelar key={p.id} como="li" ordem={i % 4}>
                  <ModeloCard produto={p} href={productPath(p.code)} onAbrir={abrir} prioridade={i < 4} />
                </Revelar>
              ))}
            </ul>
          )}
          <p className="text-on-surface-variant text-corpo italic text-center mt-10">
            Imagens ilustrativas — cores podem variar. Veja o material ao vivo em um showroom parceiro ou peça uma amostra ao consultor.
          </p>
        </div>
      </Capitulo>

      {/* ── 02 Linhas ──────────────────────────────────────────────────────── */}
      <Capitulo id="linhas" numero="02" rotulo="Linhas" rotuladoPor="linhas-titulo" className="ds-secao bg-white">
        <div className="ds-wrap">
          <Revelar>
            <SecaoCabecalho id="linhas-titulo" numero="02" sobretitulo="Três linhas" titulo="Mármore fosco, mármore polido e madeira."
              texto="A mesma placa, três famílias de acabamento. Todas resistem à umidade e ao calor de Manaus e vão para paredes e forros." />
          </Revelar>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
            {LINHAS.map((l, i) => {
              const n = produtos.filter((p) => p.linha === l.key).length;
              return (
                <Revelar key={l.key} como="li" ordem={i} className="border border-surface-variant flex flex-col">
                  <span className="relative block aspect-[3/2] overflow-hidden bg-surface-container">
                    <Image src={l.img} alt={`Linha ${l.key}: ${l.sub}`} fill sizes="(max-width: 767px) 92vw, 400px" className="object-cover" />
                  </span>
                  <div className="p-5 lg:p-6 flex flex-col flex-1">
                    <Sobretitulo>{n > 0 ? `${n} ${n === 1 ? "acabamento" : "acabamentos"}` : "Linha"}</Sobretitulo>
                    <h3 className="font-serif text-primary text-t3 font-normal mt-3">{l.key} — {l.sub}</h3>
                    <p className="text-on-surface-variant text-corpo mt-2 flex-1 text-pretty">{l.texto}</p>
                    <div className="mt-5">
                      <Botao tom="vazado" onClick={() => verLinha(l.key)} seta>Ver a linha {l.key}</Botao>
                    </div>
                  </div>
                </Revelar>
              );
            })}
          </ul>
        </div>
      </Capitulo>

      {/* ── 03 Em projetos ─────────────────────────────────────────────────── */}
      {comObra.length > 0 && (
        <Capitulo id="em-projetos" numero="03" rotulo="Em projetos" rotuladoPor="em-projetos-titulo" escuro className="ds-secao bg-[#0B1F45] text-white">
          <div className="ds-wrap">
            <Revelar>
              <SecaoCabecalho id="em-projetos-titulo" numero="03" escuro sobretitulo="Os acabamentos em obra" titulo="Veja cada modelo aplicado."
                texto="Ambientes reais em Manaus, com o modelo indicado em cada cartão. Toque para abrir todas as fotos na apresentação de Projetos."
                acao={<Botao href="/projetos" tom="linha" seta>Todos os projetos</Botao>} />
            </Revelar>
            <Revelar>
              <Trilho rotulo="Projetos com PFB" escuro largura="w-[62%] sm:w-[38%] lg:w-[23.5%]">
                {comObra.map((p) => (
                  <ProjetoCard key={p.id} projeto={p} href={`/projetos?projeto=${encodeURIComponent(p.slug)}`} sizes="(max-width: 639px) 62vw, (max-width: 1023px) 38vw, (max-width: 1920px) 300px, 16vw" />
                ))}
              </Trilho>
            </Revelar>
          </div>
        </Capitulo>
      )}

      {/* ── 04 Próximo passo ───────────────────────────────────────────────── */}
      <Capitulo id="proximo-passo" numero={comObra.length > 0 ? "04" : "03"} rotulo="Próximo passo" rotuladoPor="proximo-titulo" className="ds-secao bg-background border-t border-surface-container-high">
        <div className="ds-wrap grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <Revelar>
            <Sobretitulo numero={comObra.length > 0 ? "04" : "03"}>Próximo passo</Sobretitulo>
            <h2 id="proximo-titulo" className="font-serif text-primary text-t2 font-normal tracking-[-0.02em] mt-4 mb-5 text-balance">Novas possibilidades para o seu projeto.</h2>
            <p className="text-on-surface-variant text-lead mb-8 max-w-md text-pretty">
              Escolheu o acabamento? Um consultor responde pelo pré-contato, leva amostras ao seu escritório e fecha o orçamento. Pronta-entrega em Manaus e frete grátis a partir de 6 placas.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Botao contato grande largo>Falar com um consultor</Botao>
              <Botao href="/visualizador" tom="vazado" grande largo seta>Simular no meu ambiente</Botao>
            </div>
            <p className="text-on-surface-variant text-corpo italic mt-8">Orbital · Manaus, AM · Somos fornecedores diretos e não realizamos instalação.</p>
          </Revelar>
          <Revelar ordem={1}>
            <dl className="grid grid-cols-2 border border-surface-variant bg-white">
              {[["2,90 × 1,20 m", "Dimensão da placa"], ["3,48 m²", "Área por placa"], ["5 mm", "Espessura"], ["≈ 11 kg", "Peso por placa"]].map(([v, l], i) => (
                <div key={l} className={`p-5 lg:p-6 ${i % 2 === 0 ? "border-r border-surface-variant" : ""} ${i < 2 ? "border-b border-surface-variant" : ""}`}>
                  <dd className="font-serif text-primary text-t3">{v}</dd>
                  <dt className="text-on-surface-variant text-sobre tracking-[0.12em] uppercase font-semibold mt-1">{l}</dt>
                </div>
              ))}
            </dl>
          </Revelar>
        </div>
      </Capitulo>
    </div>
  );
}
