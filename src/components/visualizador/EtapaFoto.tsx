"use client";

// Etapa 1 do Visualizador: escolher a foto do ambiente. Dona dos dois inputs de
// arquivo (galeria e câmera) e do estado de arrastar; quem recebe o arquivo é o wizard.
import React, { useRef, useState } from "react";

export interface EtapaFotoProps {
  onArquivo: (f: File | undefined | null) => void;
  erro: string | null;
  /** Já há um ambiente salvo no banco da sessão: o texto pede "o próximo". */
  temAmbienteSalvo: boolean;
  /** Linha discreta com o produto e o espaço vindos do Simulador (ou null). */
  resumoSimulador: string | null;
  embutido: boolean;
  /** Presente só quando a etapa pode ser pulada (modo embutido no /simulador). */
  onPular?: () => void;
}

export default function EtapaFoto({ onArquivo, erro, temAmbienteSalvo, resumoSimulador, embutido, onPular }: EtapaFotoProps) {
  const galeriaRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const [arrastando, setArrastando] = useState(false);

  const titulo = temAmbienteSalvo ? "Envie a foto do próximo ambiente" : "Envie uma foto do seu ambiente";
  const abrirGaleria = () => galeriaRef.current?.click();

  return (
    <div data-viz-foto>
      <div
        data-viz-foto-zona
        role="button"
        tabIndex={0}
        aria-label={titulo}
        onClick={abrirGaleria}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrirGaleria(); }
        }}
        onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => { e.preventDefault(); setArrastando(false); onArquivo(e.dataTransfer.files?.[0]); }}
        className={`cursor-pointer border-2 border-dashed rounded-sm flex flex-col items-center justify-center text-center px-6 py-20 ${arrastando ? "border-[#36A35C] bg-[#f3f8f1]" : "border-[#cdd3dd] bg-[#F6F5F2] hover:border-[#0B1F45]"}`}
      >
        <svg aria-hidden width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#0B1F45" strokeWidth="1.3" className="mb-4">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <path d="M17 8l-5-5-5 5" />
          <path d="M12 3v12" />
        </svg>
        <p className="text-[#0B1F45] text-xl mb-1">{titulo}</p>
        <p className="text-[#74777f] text-sm">
          <span className="[@media(pointer:coarse)]:hidden">Clique para escolher ou arraste a imagem aqui</span>
          <span className="hidden [@media(pointer:coarse)]:inline">Toque para escolher uma foto</span>
        </p>
        <p className="text-[#a0a3a9] text-xs mt-3">Foto de frente e bem iluminada funciona melhor.</p>
      </div>

      {/* Celular: duas saídas claras. Em vários Android (Motorola, Android 13+) o
          input só com accept="image/*" abre o seletor de fotos do sistema, que não
          oferece a câmera; o capture="environment" abre a câmera traseira direto. */}
      <div className="hidden [@media(pointer:coarse)]:grid grid-cols-2 gap-3 mt-4">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="min-h-12 flex items-center justify-center gap-2 bg-[#0B1F45] text-white text-xs tracking-[0.12em] uppercase font-semibold"
        >
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
          Tirar foto
        </button>
        <button
          type="button"
          onClick={abrirGaleria}
          className="min-h-12 flex items-center justify-center gap-2 border border-[#0B1F45] text-[#0B1F45] text-xs tracking-[0.12em] uppercase font-semibold"
        >
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="3" y="5" width="18" height="14" />
            <path d="M3 16l5-5 4 4 3-3 6 6" />
          </svg>
          Galeria
        </button>
      </div>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => { onArquivo(e.target.files?.[0]); e.target.value = ""; }}
      />
      <input
        ref={galeriaRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { onArquivo(e.target.files?.[0]); e.target.value = ""; }}
      />

      {erro && <p role="alert" className="mt-3 text-sm text-[#b42318]">{erro}</p>}

      {resumoSimulador && (
        <p className="mt-4 text-[#74777f] text-sm">
          {embutido ? "Produto selecionado" : "Vindo do Simulador"}: {resumoSimulador}
        </p>
      )}

      {onPular && (
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onPular}
            className="min-h-11 flex items-center gap-1.5 text-xs tracking-[0.1em] uppercase font-semibold text-[#74777f] hover:text-[#0B1F45]"
          >
            Pular esta etapa
            <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
