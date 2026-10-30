"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CIDADES, EVENTO_CONTATO, PERFIS, PRAZOS, VALORIZA,
  areaTexto, linkWhatsappContato, pendenciasContato,
  type ProdutoContato, type RespostasContato,
} from "@/lib/contato";
import { modelosDoProjeto } from "@/lib/projeto-modelos";

/**
 * Pré-contato — o único caminho até o WhatsApp da Orbital (abrirContato, de
 * qualquer botão do site e do assistente de IA, ou ?contato na URL).
 *
 * Uma pergunta por tela, com barra de progresso: responder vira tocar numa
 * opção, sem a cara de questionário. Dois fluxos, o mesmo formulário:
 *   A. veio de um produto → o revestimento já vem escolhido;
 *   B. veio de qualquer outro lugar → a primeira tela é o catálogo visual
 *      (fotos grandes, ampliar, projetos com aquele modelo).
 * Obrigatórios: perfil, o que valoriza, quando e cidade. Medidas e nome são
 * opcionais. O WhatsApp do cliente não é pedido: a conversa já traz o número.
 */

type Passo = "modelo" | "perfil" | "valoriza" | "prazo" | "medidas" | "cidade" | "fim";
type Opcao = { readonly value: string; readonly label: string };

interface ModeloCatalogo {
  code: string;
  name: string;
  linha: string;
  fotos: string[];
}
interface ProjetoCatalogo {
  title: string;
  image: string;
  codigos: string[];
}
interface Catalogo {
  modelos: ModeloCatalogo[];
  projetos: ProjetoCatalogo[];
}

const LINHAS: { key: string; desc: string }[] = [
  { key: "Classic", desc: "Mármore fosco" },
  { key: "Brilliance", desc: "Mármore polido" },
  { key: "Elegance", desc: "Madeira texturizada" },
];

const MAX_MODELOS = 3;

// Catálogo do pré-contato: as mesmas rotas públicas (e em cache) do site.
let catalogoPromise: Promise<Catalogo> | null = null;
function carregarCatalogo(): Promise<Catalogo> {
  if (!catalogoPromise) {
    catalogoPromise = Promise.all([
      fetch("/api/products").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch("/api/projects/photos").then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]).then(([prods, projs]) => {
      type ProdRow = { code?: string; name?: string; linha?: string; image_path?: string; product_images?: { image_path: string; sort_order?: number }[] };
      type ProjRow = { title?: string; image_after?: string; product_code?: string | null; extra_product_codes?: string[] | null };
      const modelos = (Array.isArray(prods) ? (prods as ProdRow[]) : [])
        .filter((p) => p.code && p.image_path)
        .map((p) => {
          const extras = [...(p.product_images ?? [])]
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map((i) => i.image_path);
          return {
            code: p.code!,
            name: p.name || p.code!,
            linha: p.linha || "",
            fotos: [...new Set([p.image_path!, ...extras].filter(Boolean))],
          };
        });
      const projetos = (Array.isArray(projs) ? (projs as ProjRow[]) : [])
        .filter((p) => p.image_after)
        .map((p) => ({ title: p.title || "Projeto", image: p.image_after!, codigos: modelosDoProjeto(p) }));
      // Falhou tudo: deixa tentar de novo na próxima abertura.
      if (!modelos.length) catalogoPromise = null;
      return { modelos, projetos };
    });
  }
  return catalogoPromise;
}

function ehObrigatorioOk(p: Passo, r: RespostasContato, produtos: ProdutoContato[], semModelo: boolean): boolean {
  switch (p) {
    case "modelo": return produtos.length > 0 || semModelo;
    case "perfil": return !!r.perfil;
    case "valoriza": return !!r.valoriza;
    case "prazo": return !!r.prazo;
    case "cidade": return !!r.cidade && (r.cidade !== "outra" || !!r.cidadeOutra?.trim());
    default: return true;
  }
}

const foco = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36A35C] focus-visible:ring-offset-2";

function Seta({ dir = "dir" }: { dir?: "dir" | "esq" }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      {dir === "dir" ? <path d="M5 12h14M13 6l6 6-6 6" /> : <path d="M19 12H5M11 6l-6 6 6 6" />}
    </svg>
  );
}

function IconeWhats() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/** Uma opção grande, com a bolinha à direita (escolha única). */
function OpcaoCard({ label, ativo, onClick }: { label: string; ativo: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={ativo}
      onClick={onClick}
      className={`w-full min-h-[64px] flex items-center justify-between gap-4 px-5 py-4 text-left border transition-colors duration-150 ${foco} ${
        ativo ? "border-[#0B1F45] bg-[#F6F5F2]" : "border-[#d9dce1] bg-white hover:border-[#0B1F45]"
      }`}
    >
      <span className="text-[17px] leading-snug text-[#0B1F45] font-medium">{label}</span>
      <span
        aria-hidden
        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors duration-150 ${
          ativo ? "border-[#36A35C] bg-[#36A35C]" : "border-[#b9bec7]"
        }`}
      >
        {ativo && <span className="w-2.5 h-2.5 rounded-full bg-[#0B1F45]" />}
      </span>
    </button>
  );
}

function Opcoes({ rotulo, opcoes, valor, onPick }: { rotulo: string; opcoes: readonly Opcao[]; valor?: string; onPick: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="space-y-3">
      {opcoes.map((o) => (
        <OpcaoCard key={o.value} label={o.label} ativo={valor === o.value} onClick={() => onPick(o.value)} />
      ))}
    </div>
  );
}

export default function ContatoSheet() {
  const [aberto, setAberto] = useState(false);
  // Fluxo A (veio do produto): pula a escolha do modelo.
  const [fixo, setFixo] = useState(false);
  const [produtos, setProdutos] = useState<ProdutoContato[]>([]);
  const [semModelo, setSemModelo] = useState(false);
  const [r, setR] = useState<RespostasContato>({});
  const [i, setI] = useState(0);
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [erroCatalogo, setErroCatalogo] = useState(false);
  const [vendo, setVendo] = useState<{ code: string; aba: "fotos" | "projetos" } | null>(null);
  // Campo-isca anti-robô: fora da tela, só robô preenche.
  const [isca, setIsca] = useState("");
  const corpoRef = useRef<HTMLDivElement | null>(null);
  const tituloRef = useRef<HTMLHeadingElement | null>(null);
  const avancoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cidadeOutraRef = useRef<HTMLInputElement | null>(null);

  const passos = useMemo<Passo[]>(
    () => [...(fixo ? [] : (["modelo"] as Passo[])), "perfil", "valoriza", "prazo", "medidas", "cidade", "fim"],
    [fixo],
  );
  const passo = passos[Math.min(i, passos.length - 1)];

  useEffect(() => {
    function abrir(e: Event) {
      const detail = (e as CustomEvent<{ produtos?: ProdutoContato[]; inicial?: RespostasContato }>).detail;
      const lista = detail?.produtos ?? [];
      setProdutos(lista);
      setFixo(lista.length > 0);
      setSemModelo(false);
      setR(detail?.inicial ?? {});
      setI(0);
      setVendo(null);
      setAberto(true);
    }
    window.addEventListener(EVENTO_CONTATO, abrir);
    // ?contato na URL (ex.: /contato): abre sozinho, com o produto se veio junto.
    const id = requestAnimationFrame(() => {
      const q = new URLSearchParams(window.location.search);
      if (q.has("contato")) {
        const code = q.get("produto");
        setProdutos(code ? [{ code }] : []);
        setFixo(!!code);
        setAberto(true);
      }
    });
    return () => {
      window.removeEventListener(EVENTO_CONTATO, abrir);
      cancelAnimationFrame(id);
    };
  }, []);

  // Catálogo: carrega ao abrir (Fluxo B mostra; Fluxo A completa nome e foto
  // do produto que veio só com o código).
  useEffect(() => {
    if (!aberto || catalogo) return;
    let vivo = true;
    carregarCatalogo().then((c) => {
      if (!vivo) return;
      setCatalogo(c);
      setErroCatalogo(!c.modelos.length);
    });
    return () => { vivo = false; };
  }, [aberto, catalogo]);

  const produtosVistos = useMemo(() => {
    if (!catalogo) return produtos;
    return produtos.map((p) => {
      if (p.name && p.image) return p;
      const m = catalogo.modelos.find((x) => x.code === p.code);
      return m ? { ...p, name: p.name || m.name, linha: p.linha || m.linha, image: p.image || m.fotos[0] } : p;
    });
  }, [produtos, catalogo]);

  // Página parada atrás do formulário e Esc para fechar (primeiro as fotos).
  useEffect(() => {
    if (!aberto) return;
    const html = document.documentElement;
    const antes = html.style.overflow;
    html.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (vendo) setVendo(null);
      else setAberto(false);
    };
    window.addEventListener("keydown", esc);
    return () => {
      html.style.overflow = antes;
      window.removeEventListener("keydown", esc);
    };
  }, [aberto, vendo]);

  // Cada pergunta começa do topo, com o foco no título (leitor de tela).
  useEffect(() => {
    if (!aberto) return;
    corpoRef.current?.scrollTo({ top: 0 });
    tituloRef.current?.focus({ preventScroll: true });
  }, [passo, aberto]);

  useEffect(() => () => { if (avancoRef.current) clearTimeout(avancoRef.current); }, []);

  if (!aberto) return null;

  const total = passos.length;
  const progresso = (Math.min(i, total - 1) + 1) / total;
  const podeSeguir = ehObrigatorioOk(passo, r, produtos, semModelo);

  function irPara(n: number) {
    if (avancoRef.current) clearTimeout(avancoRef.current);
    setVendo(null);
    setI(Math.max(0, Math.min(n, total - 1)));
  }
  const avancar = () => irPara(i + 1);
  const voltar = () => irPara(i - 1);

  /** Escolha única: marca e segue sozinha, com um respiro para ver a marca. */
  function escolher(campo: "perfil" | "valoriza" | "prazo", v: string) {
    setR((x) => ({ ...x, [campo]: v }));
    if (avancoRef.current) clearTimeout(avancoRef.current);
    avancoRef.current = setTimeout(() => setI((n) => Math.min(n + 1, total - 1)), 260);
  }

  function escolherCidade(v: string) {
    setR((x) => ({ ...x, cidade: v }));
    if (v === "outra") {
      // O campo aparece já com o cursor (o teclado abre também no iPhone).
      requestAnimationFrame(() => cidadeOutraRef.current?.focus());
      return;
    }
    if (avancoRef.current) clearTimeout(avancoRef.current);
    avancoRef.current = setTimeout(() => setI((n) => Math.min(n + 1, total - 1)), 260);
  }

  function alternarModelo(m: ModeloCatalogo) {
    setSemModelo(false);
    setProdutos((lista) => {
      if (lista.some((p) => p.code === m.code)) return lista.filter((p) => p.code !== m.code);
      if (lista.length >= MAX_MODELOS) return lista;
      return [...lista, { code: m.code, name: m.name, linha: m.linha, image: m.fotos[0] }];
    });
  }

  const abrirFotos = (code: string) => setVendo({ code, aba: "fotos" });

  function enviar(e: React.MouseEvent<HTMLAnchorElement>) {
    const faltam = pendenciasContato(r);
    if (faltam.length) {
      e.preventDefault();
      const alvo = passos.indexOf(faltam[0] as Passo);
      if (alvo >= 0) irPara(alvo);
      return;
    }
    // Registra (site_contatos) sem segurar o WhatsApp: keepalive deixa a
    // requisição terminar mesmo com a aba indo para o WhatsApp.
    try {
      fetch("/api/contato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respostas: r, produtos: produtosVistos, pagina: window.location.pathname, website: isca }),
        keepalive: true,
      }).catch(() => {});
    } catch {}
    setAberto(false);
  }

  const area = areaTexto(r);
  const medida = (v: string) => v.replace(/[^\d.,]/g, "").slice(0, 6);
  const rotulo = (lista: readonly Opcao[], v?: string) => lista.find((o) => o.value === v)?.label ?? "";
  const cidadeTxt = r.cidade === "outra" ? r.cidadeOutra?.trim() : rotulo(CIDADES, r.cidade);
  const modeloVisto = vendo && catalogo?.modelos.find((m) => m.code === vendo.code);
  const projetosDe = (code: string) => catalogo?.projetos.filter((p) => p.codigos.includes(code)) ?? [];

  // ── Cabeçalho de cada pergunta ────────────────────────────────────────────
  const titulos: Record<Passo, { t: string; s?: string }> = {
    modelo: { t: "Qual revestimento chamou sua atenção?", s: `Escolha até ${MAX_MODELOS}. Toque em ampliar para ver fotos e projetos.` },
    perfil: { t: "Para quem é o projeto?" },
    valoriza: { t: "O que você mais valoriza em um revestimento?" },
    prazo: { t: "Quando pretende realizar seu projeto?" },
    medidas: { t: "Qual o tamanho da área?", s: "Se souber, ajuda o consultor a calcular as placas. Pode pular." },
    cidade: { t: "Em qual cidade é a obra?" },
    fim: { t: "Tudo pronto. Vamos conversar?", s: "Suas respostas vão junto na mensagem, e o consultor já começa daqui." },
  };

  const resumo: { rotulo: string; valor: string; passo: Passo }[] = [
    ...(produtosVistos.length || semModelo
      ? [{ rotulo: produtosVistos.length > 1 ? "Revestimentos" : "Revestimento", valor: produtosVistos.length ? produtosVistos.map((p) => (p.name && p.code ? `${p.name} (${p.code})` : p.name || p.code || "")).join("\n") : "Ainda vou escolher com o consultor", passo: "modelo" as Passo }]
      : []),
    { rotulo: "Perfil", valor: rotulo(PERFIS, r.perfil), passo: "perfil" },
    { rotulo: "O que mais valoriza", valor: rotulo(VALORIZA, r.valoriza), passo: "valoriza" },
    { rotulo: "Quando", valor: rotulo(PRAZOS, r.prazo), passo: "prazo" },
    ...(area || r.areasDetalhe?.length ? [{ rotulo: "Área", valor: [area, ...(r.areasDetalhe ?? [])].filter(Boolean).join("\n"), passo: "medidas" as Passo }] : []),
    { rotulo: "Cidade", valor: cidadeTxt ?? "", passo: "cidade" },
  ];

  const principal = produtosVistos[0];

  return (
    <div
      className="fixed inset-0 z-[120] bg-[#050b16]/60 flex items-end sm:items-center justify-center sm:p-6"
      onClick={() => setAberto(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contato-titulo"
      style={{ touchAction: "manipulation" }}
    >
      <div
        className="relative bg-white text-[#0B1F45] w-full h-[100dvh] sm:h-[min(800px,92dvh)] sm:max-w-[640px] flex flex-col overflow-hidden sm:shadow-[0_30px_90px_-20px_rgba(0,0,0,0.45)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra do topo: voltar, progresso, fechar */}
        <div className="flex-shrink-0 flex items-center gap-3 sm:gap-4 px-3 sm:px-5 h-16" style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <button
            type="button"
            onClick={voltar}
            aria-label="Voltar"
            className={`w-11 h-11 rounded-full flex items-center justify-center text-[#0B1F45] hover:bg-[#F6F5F2] transition-colors ${foco} ${i === 0 ? "invisible" : ""}`}
          >
            <Seta dir="esq" />
          </button>
          <div
            className="flex-1 h-1.5 rounded-full bg-[#e8ebf0] overflow-hidden"
            role="progressbar"
            aria-label="Progresso"
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={Math.min(i, total - 1) + 1}
          >
            <div
              className="h-full w-full bg-[#36A35C] origin-left transition-transform duration-300 motion-reduce:transition-none"
              style={{ transform: `scaleX(${progresso})` }}
            />
          </div>
          <button
            type="button"
            onClick={() => setAberto(false)}
            aria-label="Fechar"
            className={`w-11 h-11 rounded-full flex items-center justify-center text-[#0B1F45] hover:bg-[#F6F5F2] transition-colors ${foco}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Pergunta da vez */}
        <div ref={corpoRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-10 pb-32">
          {passo !== "modelo" && passo !== "fim" && principal && (principal.name || principal.code) && (
            <div className="mt-2 flex items-center gap-3 bg-[#F6F5F2] p-2 pr-3">
              {principal.image && (
                <Image src={principal.image} alt="" width={44} height={44} className="w-11 h-11 object-cover flex-shrink-0" />
              )}
              <p className="min-w-0 flex-1 text-[14px] text-[#43474e] truncate">
                <span className="text-[#0B1F45] font-medium">{principal.name || principal.code}</span>
                {produtosVistos.length > 1 && ` e mais ${produtosVistos.length - 1}`}
              </p>
              {!fixo && (
                <button type="button" onClick={() => irPara(0)} className={`flex-shrink-0 text-[14px] text-[#2347A0] underline underline-offset-2 hover:text-[#0B1F45] ${foco}`}>
                  Trocar
                </button>
              )}
            </div>
          )}

          <h2
            id="contato-titulo"
            ref={tituloRef}
            tabIndex={-1}
            className="mt-6 font-serif text-[28px] sm:text-[32px] leading-[1.15] tracking-[-0.01em] text-[#0B1F45] outline-none"
            style={{ textWrap: "balance" }}
          >
            {titulos[passo].t}
          </h2>
          {titulos[passo].s && <p className="mt-3 text-[15px] leading-relaxed text-[#43474e] max-w-[52ch]">{titulos[passo].s}</p>}

          <div className="mt-7">
            {passo === "modelo" && (
              <div>
                <OpcaoCard
                  label="Ainda não sei, quero ajuda para escolher"
                  ativo={semModelo}
                  onClick={() => { setSemModelo((v) => !v); setProdutos([]); }}
                />

                {!catalogo && !erroCatalogo && (
                  <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-6" aria-hidden>
                    {Array.from({ length: 6 }, (_, k) => (
                      <div key={k}>
                        <div className="aspect-[3/4] bg-[#eef0f3] motion-safe:animate-pulse" />
                        <div className="mt-2 h-4 w-3/4 bg-[#eef0f3]" />
                      </div>
                    ))}
                  </div>
                )}
                {erroCatalogo && (
                  <p className="mt-6 text-[15px] text-[#43474e]" role="status">
                    Não foi possível carregar as fotos agora. Escolha “Ainda não sei” e o consultor mostra os modelos pelo WhatsApp.
                  </p>
                )}

                {catalogo && LINHAS.map(({ key, desc }) => {
                  const modelos = catalogo.modelos.filter((m) => m.linha === key);
                  if (!modelos.length) return null;
                  return (
                    <section key={key} className="mt-9" aria-labelledby={`linha-${key}`}>
                      <h3 id={`linha-${key}`} className="font-serif text-[20px] text-[#0B1F45]">
                        Linha {key} <span className="text-[15px] font-sans text-[#43474e]">{desc}</span>
                      </h3>
                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-6">
                        {modelos.map((m) => {
                          const escolhido = produtos.some((p) => p.code === m.code);
                          const nProj = projetosDe(m.code).length;
                          const cheio = !escolhido && produtos.length >= MAX_MODELOS;
                          return (
                            <div key={m.code} className="relative min-w-0">
                              <button
                                type="button"
                                role="checkbox"
                                aria-checked={escolhido}
                                aria-disabled={cheio}
                                onClick={() => !cheio && alternarModelo(m)}
                                className={`group block w-full text-left ${foco} ${cheio ? "opacity-45" : ""}`}
                              >
                                <span className={`relative block aspect-[3/4] overflow-hidden bg-[#eef0f3] ${escolhido ? "ring-[3px] ring-[#36A35C] ring-offset-2" : ""}`}>
                                  <Image
                                    src={m.fotos[0]}
                                    alt={`${m.name}, ${m.code}`}
                                    fill
                                    sizes="(max-width: 640px) 50vw, 190px"
                                    className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03]"
                                  />
                                  {escolhido && (
                                    <span className="absolute left-2 top-2 w-7 h-7 rounded-full bg-[#36A35C] text-[#0B1F45] flex items-center justify-center" aria-hidden>
                                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M5 12l5 5L20 7" /></svg>
                                    </span>
                                  )}
                                </span>
                                <span className="mt-2 block text-[15px] leading-tight text-[#0B1F45] font-medium truncate">{m.name}</span>
                                <span className="block text-[13px] text-[#43474e]">
                                  {m.code}
                                  {nProj > 0 && `, ${nProj} ${nProj === 1 ? "projeto" : "projetos"}`}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => abrirFotos(m.code)}
                                aria-label={`Ampliar fotos de ${m.name}`}
                                className={`absolute right-2 top-2 w-10 h-10 rounded-full bg-white text-[#0B1F45] flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.18)] hover:bg-[#F6F5F2] transition-colors ${foco}`}
                              >
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                                </svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}

            {passo === "perfil" && (
              <Opcoes rotulo={titulos.perfil.t} opcoes={PERFIS} valor={r.perfil} onPick={(v) => escolher("perfil", v)} />
            )}
            {passo === "valoriza" && (
              <Opcoes rotulo={titulos.valoriza.t} opcoes={VALORIZA} valor={r.valoriza} onPick={(v) => escolher("valoriza", v)} />
            )}
            {passo === "prazo" && (
              <Opcoes rotulo={titulos.prazo.t} opcoes={PRAZOS} valor={r.prazo} onPick={(v) => escolher("prazo", v)} />
            )}

            {passo === "medidas" && (
              <div>
                <div className="grid grid-cols-2 gap-3">
                  {(["largura", "altura"] as const).map((c) => (
                    <label key={c} className="block">
                      <span className="block text-[14px] text-[#43474e] mb-2">{c === "largura" ? "Largura" : "Altura"}</span>
                      <span className="relative block">
                        <input
                          name={c}
                          value={r[c] ?? ""}
                          onChange={(e) => setR((x) => ({ ...x, [c]: medida(e.target.value) }))}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); avancar(); } }}
                          inputMode="decimal"
                          enterKeyHint={c === "largura" ? "next" : "done"}
                          autoComplete="off"
                          placeholder={c === "largura" ? "Ex.: 3,2" : "Ex.: 2,7"}
                          className="w-full h-14 border border-[#d9dce1] bg-white pl-4 pr-10 text-[17px] text-[#0B1F45] placeholder-[#9aa0aa] focus:outline-none focus:border-[#0B1F45] focus-visible:ring-2 focus-visible:ring-[#36A35C]"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[15px] text-[#74777f] pointer-events-none">m</span>
                      </span>
                    </label>
                  ))}
                </div>
                {area.includes("m²") && (
                  <p className="mt-4 text-[15px] text-[#0B1F45]" aria-live="polite">
                    {area.slice(area.indexOf("(") + 1, -1)} de área
                  </p>
                )}
                {!!r.areasDetalhe?.length && (
                  <p className="mt-4 text-[15px] leading-relaxed text-[#43474e]">
                    Medidas do Visualizador: {r.areasDetalhe.join("; ")}
                  </p>
                )}
              </div>
            )}

            {passo === "cidade" && (
              <div>
                <Opcoes
                  rotulo={titulos.cidade.t}
                  opcoes={[{ value: "manaus", label: "Manaus" }, { value: "outra", label: "Outra cidade" }]}
                  valor={r.cidade}
                  onPick={escolherCidade}
                />
                {r.cidade === "outra" && (
                  <label className="block mt-5">
                    <span className="block text-[14px] text-[#43474e] mb-2">Qual cidade?</span>
                    <input
                      ref={cidadeOutraRef}
                      name="cidade"
                      value={r.cidadeOutra ?? ""}
                      onChange={(e) => setR((x) => ({ ...x, cidadeOutra: e.target.value.slice(0, 60) }))}
                      onKeyDown={(e) => { if (e.key === "Enter" && r.cidadeOutra?.trim()) { e.preventDefault(); avancar(); } }}
                      enterKeyHint="next"
                      autoComplete="address-level2"
                      placeholder="Ex.: Itacoatiara…"
                      className="w-full h-14 border border-[#d9dce1] bg-white px-4 text-[17px] text-[#0B1F45] placeholder-[#9aa0aa] focus:outline-none focus:border-[#0B1F45] focus-visible:ring-2 focus-visible:ring-[#36A35C]"
                    />
                  </label>
                )}
              </div>
            )}

            {passo === "fim" && (
              <div>
                <label className="block">
                  <span className="block text-[14px] text-[#43474e] mb-2">Como podemos te chamar? (opcional)</span>
                  <input
                    name="name"
                    value={r.nome ?? ""}
                    onChange={(e) => setR((x) => ({ ...x, nome: e.target.value.slice(0, 80) }))}
                    autoComplete="name"
                    enterKeyHint="done"
                    placeholder="Seu nome…"
                    className="w-full h-14 border border-[#d9dce1] bg-white px-4 text-[17px] text-[#0B1F45] placeholder-[#9aa0aa] focus:outline-none focus:border-[#0B1F45] focus-visible:ring-2 focus-visible:ring-[#36A35C]"
                  />
                </label>

                <dl className="mt-8 bg-[#F6F5F2] px-5 py-2">
                  {resumo.map((it) => (
                    <div key={it.rotulo} className="flex items-start gap-4 py-3">
                      <div className="min-w-0 flex-1">
                        <dt className="text-[13px] text-[#43474e]">{it.rotulo}</dt>
                        <dd className="mt-0.5 text-[16px] text-[#0B1F45] whitespace-pre-line break-words">{it.valor || "Falta responder"}</dd>
                      </div>
                      {passos.includes(it.passo) && (
                        <button
                          type="button"
                          onClick={() => irPara(passos.indexOf(it.passo))}
                          aria-label={`Alterar ${it.rotulo.toLowerCase()}`}
                          className={`flex-shrink-0 mt-4 text-[14px] text-[#2347A0] underline underline-offset-2 hover:text-[#0B1F45] ${foco}`}
                        >
                          Alterar
                        </button>
                      )}
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>

        {/* Ação: seta redonda (passos) ou o WhatsApp (fim). Sempre à mão. */}
        <div
          className="absolute inset-x-0 bottom-0 bg-white px-5 sm:px-10 pt-3"
          style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
        >
          {passo === "fim" ? (
            <>
              <a
                href={linkWhatsappContato(produtosVistos, r)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={enviar}
                className={`w-full min-h-[56px] inline-flex items-center justify-center gap-3 rounded-full bg-[#36A35C] text-[#0B1F45] text-[16px] font-semibold px-6 hover:bg-[#2f9150] transition-colors ${foco}`}
              >
                <IconeWhats />
                Enviar pelo WhatsApp
              </a>
              <p className="text-[13px] text-[#43474e] text-center mt-2.5">Você conversa com um consultor da Orbital.</p>
            </>
          ) : (
            <div className="flex items-center justify-between gap-4 min-h-16">
              <p className="text-[14px] text-[#43474e]" aria-live="polite">
                {passo === "modelo" && (produtos.length ? `${produtos.length} de ${MAX_MODELOS} escolhido${produtos.length > 1 ? "s" : ""}` : "")}
                {passo === "medidas" && !r.largura && !r.altura && (
                  <button type="button" onClick={avancar} className={`text-[15px] text-[#2347A0] underline underline-offset-2 hover:text-[#0B1F45] ${foco}`}>
                    Pular
                  </button>
                )}
              </p>
              <button
                type="button"
                onClick={avancar}
                disabled={!podeSeguir}
                aria-label="Continuar"
                className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center transition-colors ${foco} ${
                  podeSeguir ? "bg-[#36A35C] text-[#0B1F45] hover:bg-[#2f9150]" : "bg-[#e8ebf0] text-[#9aa0aa] cursor-not-allowed"
                }`}
              >
                <Seta />
              </button>
            </div>
          )}
        </div>

        {/* Fotos ampliadas de um modelo: as do produto e as dos projetos. */}
        {vendo && modeloVisto && (
          <FotosModelo
            key={`${modeloVisto.code}-${vendo.aba}`}
            modelo={modeloVisto}
            projetos={projetosDe(modeloVisto.code)}
            aba={vendo.aba}
            onAba={(aba) => setVendo({ code: modeloVisto.code, aba })}
            escolhido={produtos.some((p) => p.code === modeloVisto.code)}
            cheio={!produtos.some((p) => p.code === modeloVisto.code) && produtos.length >= MAX_MODELOS}
            onEscolher={() => { alternarModelo(modeloVisto); setVendo(null); }}
            onFechar={() => setVendo(null)}
          />
        )}

        {/* Campo-isca anti-robô. Fora da tela e fora da ordem de tabulação. */}
        <div aria-hidden className="absolute -left-[10000px] w-px h-px overflow-hidden">
          <input tabIndex={-1} autoComplete="off" value={isca} onChange={(e) => setIsca(e.target.value)} />
        </div>
      </div>
    </div>
  );
}

/** Fotos ampliadas de um modelo: as do produto e as dos projetos com ele. */
function FotosModelo({
  modelo, projetos, aba: abaPedida, onAba, escolhido, cheio, onEscolher, onFechar,
}: {
  modelo: ModeloCatalogo;
  projetos: ProjetoCatalogo[];
  aba: "fotos" | "projetos";
  onAba: (aba: "fotos" | "projetos") => void;
  escolhido: boolean;
  cheio: boolean;
  onEscolher: () => void;
  onFechar: () => void;
}) {
  const [slide, setSlide] = useState(0);
  const trilhoRef = useRef<HTMLDivElement | null>(null);
  const aba = abaPedida === "projetos" && projetos.length ? "projetos" : "fotos";
  const itens = aba === "fotos"
    ? modelo.fotos.map((src) => ({ src, legenda: "" }))
    : projetos.map((p) => ({ src: p.image, legenda: p.title }));

  function irSlide(n: number) {
    const el = trilhoRef.current;
    if (el) el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="absolute inset-0 z-20 bg-[#0B1F45] text-white flex flex-col" role="dialog" aria-modal="true" aria-label={`Fotos de ${modelo.name}`}>
      <div className="flex-shrink-0 flex items-start justify-between gap-4 px-5 sm:px-8 pt-5" style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}>
        <div className="min-w-0">
          <p className="font-serif text-[24px] leading-tight truncate">{modelo.name}</p>
          <p className="text-[14px] text-white/70">Linha {modelo.linha}, {modelo.code}</p>
        </div>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar fotos"
          className="flex-shrink-0 w-11 h-11 -mr-2 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36A35C]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>

      {projetos.length > 0 && (
        <div className="flex-shrink-0 flex gap-2 px-5 sm:px-8 mt-4" role="tablist" aria-label="O que ver">
          {(["fotos", "projetos"] as const).map((a) => (
            <button
              key={a}
              type="button"
              role="tab"
              aria-selected={aba === a}
              onClick={() => { setSlide(0); trilhoRef.current?.scrollTo({ left: 0 }); onAba(a); }}
              className={`h-10 px-4 rounded-full text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36A35C] ${
                aba === a ? "bg-white text-[#0B1F45] font-semibold" : "text-white hover:bg-white/10"
              }`}
            >
              {a === "fotos" ? `Fotos do modelo (${modelo.fotos.length})` : `Projetos (${projetos.length})`}
            </button>
          ))}
        </div>
      )}

      <div className="relative flex-1 min-h-0 mt-4">
        <div
          ref={trilhoRef}
          className="h-full flex overflow-x-auto snap-x snap-mandatory overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={(e) => {
            const el = e.currentTarget;
            setSlide(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
          }}
        >
          {itens.map((it, k) => (
            <figure key={`${aba}-${k}`} className="relative w-full h-full flex-shrink-0 snap-center flex flex-col">
              <div className="relative flex-1 min-h-0">
                <Image
                  src={it.src}
                  alt={it.legenda || `${modelo.name}, foto ${k + 1}`}
                  fill
                  sizes="(max-width: 640px) 100vw, 640px"
                  className="object-contain"
                  priority={k === 0}
                />
              </div>
              {it.legenda && <figcaption className="flex-shrink-0 px-5 sm:px-8 pt-3 text-[15px] text-white/85">{it.legenda}</figcaption>}
            </figure>
          ))}
        </div>
        {itens.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => irSlide(Math.max(0, slide - 1))}
              disabled={slide === 0}
              aria-label="Foto anterior"
              className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white text-[#0B1F45] items-center justify-center disabled:opacity-0 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36A35C]"
            >
              <Seta dir="esq" />
            </button>
            <button
              type="button"
              onClick={() => irSlide(Math.min(itens.length - 1, slide + 1))}
              disabled={slide >= itens.length - 1}
              aria-label="Próxima foto"
              className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white text-[#0B1F45] items-center justify-center disabled:opacity-0 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36A35C]"
            >
              <Seta />
            </button>
          </>
        )}
      </div>

      <div className="flex-shrink-0 px-5 sm:px-8 pt-4" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
        {itens.length > 1 && (
          <p className="text-center text-[14px] text-white/70 mb-3" aria-live="polite">
            {Math.min(slide, itens.length - 1) + 1} de {itens.length}
          </p>
        )}
        <button
          type="button"
          disabled={cheio}
          onClick={onEscolher}
          className={`w-full min-h-[56px] rounded-full text-[16px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
            escolhido ? "bg-white/10 text-white hover:bg-white/15" : "bg-[#36A35C] text-[#0B1F45] hover:bg-[#2f9150] disabled:opacity-50"
          }`}
        >
          {escolhido ? "Remover da escolha" : cheio ? `Você já escolheu ${MAX_MODELOS}` : "Escolher este revestimento"}
        </button>
      </div>
    </div>
  );
}
