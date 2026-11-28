"use client";

import { useRef, useState, type ReactNode } from "react";
import Folha from "@/components/visualizador/Folha";
import { baixarArquivo, mandarParaGaleria, prepararTextura, temGaleria } from "./salvarTextura";

/**
 * "Baixar textura" dos catálogos (TechStone, PFB, PFB Carbon). No celular abre
 * uma folha com duas saídas: "Salvar na galeria" e "Baixar JPG". No computador
 * baixa o JPG direto. O arquivo começa a ser buscado quando a folha abre, para
 * a galeria abrir dentro do toque (salvarTextura).
 */
export default function BaixarTextura({
  url,
  nome,
  className,
  camada,
  children,
}: {
  url: string;
  /** Nome do arquivo baixado (vira .jpg). */
  nome: string;
  className?: string;
  /** Classe de z-index da folha, para abrir por cima de outro modal. */
  camada?: string;
  children: ReactNode;
}) {
  const [aberta, setAberta] = useState(false);
  const [pronto, setPronto] = useState<{ url: string; arquivo: File | null } | null>(null);
  const pedido = useRef<{ url: string; promessa: Promise<File | null> } | null>(null);

  const preparar = () => {
    if (pedido.current?.url !== url) {
      const alvo = url;
      const promessa = prepararTextura(alvo, nome);
      pedido.current = { url: alvo, promessa };
      promessa.then((arquivo) => { if (pedido.current?.url === alvo) setPronto({ url: alvo, arquivo }); });
    }
    return pedido.current.promessa;
  };
  const arquivoPronto = pronto?.url === url ? pronto : null;

  const tocar = async () => {
    if (temGaleria()) {
      preparar();
      setAberta(true);
      return;
    }
    baixarArquivo(await preparar(), url);
  };

  const paraGaleria = async () => {
    const arquivo = arquivoPronto?.arquivo;
    setAberta(false);
    if (arquivo && (await mandarParaGaleria(arquivo))) return;
    baixarArquivo(arquivo ?? null, url);
  };

  const comoJpg = async () => {
    setAberta(false);
    baixarArquivo(arquivoPronto ? arquivoPronto.arquivo : await preparar(), url);
  };

  const opcao =
    "flex w-full min-h-14 items-center gap-3 rounded-[10px] border border-[#0B1F45]/15 px-4 text-left text-[#0B1F45] hover:border-[#0B1F45]/40 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1F45]";

  return (
    <>
      <button type="button" onClick={tocar} className={className}>
        {children}
      </button>
      <Folha aberta={aberta} titulo="Baixar textura" onFechar={() => setAberta(false)} camada={camada}>
        <div className="flex flex-col gap-3 pb-1">
          <button type="button" onClick={paraGaleria} disabled={!arquivoPronto} className={opcao} data-teste="textura-galeria">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden className="flex-none">
              <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5L5 21" />
            </svg>
            <span>
              <span className="block font-semibold">Salvar na galeria</span>
              <span className="block text-legenda text-[#43474e]">
                {arquivoPronto ? "Vai direto para as suas fotos 📸" : "Preparando a imagem…"}
              </span>
            </span>
          </button>
          <button type="button" onClick={comoJpg} className={opcao} data-teste="textura-jpg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden className="flex-none">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            <span>
              <span className="block font-semibold">Baixar JPG</span>
              <span className="block text-legenda text-[#43474e]">Arquivo em alta, para usar no seu projeto</span>
            </span>
          </button>
        </div>
      </Folha>
    </>
  );
}
