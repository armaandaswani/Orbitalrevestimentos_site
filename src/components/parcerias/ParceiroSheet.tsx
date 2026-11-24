"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OpcaoMulti, Opcoes, Seta, campoCls, cascata, foco, linkCls } from "@/components/ContatoSheet";
import { WHATSAPP_VENDAS } from "@/lib/contato";
import { trackFunnel } from "@/lib/funnel";
import {
  CIDADES_PARCEIRO, CIDADE_OUTRA_MAX, EVENTO_PARCEIRO, NOME_MAX, PERFIS_PARCEIRO,
  cidadeTexto, digitosFone, foneValido, linkWhatsappParceiro, mascaraFone, pendenciasParceiro, perfilParceiroDe,
  perguntasDe, rotulosResposta, totalPerguntas,
  type PerfilParceiro, type PerguntaParceiro, type RespostasParceiro,
} from "@/lib/parceiro-contato";

/**
 * Pré-contato de parceiros: lojista, marceneiro, engenheiro, construtor,
 * aplicador e corretor (arquitetos e designers seguem no cadastro do portal).
 * Mesma linguagem do pré-contato de clientes (ContatoSheet, classes pc-* do
 * globals.css): uma pergunta por tela, barra de progresso fina, "n de N",
 * tela cheia no celular e cartão no computador. Escolha única segue sozinha;
 * múltipla, cidade, nome e WhatsApp têm Continuar. No fim, um resumo e
 * "Abrir o WhatsApp": abre na hora o WhatsApp de vendas com a mensagem
 * organizada e, em paralelo (keepalive), registra no CRM do representante
 * (POST /api/parceiro-contato). O banco fora do ar não segura ninguém.
 *
 * Como abrir, por perfil (lojista | marceneiro | engenheiro | construtor |
 * aplicador | corretor):
 *   - de um botão: abrirParceiro("construtor", botao) (lib/parceiro-contato);
 *     o foco volta para o botão ao fechar;
 *   - por link, de qualquer página do site: ?parceiro=construtor (aceita
 *     plural e apelidos: ?parceiro=corretores, ?parceiro=revendedor), ex.:
 *     https://orbitalrevestimentos.com.br/parcerias?parceiro=construtor;
 *   - pela âncora das páginas que têm a chamada (ChamadaParceiro):
 *     /parcerias/marceneiros#cadastro, /parcerias/engenheiros#cadastro e
 *     /onde-comprar#quero-revender.
 */

type Passo = { tipo: "intro" } | { tipo: "pergunta"; p: PerguntaParceiro } | { tipo: "cidade" } | { tipo: "nome" } | { tipo: "whatsapp" } | { tipo: "fim" };
const chave = (s: Passo) => (s.tipo === "pergunta" ? s.p.id : s.tipo);

function IconeWhats() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

const vazio = (): RespostasParceiro => ({ respostas: {} });

export default function ParceiroSheet() {
  const [perfil, setPerfil] = useState<PerfilParceiro | null>(null);
  const [r, setR] = useState<RespostasParceiro>(vazio);
  const [i, setI] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [bordas, setBordas] = useState({ topo: false, base: false });
  // Campo-isca anti-robô: fora da tela, só robô preenche.
  const [isca, setIsca] = useState("");
  const folhaRef = useRef<HTMLDivElement | null>(null);
  const corpoRef = useRef<HTMLDivElement | null>(null);
  const tituloRef = useRef<HTMLHeadingElement | null>(null);
  const campoRef = useRef<HTMLInputElement | null>(null);
  const origemRef = useRef<HTMLElement | null>(null);
  const avancoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aberto = perfil !== null;

  const passos = useMemo<Passo[]>(() => {
    if (!perfil) return [];
    return [
      { tipo: "intro" },
      ...perguntasDe(perfil, r).map((p) => ({ tipo: "pergunta" as const, p })),
      { tipo: "cidade" }, { tipo: "nome" }, { tipo: "whatsapp" }, { tipo: "fim" },
    ];
  }, [perfil, r]);
  const passo: Passo = passos[Math.min(i, passos.length - 1)] ?? { tipo: "intro" };

  const fechar = useCallback(() => {
    if (avancoRef.current) clearTimeout(avancoRef.current);
    setPerfil(null);
    // O foco volta para quem abriu (o botão da página), sem a página pular.
    const origem = origemRef.current;
    origemRef.current = null;
    requestAnimationFrame(() => { if (origem?.isConnected) origem.focus({ preventScroll: true }); });
  }, []);

  useEffect(() => {
    function abrir(p: PerfilParceiro, origem: HTMLElement | null) {
      origemRef.current = origem ?? (document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null);
      setPerfil(p);
      setR(vazio());
      setI(0);
      setDir(1);
    }
    const ouvir = (e: Event) => {
      const d = (e as CustomEvent<{ perfil?: PerfilParceiro; origem?: HTMLElement | null }>).detail;
      const p = perfilParceiroDe(d?.perfil);
      if (p) abrir(p, d?.origem ?? null);
    };
    window.addEventListener(EVENTO_PARCEIRO, ouvir);
    // ?parceiro=construtor na URL: abre sozinho (o link que o consultor manda).
    const id = requestAnimationFrame(() => {
      const p = perfilParceiroDe(new URLSearchParams(window.location.search).get("parceiro"));
      if (p) abrir(p, null);
    });
    return () => {
      window.removeEventListener(EVENTO_PARCEIRO, ouvir);
      cancelAnimationFrame(id);
    };
  }, []);

  // Página parada atrás; Esc fecha; o Tab dá a volta dentro da janela.
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

  // Cada tela começa do topo; nas de digitar o cursor já vai para o campo
  // (o teclado abre também no iPhone), nas outras o foco vai para o título.
  const chaveDoPasso = aberto ? chave(passo) : "";
  useEffect(() => {
    if (!aberto) return;
    corpoRef.current?.scrollTo({ top: 0 });
    if (chaveDoPasso === "nome" || chaveDoPasso === "whatsapp") campoRef.current?.focus({ preventScroll: true });
    else tituloRef.current?.focus({ preventScroll: true });
  }, [chaveDoPasso, aberto]);

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
  }, [aberto, chaveDoPasso, r, medirBordas]);
  useEffect(() => {
    if (!aberto) return;
    const el = folhaRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => medirBordas());
    ro.observe(el);
    return () => ro.disconnect();
  }, [aberto, medirBordas]);

  if (!perfil) return null;
  const def = PERFIS_PARCEIRO[perfil];

  // "n de N" conta só as perguntas (sem a abertura e o resumo).
  const nPerguntas = passos.length - 2;
  const n = passo.tipo === "intro" ? 0 : passo.tipo === "fim" ? nPerguntas + 1 : Math.min(i, nPerguntas);
  const progresso = n / (nPerguntas + 1);
  const total = passos.length;

  function irPara(alvoBruto: number) {
    if (avancoRef.current) clearTimeout(avancoRef.current);
    const alvo = Math.max(0, Math.min(alvoBruto, total - 1));
    setDir(alvo >= i ? 1 : -1);
    setI(alvo);
  }
  const avancar = () => irPara(i + 1);
  const voltar = () => irPara(i - 1);
  const irParaChave = (k: string) => { const alvo = passos.findIndex((s) => chave(s) === k); if (alvo >= 0) irPara(alvo); };

  /** Segue sozinho, com um respiro para ver a marca. */
  function seguirSozinho() {
    if (avancoRef.current) clearTimeout(avancoRef.current);
    avancoRef.current = setTimeout(() => {
      setDir(1);
      // A lista de telas pode encolher ("Ainda não tenho loja" pula a seguinte): o +1 é sobre a lista nova.
      setI((x) => x + 1);
    }, 260);
  }

  function escolher(p: PerguntaParceiro, v: string) {
    setR((x) => ({ ...x, respostas: { ...x.respostas, [p.id]: v } }));
    seguirSozinho();
  }

  function alternar(p: PerguntaParceiro, v: string) {
    setR((x) => {
      const atual = Array.isArray(x.respostas[p.id]) ? (x.respostas[p.id] as string[]) : [];
      const novo = atual.includes(v) ? atual.filter((e) => e !== v) : [...atual, v];
      return { ...x, respostas: { ...x.respostas, [p.id]: novo } };
    });
  }

  function escolherCidade(v: string) {
    setR((x) => ({ ...x, cidade: v, cidadeOutra: v === "manaus" ? undefined : x.cidadeOutra }));
    if (v === "manaus") { seguirSozinho(); return; }
    requestAnimationFrame(() => {
      campoRef.current?.focus({ preventScroll: true });
      campoRef.current?.scrollIntoView({ block: "nearest" });
    });
  }

  const podeSeguir =
    passo.tipo === "pergunta" ? (passo.p.multipla ? (((r.respostas[passo.p.id] as string[] | undefined) ?? []).length > 0) : !!r.respostas[passo.p.id])
    : passo.tipo === "cidade" ? !!r.cidade && (r.cidade !== "fora" || !!r.cidadeOutra?.trim())
    : passo.tipo === "nome" ? !!r.nome?.trim()
    : passo.tipo === "whatsapp" ? foneValido(r.whatsapp)
    : true;

  function enviar(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!perfil) return;
    const faltam = pendenciasParceiro(perfil, r);
    if (faltam.length) {
      e.preventDefault();
      irParaChave(faltam[0]);
      return;
    }
    // Registra no CRM sem segurar o WhatsApp: keepalive deixa a requisição
    // terminar mesmo com a aba indo para o WhatsApp.
    try {
      fetch("/api/parceiro-contato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          perfil,
          respostas: r.respostas,
          cidade: r.cidade,
          cidadeOutra: r.cidadeOutra,
          nome: r.nome?.trim(),
          whatsapp: digitosFone(r.whatsapp),
          pagina: window.location.pathname,
          website: isca,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {}
    // Só o perfil: nada pessoal vai para as análises.
    trackFunnel("parceiro_contato_enviado", { perfil }, { saida: true });
    fechar();
  }

  const titulo: { o?: string; t: string; s?: string } =
    passo.tipo === "intro" ? { o: def.para, t: "Vamos conversar sobre parceria?", s: `São ${totalPerguntas(perfil)} perguntas rápidas. As respostas chegam organizadas no WhatsApp do consultor.` }
    : passo.tipo === "pergunta" ? { t: passo.p.titulo, s: passo.p.apoio }
    : passo.tipo === "cidade" ? { t: "Em qual cidade você atua?" }
    : passo.tipo === "nome" ? { t: "Como você se chama?" }
    : passo.tipo === "whatsapp" ? { t: "Qual é o seu WhatsApp?", s: "Com DDD. O consultor registra o seu contato por ele." }
    : { t: "Tudo pronto. Vamos conversar?", s: "Suas respostas vão junto na mensagem, e o consultor já começa daqui." };

  const resumo: { rotulo: string; valor: string; k: string }[] = [
    ...perguntasDe(perfil, r).map((p) => ({ rotulo: p.linha, valor: rotulosResposta(p, r.respostas[p.id]).join("\n"), k: p.id })),
    { rotulo: "Cidade", valor: cidadeTexto(r), k: "cidade" },
    { rotulo: "Nome", valor: r.nome?.trim() ?? "", k: "nome" },
    { rotulo: "WhatsApp", valor: mascaraFone(r.whatsapp ?? ""), k: "whatsapp" },
  ];

  const comRodape = passo.tipo === "intro" || passo.tipo === "nome" || passo.tipo === "whatsapp" || passo.tipo === "fim"
    || (passo.tipo === "pergunta" && !!passo.p.multipla)
    || (passo.tipo === "cidade" && !!r.cidade && r.cidade !== "manaus");
  const marcadas = passo.tipo === "pergunta" && passo.p.multipla ? ((r.respostas[passo.p.id] as string[] | undefined) ?? []).length : 0;
  const foneIncompleto = passo.tipo === "whatsapp" && digitosFone(r.whatsapp).length > 0 && !foneValido(r.whatsapp);

  return (
    <div
      className={[
        "fixed z-[120] flex justify-center items-start",
        "top-0 inset-x-0 h-[100lvh]",
        "sm:inset-0 sm:h-auto sm:overflow-hidden sm:px-6 sm:pt-[max(24px,7dvh)]",
      ].join(" ")}
      onClick={fechar}
      role="dialog"
      aria-modal="true"
      aria-labelledby="parceiro-titulo"
      data-parceiro={perfil}
      style={{ touchAction: "manipulation" }}
    >
      <div aria-hidden className="pc-veu absolute inset-0 bg-white sm:bg-[#050b16]/60" />
      <div
        ref={folhaRef}
        data-pc="folha"
        className={[
          "pc-folha relative flex flex-col w-full bg-white text-[#0B1F45]",
          "h-svh",
          "after:content-[''] after:absolute after:inset-x-0 after:top-full after:h-[100lvh] after:bg-white",
          "sm:h-auto sm:max-w-[640px] sm:max-h-[min(800px,calc(100dvh_-_2*max(24px,7dvh)))]",
          "sm:shadow-[0_30px_90px_-20px_rgba(0,0,0,0.45)] sm:after:hidden",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra do topo: voltar, progresso, fechar. */}
        <div className="relative flex-none flex items-center gap-3 sm:gap-4 px-3 sm:px-5 box-content h-16 pt-[env(safe-area-inset-top)] sm:pt-0">
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
            aria-valuemin={0}
            aria-valuemax={nPerguntas + 1}
            aria-valuenow={n}
          >
            <div
              data-pc="barra"
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
          data-pc="corpo"
          onScroll={medirBordas}
          className="flex-auto min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-5 sm:px-10"
          style={{ paddingBottom: comRodape ? "1.25rem" : "calc(1.75rem + env(safe-area-inset-bottom))" }}
        >
          <div key={chaveDoPasso} data-pc="conteudo" className={dir > 0 ? "pc-frente" : "pc-tras"}>
            {passo.tipo === "intro" ? (
              <p className="mt-5 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#1F7A44]">{titulo.o}</p>
            ) : passo.tipo !== "fim" ? (
              <p data-pc="contagem" className="mt-5 text-[13px] font-semibold tracking-[0.04em] text-[#1F7A44]">{n} de {nPerguntas}</p>
            ) : null}
            <h2
              id="parceiro-titulo"
              ref={tituloRef}
              tabIndex={-1}
              className={`${passo.tipo === "fim" ? "mt-5" : "mt-2"} font-serif text-[27px] sm:text-[32px] leading-[1.15] tracking-[-0.01em] text-[#0B1F45] outline-none`}
              style={{ textWrap: "balance" }}
            >
              {titulo.t}
            </h2>
            {titulo.s && <p className="mt-3 text-[15px] leading-relaxed text-[#43474e] max-w-[52ch]">{titulo.s}</p>}

            <div className="mt-6">
              {passo.tipo === "pergunta" && !passo.p.multipla && (
                <Opcoes rotulo={passo.p.titulo} opcoes={passo.p.opcoes} valor={r.respostas[passo.p.id] as string | undefined} onPick={(v) => escolher(passo.p, v)} />
              )}

              {passo.tipo === "pergunta" && passo.p.multipla && (
                <div role="group" aria-label={passo.p.titulo} className="space-y-3">
                  {passo.p.opcoes.map((o, k) => (
                    <OpcaoMulti
                      key={o.value}
                      k={k}
                      label={o.label}
                      ativo={((r.respostas[passo.p.id] as string[] | undefined) ?? []).includes(o.value)}
                      cheio={false}
                      onClick={() => alternar(passo.p, o.value)}
                    />
                  ))}
                </div>
              )}

              {passo.tipo === "cidade" && (
                <div>
                  <Opcoes rotulo={titulo.t} opcoes={CIDADES_PARCEIRO} valor={r.cidade} onPick={escolherCidade} />
                  {r.cidade && r.cidade !== "manaus" && (
                    <label className="pc-surge-curto block mt-5">
                      <span className="block text-[14px] text-[#43474e] mb-2">{r.cidade === "fora" ? "Qual cidade e estado?" : "Qual cidade? (opcional)"}</span>
                      <input
                        ref={campoRef}
                        name="cidade"
                        value={r.cidadeOutra ?? ""}
                        onChange={(e) => setR((x) => ({ ...x, cidadeOutra: e.target.value.slice(0, CIDADE_OUTRA_MAX) }))}
                        onKeyDown={(e) => { if (e.key === "Enter" && podeSeguir) { e.preventDefault(); avancar(); } }}
                        enterKeyHint="next"
                        autoComplete="address-level2"
                        placeholder={r.cidade === "fora" ? "Ex.: Belém, PA" : "Ex.: Parintins"}
                        className={`${campoCls} h-14`}
                      />
                    </label>
                  )}
                </div>
              )}

              {passo.tipo === "nome" && (
                <label className="block">
                  <span className="block text-[14px] text-[#43474e] mb-2">Seu nome</span>
                  <input
                    ref={campoRef}
                    name="nome"
                    required
                    value={r.nome ?? ""}
                    onChange={(e) => setR((x) => ({ ...x, nome: e.target.value.slice(0, NOME_MAX) }))}
                    onKeyDown={(e) => { if (e.key === "Enter" && podeSeguir) { e.preventDefault(); avancar(); } }}
                    autoComplete="name"
                    enterKeyHint="next"
                    placeholder="Ex.: Ana Souza"
                    className={`${campoCls} h-14`}
                  />
                </label>
              )}

              {passo.tipo === "whatsapp" && (
                <label className="block">
                  <span className="block text-[14px] text-[#43474e] mb-2">WhatsApp com DDD</span>
                  <input
                    ref={campoRef}
                    name="whatsapp"
                    type="tel"
                    inputMode="tel"
                    required
                    aria-invalid={foneIncompleto || undefined}
                    aria-describedby="parceiro-fone-ajuda"
                    value={mascaraFone(r.whatsapp ?? "")}
                    onChange={(e) => setR((x) => ({ ...x, whatsapp: digitosFone(e.target.value).slice(0, 11) }))}
                    onKeyDown={(e) => { if (e.key === "Enter" && podeSeguir) { e.preventDefault(); avancar(); } }}
                    autoComplete="tel-national"
                    enterKeyHint="done"
                    placeholder="(92) 90000-0000"
                    className={`${campoCls} h-14`}
                  />
                  <span id="parceiro-fone-ajuda" className="block mt-2 text-[13px] text-[#43474e]" aria-live="polite">
                    {foneIncompleto ? "Confira o número: são 10 ou 11 dígitos com o DDD." : "Só o número, com o DDD."}
                  </span>
                </label>
              )}

              {passo.tipo === "fim" && (
                <dl className="bg-[#F6F5F2] px-5 py-1">
                  {resumo.map((it, k) => (
                    <div key={it.k} style={cascata(k)} className="pc-item flex items-start gap-4 py-2.5 border-b border-[#e8e6e0] last:border-0">
                      <div className="min-w-0 flex-1 pt-0.5">
                        <dt className="text-[13px] text-[#43474e]">{it.rotulo}</dt>
                        <dd className="mt-0.5 text-[16px] leading-snug text-[#0B1F45] whitespace-pre-line break-words">{it.valor || "Falta responder"}</dd>
                      </div>
                      <button
                        type="button"
                        onClick={() => irParaChave(it.k)}
                        aria-label={`Alterar ${it.rotulo.toLowerCase()}`}
                        className={`flex-shrink-0 ${linkCls} text-[14px]`}
                      >
                        Alterar
                      </button>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </div>
        </div>

        {comRodape && (
          <div
            data-pc="rodape"
            className="relative flex-none bg-white px-5 sm:px-10 pt-3"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
          >
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-[#e8ebf0] transition-opacity duration-200" style={{ opacity: bordas.base ? 1 : 0 }} />
            {passo.tipo === "fim" ? (
              <>
                <a
                  href={linkWhatsappParceiro(WHATSAPP_VENDAS, perfil, r)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={enviar}
                  data-pc="whatsapp"
                  className={`w-full min-h-[56px] inline-flex items-center justify-center gap-3 rounded-full bg-[#36A35C] text-[#0B1F45] text-[16px] font-semibold px-6 hover:bg-[#2f9150] transition-[background-color,transform] duration-150 motion-safe:active:scale-[0.98] ${foco}`}
                >
                  <IconeWhats />
                  Abrir o WhatsApp
                </a>
                <p className="text-[13px] text-[#43474e] text-center mt-2">Você conversa com um consultor da Orbital.</p>
              </>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 text-[14px] text-[#43474e]" aria-live="polite">
                  {marcadas > 0 && `${marcadas} marcada${marcadas > 1 ? "s" : ""}`}
                </div>
                <button
                  type="button"
                  onClick={avancar}
                  disabled={!podeSeguir}
                  data-pc="continuar"
                  className={`flex-shrink-0 min-h-[52px] inline-flex items-center justify-center gap-2 rounded-full pl-6 pr-5 text-[16px] font-semibold transition-[background-color,color,transform] duration-150 ${foco} ${
                    passo.tipo === "intro" ? "w-full" : ""
                  } ${
                    podeSeguir ? "bg-[#36A35C] text-[#0B1F45] hover:bg-[#2f9150] motion-safe:active:scale-[0.97]" : "bg-[#e8ebf0] text-[#5f6672] cursor-not-allowed"
                  }`}
                >
                  {passo.tipo === "intro" ? "Começar" : "Continuar"}
                  <Seta />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Campo-isca anti-robô. Fora da tela e fora da ordem de tabulação. */}
        <div aria-hidden className="absolute -left-[10000px] w-px h-px overflow-hidden">
          <input tabIndex={-1} autoComplete="off" value={isca} onChange={(e) => setIsca(e.target.value)} />
        </div>
      </div>
    </div>
  );
}
