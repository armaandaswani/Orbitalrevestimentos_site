"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CIDADES, CONHECE, ESPERA, ESPERA_COM_DETALHE, ESPERA_DETALHE_MAX, EVENTO_CONTATO, MAX_ESPERA, PERFIS, PRAZOS, VALORIZA,
  areaTexto, detalheEspera, linkWhatsappContato, pendenciasContato, rotulosEspera,
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
 * Depois: já conhece o Painel Flexível Fibra de Bambu? (se não, 3 pontos
 * rápidos) → perfil → o que valoriza → o que espera do painel → quando →
 * medidas → cidade → enviar. Medidas e nome são opcionais. O WhatsApp do
 * cliente não é pedido: a conversa já traz o número.
 *
 * Layout: no celular, folha que sobe de baixo com a altura do conteúdo (sem
 * espaço morto); no computador, cartão com a altura do conteúdo, preso ao topo
 * para o título não pular de uma pergunta para outra. A barra de ação só
 * aparece quando tem o que fazer (escolha única segue sozinha).
 * Movimento: só transform/opacity (globals.css, classes pc-*), desligado com
 * prefers-reduced-motion.
 */

type Passo = "modelo" | "conhece" | "explica" | "perfil" | "valoriza" | "espera" | "prazo" | "medidas" | "cidade" | "fim";
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

/** Passos de escolha única: tocar na opção já segue para o próximo. */
const AUTOMATICOS: readonly Passo[] = ["conhece", "perfil", "valoriza", "prazo"];

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

function ehObrigatorioOk(p: Passo, r: RespostasContato, produtos: ProdutoContato[], semCatalogo: boolean): boolean {
  switch (p) {
    // Sem fotos (catálogo não carregou), segue sem modelo: o consultor mostra.
    case "modelo": return produtos.length > 0 || semCatalogo;
    case "conhece": return !!r.conhece;
    case "perfil": return !!r.perfil;
    case "valoriza": return !!r.valoriza;
    case "espera": return !!r.espera?.length;
    case "prazo": return !!r.prazo;
    case "cidade": return !!r.cidade && (r.cidade !== "outra" || !!r.cidadeOutra?.trim());
    default: return true;
  }
}

const foco = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36A35C] focus-visible:ring-offset-2";
const linkCls = `inline-flex items-center min-h-11 px-1 -mx-1 text-[15px] text-[#2347A0] underline underline-offset-2 hover:text-[#0B1F45] ${foco}`;
const campoCls = "w-full border border-[#d9dce1] bg-white px-4 text-[17px] text-[#0B1F45] placeholder-[#9aa0aa] focus:outline-none focus:border-[#0B1F45] focus-visible:ring-2 focus-visible:ring-[#36A35C]";

/** Índice da animação em cascata (globals.css, .pc-item). */
const cascata = (k: number) => ({ "--i": k }) as React.CSSProperties;

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
function OpcaoCard({ label, ativo, onClick, k = 0 }: { label: string; ativo: boolean; onClick: () => void; k?: number }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={ativo}
      onClick={onClick}
      style={cascata(k)}
      className={`pc-item w-full min-h-[64px] flex items-center justify-between gap-4 px-5 py-4 text-left border transition-[border-color,background-color,transform] duration-150 motion-safe:active:scale-[0.985] ${foco} ${
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
        {ativo && <span className="pc-marca w-2.5 h-2.5 rounded-full bg-[#0B1F45]" />}
      </span>
    </button>
  );
}

function Opcoes({ rotulo, opcoes, valor, onPick }: { rotulo: string; opcoes: readonly Opcao[]; valor?: string; onPick: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="space-y-3">
      {opcoes.map((o, k) => (
        <OpcaoCard key={o.value} k={k} label={o.label} ativo={valor === o.value} onClick={() => onPick(o.value)} />
      ))}
    </div>
  );
}

/** Opção de escolha múltipla, com o quadrado à direita. */
function OpcaoMulti({ label, ativo, cheio, onClick, k }: { label: string; ativo: boolean; cheio: boolean; onClick: () => void; k: number }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={ativo}
      aria-disabled={cheio}
      onClick={() => !cheio && onClick()}
      style={cascata(k)}
      className={`pc-item w-full min-h-[64px] flex items-center justify-between gap-4 px-5 py-4 text-left border transition-[border-color,background-color,transform,opacity] duration-150 motion-safe:active:scale-[0.985] ${foco} ${
        ativo ? "border-[#0B1F45] bg-[#F6F5F2]" : "border-[#d9dce1] bg-white hover:border-[#0B1F45]"
      } ${cheio ? "opacity-50 cursor-not-allowed hover:border-[#d9dce1]" : ""}`}
    >
      <span className="text-[17px] leading-snug text-[#0B1F45] font-medium">{label}</span>
      <span
        aria-hidden
        className={`flex-shrink-0 w-6 h-6 rounded-[5px] border-2 flex items-center justify-center transition-colors duration-150 ${
          ativo ? "border-[#36A35C] bg-[#36A35C] text-[#0B1F45]" : "border-[#b9bec7]"
        }`}
      >
        {ativo && (
          <svg className="pc-marca" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L20 7" /></svg>
        )}
      </span>
    </button>
  );
}

/** A apresentação rápida do painel: 3 pontos, só fatos da marca. */
const PONTOS: { t: string; d: string; icone: React.ReactNode }[] = [
  {
    t: "Leve e flexível",
    d: "Cerca de 11 kg por placa de 2,90 × 1,20 m, feito de fibra de bambu renovável.",
    icone: <path d="M20 4C11 4 5 9 5 16c0 1.4.3 2.7.8 4M20 4c0 9-5 15-12 15M20 4L9 15" />,
  },
  {
    t: "Resiste à umidade e ao calor",
    d: "Absorve só 0,2% de umidade. Resistente a mofo e cupim.",
    icone: <path d="M12 3s6 6.4 6 11a6 6 0 01-12 0c0-4.6 6-11 6-11z" />,
  },
  {
    t: "Instalação rápida e limpa",
    d: "Em paredes e tetos.",
    icone: <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />,
  },
];

export default function ContatoSheet() {
  const [aberto, setAberto] = useState(false);
  // Fluxo A (veio do produto): pula a escolha do modelo.
  const [fixo, setFixo] = useState(false);
  const [produtos, setProdutos] = useState<ProdutoContato[]>([]);
  const [r, setR] = useState<RespostasContato>({});
  const [i, setI] = useState(0);
  // Direção da última troca de pergunta (a nova entra pelo lado certo).
  const [dir, setDir] = useState<1 | -1>(1);
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [erroCatalogo, setErroCatalogo] = useState(false);
  const [vendo, setVendo] = useState<{ code: string; aba: "fotos" | "projetos" } | null>(null);
  // Linhas finas que só aparecem quando há conteúdo rolado acima / abaixo.
  const [bordas, setBordas] = useState({ topo: false, base: false });
  // Campo-isca anti-robô: fora da tela, só robô preenche.
  const [isca, setIsca] = useState("");
  const folhaRef = useRef<HTMLDivElement | null>(null);
  const corpoRef = useRef<HTMLDivElement | null>(null);
  const tituloRef = useRef<HTMLHeadingElement | null>(null);
  const avancoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cidadeOutraRef = useRef<HTMLInputElement | null>(null);

  const passos = useMemo<Passo[]>(
    () => [
      ...(fixo ? [] : (["modelo"] as Passo[])),
      "conhece",
      ...(r.conhece === "nao" ? (["explica"] as Passo[]) : []),
      "perfil", "valoriza", "espera", "prazo", "medidas", "cidade", "fim",
    ],
    [fixo, r.conhece],
  );
  const passo = passos[Math.min(i, passos.length - 1)];

  useEffect(() => {
    function abrir(e: Event) {
      const detail = (e as CustomEvent<{ produtos?: ProdutoContato[]; inicial?: RespostasContato }>).detail;
      const lista = detail?.produtos ?? [];
      setProdutos(lista);
      setFixo(lista.length > 0);
      setR(detail?.inicial ?? {});
      setI(0);
      setDir(1);
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

  // Página parada atrás do formulário; Esc fecha (primeiro as fotos) e o Tab
  // dá a volta dentro da folha, sem escapar para a página de trás.
  useEffect(() => {
    if (!aberto) return;
    const html = document.documentElement;
    const antes = html.style.overflow;
    html.style.overflow = "hidden";
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (vendo) setVendo(null);
        else setAberto(false);
        return;
      }
      if (e.key !== "Tab") return;
      const folha = folhaRef.current;
      if (!folha) return;
      const raiz = folha.querySelector<HTMLElement>("[data-pc=fotos]") ?? folha;
      const alvos = [...raiz.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([tabindex="-1"]), textarea, select, [tabindex]:not([tabindex="-1"])',
      )].filter((el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden");
      if (!alvos.length) return;
      const ativo = document.activeElement as HTMLElement | null;
      const primeiro = alvos[0];
      const ultimo = alvos[alvos.length - 1];
      if (!ativo || !raiz.contains(ativo)) { e.preventDefault(); primeiro.focus(); }
      else if (e.shiftKey && ativo === primeiro) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && ativo === ultimo) { e.preventDefault(); primeiro.focus(); }
    };
    window.addEventListener("keydown", tecla);
    return () => {
      html.style.overflow = antes;
      window.removeEventListener("keydown", tecla);
    };
  }, [aberto, vendo]);

  // Cada pergunta começa do topo, com o foco no título (leitor de tela).
  useEffect(() => {
    if (!aberto) return;
    corpoRef.current?.scrollTo({ top: 0 });
    tituloRef.current?.focus({ preventScroll: true });
  }, [passo, aberto]);

  useEffect(() => () => { if (avancoRef.current) clearTimeout(avancoRef.current); }, []);

  // Rolagem: linha fina no topo quando há conteúdo rolado para cima, e na
  // barra de ação quando ainda há conteúdo abaixo dela.
  const medirBordas = useCallback(() => {
    const el = corpoRef.current;
    if (!el) return;
    const topo = el.scrollTop > 2;
    const base = el.scrollTop + el.clientHeight < el.scrollHeight - 2;
    setBordas((b) => (b.topo === topo && b.base === base ? b : { topo, base }));
  }, []);
  useEffect(() => {
    if (!aberto) return;
    const id = requestAnimationFrame(medirBordas);
    return () => cancelAnimationFrame(id);
  }, [aberto, passo, r, catalogo, produtos.length, erroCatalogo, medirBordas]);

  // Celular: a folha tem a altura do conteúdo. Quando ela muda (outra
  // pergunta, campo que aparece), a borda de cima desliza até o lugar novo em
  // vez de pular — só transform; o ::after branco cobre o vão por baixo.
  useEffect(() => {
    if (!aberto) return;
    const el = folhaRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let h0 = el.offsetHeight;
    let w0 = window.innerWidth;
    const celular = window.matchMedia("(max-width: 639.98px)");
    const calmo = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ro = new ResizeObserver(() => {
      const h = el.offsetHeight;
      const w = window.innerWidth;
      const d = h - h0;
      const mesmaLargura = w === w0;
      h0 = h;
      w0 = w;
      medirBordas();
      if (!d || !mesmaLargura || !celular.matches || calmo.matches || Math.abs(d) < 4) return;
      el.animate([{ transform: `translateY(${d}px)` }, { transform: "translateY(0)" }], { duration: 300, easing: "cubic-bezier(.2,.8,.2,1)" });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [aberto, medirBordas]);

  if (!aberto) return null;

  const total = passos.length;
  const progresso = (Math.min(i, total - 1) + 1) / total;
  const podeSeguir = ehObrigatorioOk(passo, r, produtos, erroCatalogo);

  function irPara(n: number) {
    if (avancoRef.current) clearTimeout(avancoRef.current);
    setVendo(null);
    const alvo = Math.max(0, Math.min(n, total - 1));
    setDir(alvo >= i ? 1 : -1);
    setI(alvo);
  }
  const avancar = () => irPara(i + 1);
  const voltar = () => irPara(i - 1);

  /** Segue sozinho, com um respiro para ver a marca. */
  function seguirSozinho() {
    if (avancoRef.current) clearTimeout(avancoRef.current);
    avancoRef.current = setTimeout(() => {
      setDir(1);
      // `passos` pode ganhar a apresentação ("Não" em conhece): o +1 é sobre a lista nova.
      setI((n) => n + 1);
    }, 260);
  }

  /** Escolha única: marca e segue sozinha. */
  function escolher(campo: "conhece" | "perfil" | "valoriza" | "prazo", v: string) {
    setR((x) => ({ ...x, [campo]: v }));
    seguirSozinho();
  }

  function escolherCidade(v: string) {
    setR((x) => ({ ...x, cidade: v }));
    if (v === "outra") {
      // O campo aparece já com o cursor (o teclado abre também no iPhone).
      requestAnimationFrame(() => {
        cidadeOutraRef.current?.focus({ preventScroll: true });
        cidadeOutraRef.current?.scrollIntoView({ block: "nearest" });
      });
      return;
    }
    seguirSozinho();
  }

  function alternarEspera(v: string) {
    setR((x) => {
      const atual = x.espera ?? [];
      if (atual.includes(v)) return { ...x, espera: atual.filter((e) => e !== v) };
      if (atual.length >= MAX_ESPERA) return x;
      return { ...x, espera: [...atual, v] };
    });
  }

  function alternarModelo(m: ModeloCatalogo) {
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
        body: JSON.stringify({
          respostas: { ...r, esperaDetalhe: detalheEspera(r) || undefined },
          produtos: produtosVistos,
          pagina: window.location.pathname,
          website: isca,
        }),
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
  const espera = r.espera ?? [];
  const comDetalhe = espera.includes(ESPERA_COM_DETALHE);
  const detalhe = detalheEspera(r);

  // ── Cabeçalho de cada pergunta ────────────────────────────────────────────
  const titulos: Record<Passo, { o?: string; t: string; s?: string }> = {
    modelo: { t: "Qual revestimento chamou sua atenção?", s: `Escolha até ${MAX_MODELOS}. Toque em ampliar para ver fotos e projetos.` },
    conhece: { t: "Você já conhece o Painel Flexível Fibra de Bambu?" },
    explica: { o: "Painel Flexível Fibra de Bambu (PFB)", t: "Pensado para o clima de Manaus" },
    perfil: { t: "Para quem é o projeto?" },
    valoriza: { t: "O que você mais valoriza em um revestimento?" },
    espera: { t: "O que você espera do Painel Flexível Fibra de Bambu?", s: `Escolha até ${MAX_ESPERA}.` },
    prazo: { t: "Quando pretende realizar seu projeto?" },
    medidas: { t: "Qual o tamanho da área?", s: "Se souber, ajuda o consultor a calcular as placas. Pode pular." },
    cidade: { t: "Em qual cidade é a obra?" },
    fim: { t: "Tudo pronto. Vamos conversar?", s: "Suas respostas vão junto na mensagem, e o consultor já começa daqui." },
  };

  const resumo: { rotulo: string; valor: string; passo: Passo }[] = [
    ...(produtosVistos.length || !fixo
      ? [{ rotulo: produtosVistos.length > 1 ? "Revestimentos" : "Revestimento", valor: produtosVistos.length ? produtosVistos.map((p) => (p.name && p.code ? `${p.name} (${p.code})` : p.name || p.code || "")).join("\n") : "Vou escolher com o consultor", passo: "modelo" as Passo }]
      : []),
    { rotulo: "Já conhecia o PFB", valor: r.conhece === "sim" ? "Sim" : r.conhece === "nao" ? "Ainda não" : "", passo: "conhece" },
    { rotulo: "Perfil", valor: rotulo(PERFIS, r.perfil), passo: "perfil" },
    { rotulo: "O que mais valoriza", valor: rotulo(VALORIZA, r.valoriza), passo: "valoriza" },
    { rotulo: "O que espera", valor: [...rotulosEspera(espera), ...(detalhe ? [`“${detalhe}”`] : [])].join("\n"), passo: "espera" },
    { rotulo: "Quando", valor: rotulo(PRAZOS, r.prazo), passo: "prazo" },
    ...(area || r.areasDetalhe?.length ? [{ rotulo: "Área", valor: [area, ...(r.areasDetalhe ?? [])].filter(Boolean).join("\n"), passo: "medidas" as Passo }] : []),
    { rotulo: "Cidade", valor: cidadeTxt ?? "", passo: "cidade" },
  ];

  const principal = produtosVistos[0];
  // Barra de ação só quando tem o que fazer: escolha única segue sozinha.
  const comRodape = !AUTOMATICOS.includes(passo) && (passo !== "cidade" || r.cidade === "outra");
  const contagem =
    passo === "modelo" && produtos.length ? `${produtos.length} de ${MAX_MODELOS} escolhido${produtos.length > 1 ? "s" : ""}`
    : passo === "espera" && espera.length ? `${espera.length} de ${MAX_ESPERA} escolhida${espera.length > 1 ? "s" : ""}`
    : "";

  return (
    <div
      className="fixed inset-0 z-[120] overflow-hidden flex items-end justify-center sm:items-start sm:px-6 sm:pt-[max(24px,7dvh)]"
      onClick={() => setAberto(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contato-titulo"
      style={{ touchAction: "manipulation" }}
    >
      <div aria-hidden className="pc-veu absolute inset-0 bg-[#050b16]/60" />
      <div
        ref={folhaRef}
        data-pc="folha"
        className={[
          "pc-folha relative flex flex-col w-full bg-white text-[#0B1F45]",
          // Celular: folha de baixo, altura do conteúdo; o ::after estende o
          // branco abaixo da tela enquanto a altura desliza.
          "rounded-t-[20px] shadow-[0_-12px_40px_-16px_rgba(0,0,0,0.35)]",
          "max-h-[calc(100dvh_-_max(16px,env(safe-area-inset-top)))]",
          "after:content-[''] after:absolute after:inset-x-0 after:top-full after:h-screen after:bg-white",
          // Computador: cartão preso ao topo, altura do conteúdo.
          "sm:rounded-none sm:max-w-[640px] sm:max-h-[min(800px,calc(100dvh_-_2*max(24px,7dvh)))]",
          "sm:shadow-[0_30px_90px_-20px_rgba(0,0,0,0.45)] sm:after:hidden",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra do topo: voltar, progresso, fechar */}
        <div className="relative flex-none flex items-center gap-3 sm:gap-4 px-3 sm:px-5 h-16">
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
              className="h-full w-full bg-[#36A35C] origin-left transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none"
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
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-[#e8ebf0] transition-opacity duration-200" style={{ opacity: bordas.topo ? 1 : 0 }} />
        </div>

        {/* Pergunta da vez */}
        <div
          ref={corpoRef}
          data-pc="corpo"
          onScroll={medirBordas}
          className="flex-auto min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-5 sm:px-10"
          style={{ paddingBottom: comRodape ? "1.25rem" : "calc(1.75rem + env(safe-area-inset-bottom))" }}
        >
          {passo !== "modelo" && passo !== "explica" && passo !== "fim" && principal && (principal.name || principal.code) && (
            <div className="mt-1 flex items-center gap-3 bg-[#F6F5F2] p-2 pr-3">
              {principal.image && (
                <Image src={principal.image} alt="" width={44} height={44} className="w-11 h-11 object-cover flex-shrink-0" />
              )}
              <p className="min-w-0 flex-1 text-[14px] text-[#43474e] truncate">
                <span className="text-[#0B1F45] font-medium">{principal.name || principal.code}</span>
                {produtosVistos.length > 1 && ` e mais ${produtosVistos.length - 1}`}
              </p>
              {!fixo && (
                <button type="button" onClick={() => irPara(0)} className={`flex-shrink-0 ${linkCls} text-[14px]`}>
                  Trocar
                </button>
              )}
            </div>
          )}

          <div key={passo} data-pc="conteudo" className={dir > 0 ? "pc-frente" : "pc-tras"}>
            {titulos[passo].o && (
              <p className="mt-5 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#1F7A44]">{titulos[passo].o}</p>
            )}
            <h2
              id="contato-titulo"
              ref={tituloRef}
              tabIndex={-1}
              className={`${titulos[passo].o ? "mt-2" : "mt-5"} font-serif text-[27px] sm:text-[32px] leading-[1.15] tracking-[-0.01em] text-[#0B1F45] outline-none`}
              style={{ textWrap: "balance" }}
            >
              {titulos[passo].t}
            </h2>
            {titulos[passo].s && <p className="mt-3 text-[15px] leading-relaxed text-[#43474e] max-w-[52ch]">{titulos[passo].s}</p>}

            <div className="mt-6">
              {passo === "modelo" && (
                <div>
                  {!catalogo && !erroCatalogo && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-6" aria-hidden>
                      {Array.from({ length: 6 }, (_, k) => (
                        <div key={k}>
                          <div className="aspect-[3/4] bg-[#eef0f3] motion-safe:animate-pulse" />
                          <div className="mt-2 h-4 w-3/4 bg-[#eef0f3]" />
                        </div>
                      ))}
                    </div>
                  )}
                  {erroCatalogo && (
                    <p className="text-[15px] leading-relaxed text-[#43474e]" role="status">
                      Não foi possível carregar as fotos agora. Pode seguir: o consultor mostra os modelos pelo WhatsApp.
                    </p>
                  )}

                  {catalogo && LINHAS.map(({ key, desc }) => {
                    const modelos = catalogo.modelos.filter((m) => m.linha === key);
                    if (!modelos.length) return null;
                    return (
                      <section key={key} className="mt-2 first:mt-0" aria-labelledby={`linha-${key}`}>
                        {/* Nome da linha fica preso no topo enquanto rola. */}
                        <h3 id={`linha-${key}`} className="sticky top-0 z-[2] -mx-5 sm:-mx-10 px-5 sm:px-10 py-3 bg-white/95 font-serif text-[20px] text-[#0B1F45]">
                          Linha {key} <span className="text-[15px] font-sans text-[#43474e]">{desc}</span>
                        </h3>
                        <div className="mt-1 mb-6 grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-6">
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
                                  <span className={`relative block aspect-[3/4] overflow-hidden bg-[#eef0f3] transition-[box-shadow] duration-150 ${escolhido ? "ring-[3px] ring-[#36A35C] ring-offset-2" : ""}`}>
                                    <Image
                                      src={m.fotos[0]}
                                      alt={`${m.name}, ${m.code}`}
                                      fill
                                      sizes="(max-width: 640px) 50vw, 190px"
                                      className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03]"
                                    />
                                    {escolhido && (
                                      <span className="pc-marca absolute left-2 top-2 w-7 h-7 rounded-full bg-[#36A35C] text-[#0B1F45] flex items-center justify-center" aria-hidden>
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
                                  className={`absolute right-1.5 top-1.5 w-11 h-11 rounded-full bg-white text-[#0B1F45] flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.18)] hover:bg-[#F6F5F2] transition-colors ${foco}`}
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

              {passo === "conhece" && (
                <Opcoes rotulo={titulos.conhece.t} opcoes={CONHECE} valor={r.conhece} onPick={(v) => escolher("conhece", v)} />
              )}

              {passo === "explica" && (
                <ul className="space-y-3">
                  {PONTOS.map((p, k) => (
                    <li key={p.t} style={cascata(k)} className="pc-item flex items-start gap-4 bg-[#F6F5F2] px-4 py-4">
                      <span aria-hidden className="flex-none w-11 h-11 rounded-full bg-[#0B1F45] text-[#36A35C] flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{p.icone}</svg>
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-[17px] leading-snug font-semibold text-[#0B1F45]">{p.t}</p>
                        <p className="mt-1 text-[15px] leading-snug text-[#43474e]">{p.d}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {passo === "perfil" && (
                <Opcoes rotulo={titulos.perfil.t} opcoes={PERFIS} valor={r.perfil} onPick={(v) => escolher("perfil", v)} />
              )}
              {passo === "valoriza" && (
                <Opcoes rotulo={titulos.valoriza.t} opcoes={VALORIZA} valor={r.valoriza} onPick={(v) => escolher("valoriza", v)} />
              )}

              {passo === "espera" && (
                <div role="group" aria-label={titulos.espera.t} className="space-y-3">
                  {ESPERA.map((o, k) => {
                    const ativo = espera.includes(o.value);
                    return (
                      <div key={o.value}>
                        <OpcaoMulti
                          k={k}
                          label={o.label}
                          ativo={ativo}
                          cheio={!ativo && espera.length >= MAX_ESPERA}
                          onClick={() => alternarEspera(o.value)}
                        />
                        {o.value === ESPERA_COM_DETALHE && comDetalhe && (
                          <label className="pc-surge-curto block mt-3">
                            <span className="block text-[14px] text-[#43474e] mb-2">Conte qual (opcional)</span>
                            <textarea
                              name="espera-detalhe"
                              rows={2}
                              maxLength={ESPERA_DETALHE_MAX}
                              value={r.esperaDetalhe ?? ""}
                              onChange={(e) => setR((x) => ({ ...x, esperaDetalhe: e.target.value.slice(0, ESPERA_DETALHE_MAX) }))}
                              placeholder="Ex.: parede com umidade, quero renovar a sala…"
                              className={`${campoCls} block py-3 resize-none leading-snug`}
                            />
                            {(r.esperaDetalhe?.length ?? 0) > ESPERA_DETALHE_MAX - 40 && (
                              <span className="block mt-1 text-right text-[13px] text-[#43474e]" aria-live="polite">
                                {r.esperaDetalhe?.length ?? 0}/{ESPERA_DETALHE_MAX}
                              </span>
                            )}
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {passo === "prazo" && (
                <Opcoes rotulo={titulos.prazo.t} opcoes={PRAZOS} valor={r.prazo} onPick={(v) => escolher("prazo", v)} />
              )}

              {passo === "medidas" && (
                <div>
                  <div className="grid grid-cols-2 gap-3">
                    {(["largura", "altura"] as const).map((c, k) => (
                      <label key={c} className="pc-item block" style={cascata(k)}>
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
                            className={`${campoCls} h-14 pr-10`}
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
                    <label className="pc-surge-curto block mt-5">
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
                        className={`${campoCls} h-14`}
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
                      className={`${campoCls} h-14`}
                    />
                  </label>

                  <dl className="mt-6 bg-[#F6F5F2] px-5 py-1">
                    {resumo.map((it, k) => (
                      <div key={it.rotulo} style={cascata(k)} className="pc-item flex items-start gap-4 py-2.5 border-b border-[#e8e6e0] last:border-0">
                        <div className="min-w-0 flex-1 pt-0.5">
                          <dt className="text-[13px] text-[#43474e]">{it.rotulo}</dt>
                          <dd className="mt-0.5 text-[16px] leading-snug text-[#0B1F45] whitespace-pre-line break-words">{it.valor || "Falta responder"}</dd>
                        </div>
                        {passos.includes(it.passo) && (
                          <button
                            type="button"
                            onClick={() => irPara(passos.indexOf(it.passo))}
                            aria-label={`Alterar ${it.rotulo.toLowerCase()}`}
                            className={`flex-shrink-0 ${linkCls} text-[14px]`}
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
        </div>

        {/* Ação: Continuar (escolha múltipla, campos, apresentação) ou o
            WhatsApp (fim). Escolha única não precisa: segue sozinha. */}
        {comRodape && (
          <div
            data-pc="rodape"
            className="relative flex-none bg-white px-5 sm:px-10 pt-3"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
          >
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-[#e8ebf0] transition-opacity duration-200" style={{ opacity: bordas.base ? 1 : 0 }} />
            {passo === "fim" ? (
              <>
                <a
                  href={linkWhatsappContato(produtosVistos, r)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={enviar}
                  className={`w-full min-h-[56px] inline-flex items-center justify-center gap-3 rounded-full bg-[#36A35C] text-[#0B1F45] text-[16px] font-semibold px-6 hover:bg-[#2f9150] transition-[background-color,transform] duration-150 motion-safe:active:scale-[0.98] ${foco}`}
                >
                  <IconeWhats />
                  Enviar pelo WhatsApp
                </a>
                <p className="text-[13px] text-[#43474e] text-center mt-2">Você conversa com um consultor da Orbital.</p>
              </>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 text-[14px] text-[#43474e]" aria-live="polite">
                  {contagem}
                  {passo === "medidas" && !r.largura && !r.altura && (
                    <button type="button" onClick={avancar} className={linkCls}>
                      Pular
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={avancar}
                  disabled={!podeSeguir}
                  className={`flex-shrink-0 min-h-[52px] inline-flex items-center justify-center gap-2 rounded-full pl-6 pr-5 text-[16px] font-semibold transition-[background-color,color,transform] duration-150 ${foco} ${
                    passo === "explica" ? "w-full" : ""
                  } ${
                    podeSeguir ? "bg-[#36A35C] text-[#0B1F45] hover:bg-[#2f9150] motion-safe:active:scale-[0.97]" : "bg-[#e8ebf0] text-[#5f6672] cursor-not-allowed"
                  }`}
                >
                  Continuar
                  <Seta />
                </button>
              </div>
            )}
          </div>
        )}

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
    <div data-pc="fotos" className="absolute inset-0 z-20 bg-[#0B1F45] text-white flex flex-col rounded-t-[20px] sm:rounded-none" role="dialog" aria-modal="true" aria-label={`Fotos de ${modelo.name}`}>
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
              className={`h-11 px-4 rounded-full text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36A35C] ${
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
