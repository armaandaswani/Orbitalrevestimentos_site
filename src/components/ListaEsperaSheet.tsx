"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Opcoes, Seta, campoCls, cascata, foco, linkCls } from "@/components/ContatoSheet";
import {
  PERFIL_OUTRO_MAX, PERFIS_ESPERA, PRAZOS_OBRA, artigoLinha, emailValido, pendenciasEspera, whatsappValido,
  type InscricaoEspera, type LinhaEspera,
} from "@/lib/lista-espera";

/**
 * Lista de espera de uma linha em chegada, na mesma pegada do pré-contato
 * (ContatoSheet): uma pergunta por tela, barra de progresso, escolha única
 * que segue sozinha, resumo com "Alterar" no fim. Mesmas peças visuais
 * (OpcaoCard/OpcaoMulti, classes pc-*), mesma folha: no celular tela cheia (100dvh,
 * com o branco seguindo até 100lvh por baixo das barras do navegador), no
 * computador um cartão preso ao topo.
 *
 * Passos: modelos (pulado quando a pessoa já veio de um modelo) → perfil →
 * prazo da obra → contato (nome, WhatsApp, e-mail) → resumo e aceite →
 * confirmação. Diferente do pré-contato, aqui a inscrição é gravada (POST
 * /api/lista-espera) e a folha só confirma depois que gravou.
 */

type Passo = "modelos" | "perfil" | "prazo" | "contato" | "fim";

export interface ModeloEspera {
  nome: string;
  imagem: string;
  /** Subtítulo do cartão (ex.: o formato). */
  detalhe?: string;
}

interface Respostas {
  perfil?: string;
  perfilOutro?: string;
  prazo?: string;
  nome?: string;
  whatsapp?: string;
  email?: string;
  aceite?: boolean;
}

const AUTOMATICOS: readonly Passo[] = ["prazo"];

function rotulo(lista: readonly { value: string; label: string }[], v?: string) {
  return lista.find((o) => o.value === v)?.label ?? "";
}

export default function ListaEsperaSheet({ aberto, fechar, linha, nomeLinha, catalogo, modelosIniciais }: {
  aberto: boolean;
  fechar: () => void;
  linha: LinhaEspera;
  nomeLinha: string;
  catalogo: ModeloEspera[];
  /** Modelos marcados ao abrir (veio do "Tenho interesse" de um modelo). */
  modelosIniciais: string[];
}) {
  const [fixo, setFixo] = useState(false);
  const [modelos, setModelos] = useState<string[]>([]);
  const [r, setR] = useState<Respostas>({});
  const [i, setI] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [tentouContato, setTentouContato] = useState(false);
  const [estado, setEstado] = useState<"livre" | "enviando" | "feito">("livre");
  const [erro, setErro] = useState("");
  const [bordas, setBordas] = useState({ topo: false, base: false });
  const [isca, setIsca] = useState("");
  const folhaRef = useRef<HTMLDivElement | null>(null);
  const corpoRef = useRef<HTMLDivElement | null>(null);
  const tituloRef = useRef<HTMLHeadingElement | null>(null);
  const avancoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const outroRef = useRef<HTMLInputElement | null>(null);

  // Cada abertura começa do zero, com os modelos que vieram junto. Ajuste
  // durante o render (sem efeito), como o cabeçalho faz com o menu.
  const [abertoAntes, setAbertoAntes] = useState(false);
  if (aberto !== abertoAntes) {
    setAbertoAntes(aberto);
    if (aberto) {
      setModelos(modelosIniciais);
      setFixo(modelosIniciais.length > 0);
      setI(0);
      setDir(1);
      setTentouContato(false);
      setErro("");
      if (estado === "feito") { setR({}); setEstado("livre"); }
    }
  }

  const passos = useMemo<Passo[]>(
    () => [...(fixo ? [] : (["modelos"] as Passo[])), "perfil", "prazo", "contato", "fim"],
    [fixo],
  );
  const passo = passos[Math.min(i, passos.length - 1)];

  // Página parada atrás; Esc fecha; o Tab dá a volta dentro da folha.
  useEffect(() => {
    if (!aberto) return;
    const html = document.documentElement;
    const antes = html.style.overflow;
    html.style.overflow = "hidden";
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") { fechar(); return; }
      if (e.key !== "Tab") return;
      const folha = folhaRef.current;
      if (!folha) return;
      const alvos = [...folha.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([tabindex="-1"]), textarea, select, [tabindex]:not([tabindex="-1"])',
      )].filter((el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden");
      if (!alvos.length) return;
      const ativo = document.activeElement as HTMLElement | null;
      const primeiro = alvos[0];
      const ultimo = alvos[alvos.length - 1];
      if (!ativo || !folha.contains(ativo)) { e.preventDefault(); primeiro.focus(); }
      else if (e.shiftKey && ativo === primeiro) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && ativo === ultimo) { e.preventDefault(); primeiro.focus(); }
    };
    window.addEventListener("keydown", tecla);
    return () => {
      html.style.overflow = antes;
      window.removeEventListener("keydown", tecla);
    };
  }, [aberto, fechar]);

  // Cada pergunta começa do topo, com o foco no título (leitor de tela).
  useEffect(() => {
    if (!aberto) return;
    corpoRef.current?.scrollTo({ top: 0 });
    tituloRef.current?.focus({ preventScroll: true });
  }, [passo, aberto, estado]);

  useEffect(() => () => { if (avancoRef.current) clearTimeout(avancoRef.current); }, []);

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
  }, [aberto, passo, r, modelos.length, estado, tentouContato, erro, medirBordas]);

  // A folha mudou de tamanho (outra pergunta no computador, barra do
  // navegador que some ou volta no celular): mede de novo as linhas finas.
  // No celular a folha é tela cheia e não acompanha o conteúdo.
  useEffect(() => {
    if (!aberto) return;
    const el = folhaRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => medirBordas());
    ro.observe(el);
    return () => ro.disconnect();
  }, [aberto, medirBordas]);

  if (!aberto) return null;

  const total = passos.length;
  const feito = estado === "feito";
  const progresso = feito ? 1 : (Math.min(i, total - 1) + 1) / total;
  const contatoOk = !!r.nome?.trim() && whatsappValido(r.whatsapp ?? "") && emailValido(r.email ?? "");
  const podeSeguir =
    passo === "perfil" ? !!r.perfil && (r.perfil !== "outro" || !!r.perfilOutro?.trim())
    // Contato fica sempre ativo: o toque em Continuar mostra o que falta.
    : passo === "fim" ? !!r.aceite && estado !== "enviando"
    : true;

  function irPara(n: number) {
    if (avancoRef.current) clearTimeout(avancoRef.current);
    const alvo = Math.max(0, Math.min(n, total - 1));
    setDir(alvo >= i ? 1 : -1);
    setI(alvo);
    setErro("");
  }
  const avancar = () => {
    if (passo === "contato" && !contatoOk) { setTentouContato(true); return; }
    irPara(i + 1);
  };
  const voltar = () => irPara(i - 1);

  function seguirSozinho() {
    if (avancoRef.current) clearTimeout(avancoRef.current);
    avancoRef.current = setTimeout(() => { setDir(1); setI((n) => n + 1); }, 260);
  }

  function escolherPerfil(v: string) {
    setR((x) => ({ ...x, perfil: v }));
    if (v === "outro") {
      requestAnimationFrame(() => {
        outroRef.current?.focus({ preventScroll: true });
        outroRef.current?.scrollIntoView({ block: "nearest" });
      });
      return;
    }
    seguirSozinho();
  }

  function alternarModelo(nome: string) {
    setModelos((l) => (l.includes(nome) ? l.filter((m) => m !== nome) : [...l, nome]));
  }

  async function enviar() {
    const inscricao: Partial<InscricaoEspera> = { ...r, linha, modelos, aceite: !!r.aceite };
    const faltam = pendenciasEspera(inscricao);
    if (faltam.length) {
      const passoDe: Record<string, Passo> = { nome: "contato", whatsapp: "contato", email: "contato", perfil: "perfil", perfilOutro: "perfil", prazo: "prazo" };
      const alvo = passos.indexOf(passoDe[faltam[0]] ?? "fim");
      if (alvo >= 0 && passos[alvo] !== "fim") { setTentouContato(true); irPara(alvo); }
      return;
    }
    setEstado("enviando");
    setErro("");
    try {
      const res = await fetch("/api/lista-espera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...inscricao, pagina: window.location.pathname, website: isca }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Não foi possível registrar agora. Tente de novo em instantes.");
      setEstado("feito");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível registrar agora. Tente de novo em instantes.");
      setEstado("livre");
    }
  }

  // "a TechStone", "o PFB Carbon": o artigo vem da linha, não do texto.
  const art = artigoLinha(linha);
  const titulos: Record<Passo, { t: string; s?: string }> = {
    modelos: { t: "Quais modelos chamaram sua atenção?", s: "Escolha quantos quiser. Se ainda não sabe, pode pular." },
    perfil: { t: "Para quem é o projeto?" },
    prazo: { t: "Quando é a sua obra?", s: "Assim o consultor entende o momento da sua obra." },
    contato: { t: "Para onde avisamos você?", s: `Quando ${art} ${nomeLinha} chegar a Manaus, mandamos a mensagem pelo WhatsApp e pelo e-mail.` },
    fim: { t: "Tudo pronto. Confirma?", s: "Confira suas respostas antes de entrar na lista." },
  };

  const resumo: { rotulo: string; valor: string; passo: Passo }[] = [
    { rotulo: modelos.length > 1 ? "Modelos" : "Modelo", valor: modelos.length ? modelos.join("\n") : "Vou escolher depois", passo: "modelos" },
    { rotulo: "Perfil", valor: r.perfil === "outro" ? r.perfilOutro?.trim() || "Outro" : rotulo(PERFIS_ESPERA, r.perfil), passo: "perfil" },
    { rotulo: "Obra", valor: rotulo(PRAZOS_OBRA, r.prazo), passo: "prazo" },
    { rotulo: "Contato", valor: [r.nome, r.whatsapp, r.email].filter(Boolean).join("\n"), passo: "contato" },
  ];

  const comRodape = !feito && !AUTOMATICOS.includes(passo) && (passo !== "perfil" || r.perfil === "outro");
  const principal = modelos[0] ? catalogo.find((m) => m.nome === modelos[0]) : undefined;
  const erroCampo = (ok: boolean, msg: string) =>
    tentouContato && !ok ? <p className="mt-1.5 text-[14px] text-[#ba1a1a]">{msg}</p> : null;

  return (
    <div
      className={[
        "fixed z-[120] flex justify-center items-start",
        // Celular: cobre a tela grande (100lvh), inclusive o que fica por baixo
        // da barra translúcida do Safari; sem overflow-hidden, para o ::after
        // branco da folha seguir até o fim (mesma folha do pré-contato).
        "top-0 inset-x-0 h-[100lvh]",
        // Computador: a janela, com o cartão preso ao topo.
        "sm:inset-0 sm:h-auto sm:overflow-hidden sm:px-6 sm:pt-[max(24px,7dvh)]",
      ].join(" ")}
      onClick={fechar}
      role="dialog"
      aria-modal="true"
      aria-labelledby="espera-titulo"
      style={{ touchAction: "manipulation" }}
    >
      {/* Véu: escuro atrás do cartão; no celular, branco (a folha cobre a tela). */}
      <div aria-hidden className="pc-veu absolute inset-0 bg-white sm:bg-[#050b16]/60" />
      <div
        ref={folhaRef}
        data-espera="folha"
        className={[
          "pc-folha relative flex flex-col w-full bg-white text-[#0B1F45]",
          // Celular: tela cheia na área visível (100dvh); o ::after estende o
          // branco por baixo das barras do navegador.
          "h-svh",
          "after:content-[''] after:absolute after:inset-x-0 after:top-full after:h-[100lvh] after:bg-white",
          // Computador: cartão preso ao topo, altura do conteúdo.
          "sm:h-auto sm:max-w-[640px] sm:max-h-[min(800px,calc(100dvh_-_2*max(24px,7dvh)))]",
          "sm:shadow-[0_30px_90px_-20px_rgba(0,0,0,0.45)] sm:after:hidden",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Campo-isca anti-robô: fora da tela, só robô preenche. */}
        <input type="text" name="website" value={isca} onChange={(e) => setIsca(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] w-px h-px opacity-0" />

        {/* Barra do topo: voltar, progresso, fechar */}
        <div className="relative flex-none flex items-center gap-3 sm:gap-4 px-3 sm:px-5 box-content h-16 pt-[env(safe-area-inset-top)] sm:pt-0">
          <button
            type="button"
            onClick={voltar}
            aria-label="Voltar"
            className={`w-11 h-11 rounded-full flex items-center justify-center text-[#0B1F45] hover:bg-[#F6F5F2] transition-colors ${foco} ${i === 0 || feito ? "invisible" : ""}`}
          >
            <Seta dir="esq" />
          </button>
          <div
            className="flex-1 h-1.5 rounded-full bg-[#e8ebf0] overflow-hidden"
            role="progressbar"
            aria-label="Progresso"
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={feito ? total : Math.min(i, total - 1) + 1}
          >
            <div
              className="h-full w-full bg-[#36A35C] origin-left transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none"
              style={{ transform: `scaleX(${progresso})` }}
            />
          </div>
          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar"
            className={`w-11 h-11 rounded-full flex items-center justify-center text-[#0B1F45] hover:bg-[#F6F5F2] transition-colors ${foco}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-[#e8ebf0] transition-opacity duration-200" style={{ opacity: bordas.topo ? 1 : 0 }} />
        </div>

        <div
          ref={corpoRef}
          data-espera="corpo"
          onScroll={medirBordas}
          className="flex-auto min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-5 sm:px-10"
          style={{ paddingBottom: comRodape ? "1.25rem" : "calc(1.75rem + env(safe-area-inset-bottom))" }}
        >
          {feito ? (
            <div className="pc-frente" role="status">
              <span aria-hidden className="pc-marca mt-6 w-14 h-14 rounded-full bg-[#36A35C] text-[#0B1F45] flex items-center justify-center">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M5 12l5 5L20 7" /></svg>
              </span>
              <h2 id="espera-titulo" ref={tituloRef} tabIndex={-1} className="mt-5 font-serif text-[27px] sm:text-[32px] leading-[1.15] tracking-[-0.01em] outline-none">
                Você está na lista.
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[#43474e] max-w-[52ch]">
                Quando {art} {nomeLinha} chegar a Manaus, você é avisado antes, pelo WhatsApp e pelo e-mail.
              </p>
              <button
                type="button"
                onClick={fechar}
                className={`mt-8 w-full min-h-[56px] inline-flex items-center justify-center rounded-full bg-[#0B1F45] text-white text-[16px] font-semibold px-6 hover:bg-[#2347A0] transition-[background-color,transform] duration-150 motion-safe:active:scale-[0.98] ${foco}`}
              >
                Fechar
              </button>
            </div>
          ) : (
            <>
              {passo !== "modelos" && passo !== "fim" && modelos.length > 0 && (
                <div className="mt-1 flex items-center gap-3 bg-[#F6F5F2] p-2 pr-3">
                  {principal && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={principal.imagem} alt="" width={44} height={44} className="w-11 h-11 object-cover flex-shrink-0" />
                  )}
                  <p className="min-w-0 flex-1 text-[14px] text-[#43474e] truncate">
                    <span className="text-[#0B1F45] font-medium">{modelos[0]}</span>
                    {modelos.length > 1 && ` e mais ${modelos.length - 1}`}
                  </p>
                  <button type="button" onClick={() => { setFixo(false); setDir(-1); setI(0); }} className={`flex-shrink-0 ${linkCls} text-[14px]`}>
                    Trocar
                  </button>
                </div>
              )}

              <div key={passo} className={dir > 0 ? "pc-frente" : "pc-tras"}>
                <p className="mt-5 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#1F7A44]">Lista de espera d{art} {nomeLinha}</p>
                <h2
                  id="espera-titulo"
                  ref={tituloRef}
                  tabIndex={-1}
                  className="mt-2 font-serif text-[27px] sm:text-[32px] leading-[1.15] tracking-[-0.01em] text-[#0B1F45] outline-none"
                  style={{ textWrap: "balance" }}
                >
                  {titulos[passo].t}
                </h2>
                {titulos[passo].s && <p className="mt-3 text-[15px] leading-relaxed text-[#43474e] max-w-[52ch]">{titulos[passo].s}</p>}

                <div className="mt-6">
                  {passo === "modelos" && (
                    <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-5">
                      {catalogo.map((m, k) => {
                        const ativo = modelos.includes(m.nome);
                        return (
                          <li key={m.nome} style={cascata(k)} className="pc-item">
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={ativo}
                              onClick={() => alternarModelo(m.nome)}
                              className={`group block w-full text-left ${foco}`}
                            >
                              <span className={`relative block aspect-[3/4] overflow-hidden border-2 transition-colors duration-150 ${ativo ? "border-[#36A35C]" : "border-transparent"}`}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={m.imagem} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                                <span aria-hidden className={`absolute top-2 right-2 w-6 h-6 rounded-[5px] border-2 flex items-center justify-center transition-colors duration-150 ${ativo ? "border-[#36A35C] bg-[#36A35C] text-[#0B1F45]" : "border-white bg-white/70"}`}>
                                  {ativo && <svg className="pc-marca" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L20 7" /></svg>}
                                </span>
                              </span>
                              <span className="mt-2 block text-[15px] leading-snug text-[#0B1F45] font-medium">{m.nome}</span>
                              {m.detalhe && <span className="block text-[13px] text-[#43474e]">{m.detalhe}</span>}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {passo === "perfil" && (
                    <div>
                      <Opcoes rotulo={titulos.perfil.t} opcoes={PERFIS_ESPERA} valor={r.perfil} onPick={escolherPerfil} />
                      {r.perfil === "outro" && (
                        <label className="pc-surge-curto block mt-5">
                          <span className="block text-[14px] text-[#43474e] mb-2">Conte quem você é</span>
                          <input
                            ref={outroRef}
                            value={r.perfilOutro ?? ""}
                            onChange={(e) => setR((x) => ({ ...x, perfilOutro: e.target.value.slice(0, PERFIL_OUTRO_MAX) }))}
                            onKeyDown={(e) => { if (e.key === "Enter" && r.perfilOutro?.trim()) { e.preventDefault(); avancar(); } }}
                            enterKeyHint="next"
                            placeholder="Construtora, designer, engenheiro, lojista…"
                            className={`${campoCls} h-14`}
                          />
                        </label>
                      )}
                    </div>
                  )}

                  {passo === "prazo" && (
                    <Opcoes rotulo={titulos.prazo.t} opcoes={PRAZOS_OBRA} valor={r.prazo} onPick={(v) => { setR((x) => ({ ...x, prazo: v })); seguirSozinho(); }} />
                  )}

                  {passo === "contato" && (
                    <form onSubmit={(e) => { e.preventDefault(); avancar(); }} noValidate className="space-y-5">
                      <label className="block">
                        <span className="block text-[14px] text-[#43474e] mb-2">Seu nome</span>
                        <input
                          name="name"
                          value={r.nome ?? ""}
                          onChange={(e) => setR((x) => ({ ...x, nome: e.target.value.slice(0, 80) }))}
                          autoComplete="name"
                          enterKeyHint="next"
                          placeholder="Como podemos te chamar…"
                          aria-invalid={tentouContato && !r.nome?.trim()}
                          className={`${campoCls} h-14`}
                        />
                        {erroCampo(!!r.nome?.trim(), "Diga como podemos te chamar.")}
                      </label>
                      <label className="block">
                        <span className="block text-[14px] text-[#43474e] mb-2">WhatsApp</span>
                        <input
                          name="tel"
                          type="tel"
                          inputMode="tel"
                          value={r.whatsapp ?? ""}
                          onChange={(e) => setR((x) => ({ ...x, whatsapp: e.target.value.slice(0, 20) }))}
                          autoComplete="tel-national"
                          enterKeyHint="next"
                          placeholder="(92) 99999-9999"
                          aria-invalid={tentouContato && !whatsappValido(r.whatsapp ?? "")}
                          className={`${campoCls} h-14`}
                        />
                        {erroCampo(whatsappValido(r.whatsapp ?? ""), "Use o DDD e o número, por exemplo (92) 99999-9999.")}
                      </label>
                      <label className="block">
                        <span className="block text-[14px] text-[#43474e] mb-2">E-mail</span>
                        <input
                          name="email"
                          type="email"
                          inputMode="email"
                          value={r.email ?? ""}
                          onChange={(e) => setR((x) => ({ ...x, email: e.target.value.slice(0, 120) }))}
                          autoComplete="email"
                          enterKeyHint="done"
                          placeholder="voce@email.com"
                          aria-invalid={tentouContato && !emailValido(r.email ?? "")}
                          className={`${campoCls} h-14`}
                        />
                        {erroCampo(emailValido(r.email ?? ""), "Confira o e-mail.")}
                      </label>
                      {/* Enter no teclado envia o formulário (segue para o resumo). */}
                      <button type="submit" hidden aria-hidden tabIndex={-1} />
                    </form>
                  )}

                  {passo === "fim" && (
                    <div>
                      <dl className="bg-[#F6F5F2] px-5 py-1">
                        {resumo.map((it, k) => (
                          <div key={it.rotulo} style={cascata(k)} className="pc-item flex items-start gap-4 py-2.5 border-b border-[#e8e6e0] last:border-0">
                            <div className="min-w-0 flex-1 pt-0.5">
                              <dt className="text-[13px] text-[#43474e]">{it.rotulo}</dt>
                              <dd className="mt-0.5 text-[16px] leading-snug text-[#0B1F45] whitespace-pre-line break-words">{it.valor || "Falta responder"}</dd>
                            </div>
                            <button
                              type="button"
                              onClick={() => { if (it.passo === "modelos") { setFixo(false); setDir(-1); setI(0); } else irPara(passos.indexOf(it.passo)); }}
                              aria-label={`Alterar ${it.rotulo.toLowerCase()}`}
                              className={`flex-shrink-0 ${linkCls} text-[14px]`}
                            >
                              Alterar
                            </button>
                          </div>
                        ))}
                      </dl>

                      <label className="mt-6 flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!r.aceite}
                          onChange={(e) => setR((x) => ({ ...x, aceite: e.target.checked }))}
                          className="mt-0.5 w-6 h-6 shrink-0 accent-[#36A35C]"
                        />
                        <span className="text-[15px] leading-relaxed text-[#43474e]">
                          Aceito receber o aviso de chegada pelo WhatsApp e pelo e-mail. Meus dados são usados só para este aviso
                          (<a href="/privacidade" target="_blank" className="text-[#2347A0] underline underline-offset-2">Política de Privacidade</a>).
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {comRodape && (
          <div
            data-espera="rodape"
            className="relative flex-none bg-white px-5 sm:px-10 pt-3"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
          >
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-[#e8ebf0] transition-opacity duration-200" style={{ opacity: bordas.base ? 1 : 0 }} />
            {passo === "fim" ? (
              <>
                {erro && <p role="alert" className="mb-2 text-[14px] text-[#ba1a1a] text-center">{erro}</p>}
                <button
                  type="button"
                  onClick={enviar}
                  disabled={!podeSeguir}
                  className={`w-full min-h-[56px] inline-flex items-center justify-center gap-3 rounded-full text-[16px] font-semibold px-6 transition-[background-color,transform] duration-150 ${foco} ${
                    podeSeguir ? "bg-[#36A35C] text-[#0B1F45] hover:bg-[#2f9150] motion-safe:active:scale-[0.98]" : "bg-[#e8ebf0] text-[#5f6672] cursor-not-allowed"
                  }`}
                >
                  {estado === "enviando" ? "Entrando na lista…" : "Entrar na lista de espera"}
                </button>
                <p className="text-[13px] text-[#43474e] text-center mt-2">
                  {r.aceite ? "Avisamos você assim que o material chegar." : "Marque o aceite para entrar na lista."}
                </p>
              </>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 text-[14px] text-[#43474e]" aria-live="polite">
                  {passo === "modelos" && (modelos.length
                    ? `${modelos.length} escolhido${modelos.length > 1 ? "s" : ""}`
                    : <button type="button" onClick={avancar} className={linkCls}>Pular</button>)}
                </div>
                <button
                  type="button"
                  onClick={avancar}
                  disabled={!podeSeguir}
                  className={`flex-shrink-0 min-h-[52px] inline-flex items-center justify-center gap-2 rounded-full pl-6 pr-5 text-[16px] font-semibold transition-[background-color,color,transform] duration-150 ${foco} ${
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
      </div>
    </div>
  );
}
