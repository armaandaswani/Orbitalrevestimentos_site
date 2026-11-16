"use client";

import Image from "next/image";
import { useState, useEffect, useCallback, useRef } from "react";
import { catalogoPath, linhaDaUrl, normalizeProductCode } from "@/lib/product-link";
import { LINHAS_PFB } from "@/lib/pfb-linhas";
import Revelar from "@/components/projetos/Revelar";
import ModeloAberto from "@/components/pfb-catalogo/ModeloAberto";

const CATALOGUE_URL =
  "https://drive.google.com/file/d/1zhm5MgKGSDRThqk8FqqwfX-WijI7K-iD/view?usp=drive_link";

type Linha = "todos" | "Classic" | "Brilliance" | "Elegance";

interface ProductImage {
  id: string;
  image_path: string;
  sort_order: number;
}

interface Product {
  id: string;
  code: string;
  name: string;
  linha: "Classic" | "Brilliance" | "Elegance";
  finish: string;
  description: string;
  image_path: string;
  is_active: boolean;
  sort_order: number;
  product_images?: ProductImage[];
  // Flat tileable texture (uploaded in the admin) — the file architects download
  // for their own 3D mockups; falls back to the beauty photo when unset.
  render_texture_path?: string | null;
}

const linhas: { key: Linha; label: string; desc: string }[] = [
  { key: "todos", label: "Todos", desc: "Todas as linhas" },
  { key: "Classic", label: "Classic", desc: "Mármore fosco" },
  { key: "Brilliance", label: "Brilliance", desc: "Mármore polido" },
  { key: "Elegance", label: "Elegance", desc: "Madeira texturizada" },
];

/** "1,20 × 2,90 m × 5 mm · Mármore fosco": a medida fica no painel Detalhes, não em cada cartão. */
const MATERIAL = Object.fromEntries(
  LINHAS_PFB.map(({ chave, acabamento }) => [chave, `1,20 × 2,90 m × 5 mm · ${acabamento}`]),
) as Record<"Classic" | "Brilliance" | "Elegance", string>;

// All images for a product: cover first, then gallery sorted
function allImages(product: Product): string[] {
  const gallery = (product.product_images ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((img) => img.image_path);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const url of [product.image_path, ...gallery]) {
    if (url && !seen.has(url)) { seen.add(url); result.push(url); }
  }
  return result;
}

export default function ProdutosPage() {
  const [activeLinha, setActiveLinha] = useState<Linha>("todos");
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selected, setSelected] = useState<Product | null>(null);
  const [imgIdx, setImgIdx] = useState(0);
  // Fotos que não carregaram (404 no banco, arquivo apagado): somem em silêncio
  // da galeria e da capa do cartão, em vez de deixar um quadro vazio.
  const [quebradas, setQuebradas] = useState<ReadonlySet<string>>(() => new Set());
  const quebrou = useCallback((url: string) => {
    setQuebradas((q) => (q.has(url) ? q : new Set(q).add(url)));
  }, []);
  // Modelo pedido pela URL que não existe (ou saiu do catálogo) — o visitante
  // precisa entender por que caiu no catálogo geral em vez de num modelo.
  const [missingModel, setMissingModel] = useState<string | null>(null);
  const deepLinked = useRef(false);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => setProducts(data))
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));
  }, []);

  const filtered =
    activeLinha === "todos"
      ? products
      : products.filter((p) => p.linha === activeLinha);

  const selectedIndex = selected ? filtered.findIndex((p) => p.code === selected.code) : -1;
  const fotosDe = useCallback((p: Product) => allImages(p).filter((u) => !quebradas.has(u)), [quebradas]);
  const images = selected ? fotosDe(selected) : [];
  // Uma foto que quebrou some da lista: o índice não pode apontar para além do fim.
  const fotoAtual = Math.min(imgIdx, Math.max(0, images.length - 1));

  /**
   * Abrir/fechar reflete o modelo na URL (?modelo=orb-003).
   *
   * É isso que faz o QR Code funcionar, o link compartilhado abrir no modelo
   * certo e o "voltar" do navegador devolver ao catálogo em vez de sair do site.
   * pushState/replaceState em vez de router: trocar a rota remontaria a página e
   * perderia a lista já carregada.
   *
   * A linha do filtro (?linha=) é lida da própria URL, nunca do estado: com a
   * lista de dependências vazia, o estado ficaria preso no valor da montagem e
   * o ?linha= sumiria ao abrir ou fechar um modelo.
   */
  const syncUrl = useCallback((product: Product | null, mode: "push" | "replace" = "push") => {
    if (typeof window === "undefined") return;
    const url = catalogoPath({ linha: linhaDaUrl(window.location.search), modelo: product?.code });
    if (window.location.pathname + window.location.search === url) return;
    window.history[mode === "push" ? "pushState" : "replaceState"]({ modelo: product?.code ?? null }, "", url);
  }, []);

  const open = useCallback((product: Product, opts?: { silent?: boolean }) => {
    setSelected(product);
    setImgIdx(0);
    if (!opts?.silent) syncUrl(product);
  }, [syncUrl]);

  const close = useCallback((opts?: { silent?: boolean }) => {
    setSelected(null);
    setImgIdx(0);
    if (!opts?.silent) syncUrl(null);
  }, [syncUrl]);

  const goNextProduct = useCallback(() => {
    if (selectedIndex < filtered.length - 1) open(filtered[selectedIndex + 1]);
  }, [selectedIndex, filtered]); // eslint-disable-line react-hooks/exhaustive-deps

  const goPrevProduct = useCallback(() => {
    if (selectedIndex > 0) open(filtered[selectedIndex - 1]);
  }, [selectedIndex, filtered]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Chegada com ?linha=: o filtro sai da URL logo depois da hidratação. */
  useEffect(() => {
    const t = setTimeout(() => setActiveLinha(linhaDaUrl(window.location.search)), 0);
    return () => clearTimeout(t);
  }, []);

  /** Trocar a linha reflete na URL sem criar entrada no histórico. */
  const trocarLinha = (linha: Linha) => {
    setActiveLinha(linha);
    // Antes da lista chegar, `selected` é nulo: o modelo da URL fica, senão a aba apagaria o ?modelo= e a chegada nunca o abriria.
    const modelo = selected?.code ?? (deepLinked.current ? undefined : new URLSearchParams(window.location.search).get("modelo"));
    const url = catalogoPath({ linha, modelo });
    if (window.location.pathname + window.location.search === url) return;
    window.history.replaceState(window.history.state, "", url);
  };

  /**
   * Chegada por link/QR: abre o modelo pedido assim que a lista carrega.
   *
   * Roda uma vez só — depois disso quem manda é o usuário. Um código que não
   * existe mais (produto inativo ou excluído) não vira página quebrada: fica no
   * catálogo com um aviso.
   */
  useEffect(() => {
    if (deepLinked.current || products.length === 0) return;
    const wanted = normalizeProductCode(new URLSearchParams(window.location.search).get("modelo") ?? "");
    if (!wanted) { deepLinked.current = true; return; }
    deepLinked.current = true;
    const match = products.find((p) => normalizeProductCode(p.code) === wanted);
    const t = setTimeout(() => {
      if (match) {
        open(match, { silent: true });   // a URL já está correta
        // Há uma linha válida na URL e ela não é a do modelo: o filtro vai para a
        // linha do modelo e a URL é corrigida. Sem ?linha= (ou com valor que não
        // é linha), o filtro fica em "Todos" e a URL não muda.
        const daUrl = linhaDaUrl(window.location.search);
        if (daUrl !== "todos" && daUrl !== match.linha) {
          setActiveLinha(match.linha);
          window.history.replaceState(window.history.state, "", catalogoPath({ linha: match.linha, modelo: match.code }));
        }
      } else setMissingModel(wanted.toUpperCase());
    }, 0);
    return () => clearTimeout(t);
  }, [products, open]);

  /** Voltar/avançar do navegador navega entre catálogo e modelo. */
  useEffect(() => {
    const onPop = () => {
      setActiveLinha(linhaDaUrl(window.location.search));
      const wanted = normalizeProductCode(new URLSearchParams(window.location.search).get("modelo") ?? "");
      const match = wanted ? products.find((p) => normalizeProductCode(p.code) === wanted) : null;
      if (match) open(match, { silent: true });
      else close({ silent: true });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [products, open, close]);

  /**
   * Trava o catálogo ao fundo sem perder onde o visitante estava.
   *
   * `overflow: hidden` no body NÃO segura o Safari do iPhone — a página
   * continuava rolando atrás do modal. `position: fixed` segura, mas zera o
   * scroll; por isso guardamos a posição e a devolvemos ao fechar.
   *
   * Efeito SEPARADO e dependente só de "tem produto aberto?": junto com o
   * teclado ele re-executaria a cada troca de imagem, e o travar/destravar
   * repetido produziria justamente o salto de posição que queremos evitar.
   */
  const hasSelection = !!selected;
  useEffect(() => {
    if (!hasSelection) return;
    const y = window.scrollY;
    const body = document.body;
    const prev = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow };
    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      window.scrollTo(0, y);
    };
  }, [hasSelection]);

  /**
   * Ao fechar (botão, Esc ou voltar do navegador), o foco volta ao cartão do
   * último modelo visto. Roda depois do efeito acima ter devolvido a rolagem;
   * se o cartão ficou fora da tela (o visitante passou por outros modelos),
   * ele é trazido para perto.
   */
  const ultimoAberto = useRef<string | null>(null);
  useEffect(() => {
    if (selected) { ultimoAberto.current = selected.code; return; }
    const codigo = ultimoAberto.current;
    if (!codigo) return;
    ultimoAberto.current = null;
    const botao = document.querySelector<HTMLElement>(`[data-teste="cartao-modelo"][data-codigo="${codigo}"] button`);
    if (!botao) return;
    botao.focus({ preventScroll: true });
    const r = botao.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) botao.scrollIntoView({ block: "center" });
  }, [selected]);

  return (
    <main className="pt-20">

      {/* ── Modelo aberto em tela cheia ── */}
      {selected && (
        <ModeloAberto
          modelo={selected}
          fotos={images}
          foto={fotoAtual}
          setFoto={setImgIdx}
          material={MATERIAL[selected.linha]}
          posicao={selectedIndex}
          total={filtered.length}
          anterior={selectedIndex > 0 ? goPrevProduct : undefined}
          proximo={selectedIndex < filtered.length - 1 ? goNextProduct : undefined}
          fechar={close}
          quebrou={quebrou}
        />
      )}

      {/* QR/link de um modelo que saiu do catálogo — em vez de página quebrada,
          o visitante fica no catálogo sabendo o que aconteceu. */}
      {missingModel && (
        <div className="bg-[#fdf6e7] border-b border-[#f0e0b8]">
          <div className="max-w-[1280px] mx-auto px-4 lg:px-16 py-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[#7a5c00] text-[13px]">
              O modelo <strong>{missingModel}</strong> não está mais disponível no catálogo. Veja abaixo os modelos atuais.
            </p>
            <button
              onClick={() => setMissingModel(null)}
              className="text-[#7a5c00] text-[11px] tracking-[0.1em] uppercase font-bold hover:underline"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Abertura: curta e clara, no tom da home; as linhas logo abaixo, presas no topo ao rolar. */}
      <section className="bg-[#F6F5F2] border-b border-[#e8e6e1]">
        <div className="ds-wrap pt-[clamp(2.25rem,1.5rem+2.5vw,4rem)] pb-[clamp(1.5rem,1rem+1.5vw,2.5rem)] flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div className="max-w-2xl">
            <h1 className="font-serif text-[#0B1F45] text-t1 font-normal tracking-[-0.02em]">
              Catálogo de modelos
            </h1>
            <p className="text-[#43474e] text-lead mt-3 text-pretty">
              Painel Flexível em Fibra de Bambu (PFB) em três linhas, com estoque e pronta-entrega em Manaus.
            </p>
          </div>
          {/* Sem "Falar com um consultor" aqui: primeiro o cliente escolhe o
              acabamento; o botão aparece dentro de cada produto. */}
          <a
            href={CATALOGUE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ds-botao ds-botao-vazado flex-shrink-0 self-start md:self-auto"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Baixar catálogo
          </a>
        </div>
      </section>

      {/* Linhas: presas logo abaixo do cabeçalho; quando ele se recolhe, sobem junto (ds-sob-cabecalho). */}
      <div className="ds-sob-cabecalho sticky z-40 bg-[#F6F5F2] border-b border-[#e2e2e2]">
        <div className="ds-wrap">
          <div data-teste="abas-linha" className="grid grid-cols-2 sm:grid-cols-4 -mx-3 sm:-mx-5">
            {linhas.map(({ key, label, desc }) => (
              <button
                key={key}
                onClick={() => trocarLinha(key)}
                aria-pressed={activeLinha === key}
                className={`min-w-0 break-words flex flex-col items-start px-3 py-3 sm:px-5 sm:py-4 border-b transition-colors duration-200 ${
                  activeLinha === key
                    ? "border-[#0B1F45] text-[#0B1F45]"
                    : "border-transparent text-[#74777f] hover:text-[#0B1F45]"
                }`}
              >
                <span className="text-xs tracking-[0.12em] uppercase font-semibold">
                  {label}
                </span>
                <span className="text-[11px] mt-0.5 opacity-75 hidden sm:block">
                  {desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <section className="pt-8 pb-12 lg:pt-12 lg:pb-20 bg-[#F6F5F2]">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          {loadingProducts ? (
            <div key="esqueleto" className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-8 lg:gap-x-8 lg:gap-y-14">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse motion-reduce:animate-none">
                  <div className="aspect-[4/5] bg-[#e7e5e0]" />
                  <div className="mt-3 lg:mt-4 h-5 bg-[#e7e5e0] w-2/3" />
                  <div className="mt-2 h-3.5 bg-[#e7e5e0] w-1/3" />
                </div>
              ))}
            </div>
          ) : (
            <div key="grade">
              {activeLinha !== "todos" && (
                <div className="mb-10 pb-8 border-b border-[#e2e2e2]">
                  <h2 className="font-serif text-[#0B1F45] text-3xl font-normal mb-2">
                    Linha {activeLinha}
                  </h2>
                  <p className="text-[#43474e] text-sm">
                    {activeLinha === "Classic" &&
                      "Mármore fosco · placa de 1,20 × 2,90 m × 5 mm (3,48 m²)"}
                    {activeLinha === "Brilliance" &&
                      "Mármore polido · placa de 1,20 × 2,90 m × 5 mm (3,48 m²)"}
                    {activeLinha === "Elegance" &&
                      "Madeira texturizada · placa de 1,20 × 2,90 m × 5 mm (3,48 m²)"}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-10 lg:gap-x-8 lg:gap-y-16">
                {filtered.map((product, i) => {
                  // Capa que não carrega: o cartão usa a primeira foto da galeria que carrega.
                  const capa = fotosDe(product)[0];
                  return (
                  /* Cada cartão sobe no ritmo da sua coluna: 3 colunas no computador, 2 no
                     celular (o --mv-i do celular vem por cima só abaixo de lg). No celular o
                     preenchimento é só antes do começo: medido a 4× de CPU, com ele o catálogo
                     não perde o quadro que perdia ao chegar no fim da página. */
                  <Revelar
                    key={product.code}
                    ordem={i % 3}
                    className={i % 2 ? "mv-preenche-antes max-lg:[--mv-i:1]!" : "mv-preenche-antes max-lg:[--mv-i:0]!"}
                  >
                  {/* Só a foto, o nome, a linha e o código. O cartão inteiro abre o
                      modelo: o botão do nome se estende sobre ele (after:inset-0), e é
                      ele que recebe o Tab e o foco de volta ao fechar. */}
                  <article
                    data-teste="cartao-modelo"
                    data-linha={product.linha}
                    data-codigo={product.code}
                    className="group relative"
                  >
                    <div className="mv-brilho relative aspect-[4/5] overflow-hidden bg-[#e7e5e0]">
                      {/* next/image: a Vercel redimensiona e serve em WebP pela
                          própria CDN. Antes eram 14 arquivos originais (23,9 MB)
                          baixados do Supabase a cada visita ao catálogo. */}
                      {capa && (
                        <Image
                          key={capa}
                          src={capa}
                          alt={`${product.name}, linha ${product.linha}`}
                          data-texto-banco
                          fill
                          sizes="(max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                          onError={() => quebrou(capa)}
                        />
                      )}
                    </div>
                    <h3 className="mt-3 lg:mt-4 font-serif font-normal text-[#0B1F45] text-[1.0625rem] lg:text-t3 leading-snug">
                      <button
                        type="button"
                        onClick={() => open(product)}
                        className="text-left underline-offset-4 decoration-[#0B1F45]/30 group-hover:underline focus-visible:outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-[#0B1F45]"
                      >
                        <span data-texto-banco>{product.name}</span>
                      </button>
                    </h3>
                    <p data-texto-banco className="mt-1 text-legenda text-[#74777f]">
                      {product.linha} · {product.code}
                    </p>
                  </article>
                  </Revelar>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Specs Bar */}
      <section className="bg-[#0B1F45] py-12">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: "Dimensão", value: "1,20 × 2,90 m" },
              { label: "Área por placa", value: "3,48 m²" },
              { label: "Espessura", value: "5 mm" },
              { label: "Peso", value: "3,2 kg/m²" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-white text-2xl font-normal mb-1">
                  {value}
                </p>
                <p className="text-[#B4BBC8] text-xs tracking-[0.15em] uppercase font-semibold">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <div className="bg-[#F6F5F2] border-t border-[#eeeeee] py-5 px-8 text-center">
        <p className="text-[#74777f] text-xs italic">
          Imagens ilustrativas: cor, brilho e escala reais podem variar. Pode haver pequena variação de tom entre lotes; use placas do mesmo lote em cada ambiente. A Orbital é fornecedora e não faz a instalação.
        </p>
      </div>
    </main>
  );
}
