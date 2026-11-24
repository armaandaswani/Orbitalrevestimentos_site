"use client";

import { useEffect, useId, useRef, useState } from "react";
import { dataIso, dataValida, mascaraData } from "@/lib/parcerias-data";
import { CADASTRO } from "@/lib/parcerias-textos";
import { useRepDaUrl } from "./useRepDaUrl";

/**
 * Cadastro de parceiro, com o título, o botão "Copiar link" e o formulário.
 * A profissão vem de fora: a página de arquitetos manda as suas (a primeira já
 * marcada; com mais de uma, o visitante escolhe). Desde 24/11/2026 só quem
 * indica clientes (arquitetos e designers) usa este cadastro; os outros perfis
 * vão pelo pré-contato no WhatsApp (ChamadaParceiro). Envia para
 * /api/partners/register, como o formulário antigo de
 * /parcerias: nome, e-mail, WhatsApp, nascimento, senha do portal e, se houver,
 * o código de indicação.
 *
 * `?rep=CÓDIGO` na URL (o link do representante) preenche e trava o código de
 * indicação. "Copiar link" copia o endereço desta página terminando na âncora
 * do cadastro, com o `?rep=` quando houver: é o link que o dono manda ao
 * profissional.
 */

const CAMPO = "w-full border border-[#0B1F45]/20 bg-white px-4 py-3 text-corpo text-[#0B1F45] placeholder:text-[#0B1F45]/35 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[#0B1F45]";
const ROTULO = "block text-legenda text-[#43474e] mb-1.5";

/** A API recusou o código de indicação (representante inativo ou código errado). */
const CODIGO_RECUSADO = /c[oó]digo de representante/i;

export default function CadastroParceiro({ ancora, profissoes, titulo = CADASTRO.titulo, apoio = CADASTRO.apoio, botao = CADASTRO.botao, claro = true, children }: {
  /** id da seção: o link copiado termina em #ancora. */
  ancora: string;
  profissoes: string[];
  titulo?: string;
  apoio?: string;
  /** Texto do botão de envio. */
  botao?: string;
  /** Fundo claro (padrão) ou transparente, quando a página já dá o fundo. */
  claro?: boolean;
  /** Conteúdo curto entre a frase de apoio e o "Copiar link" (os pontos da revenda). */
  children?: React.ReactNode;
}) {
  const id = useId();
  const [form, setForm] = useState({ nome: "", email: "", whatsapp: "", nascimento: "", senha: "", codigo: "" });
  const [profissao, setProfissao] = useState(profissoes[0]);
  const [abriuCodigo, setAbriuCodigo] = useState(false);
  // Link do representante: o código chega preenchido e travado. Se a API o
  // recusar (representante inativo), a trava solta: a pessoa corrige ou tira
  // o código e o cadastro não fica preso.
  const repDaUrl = useRepDaUrl();
  const [travaSolta, setTravaSolta] = useState(false);
  const codigoTravado = repDaUrl && !travaSolta ? repDaUrl : null;
  const temCodigo = abriuCodigo || !!codigoTravado;
  const codigo = codigoTravado ?? form.codigo;
  const [verSenha, setVerSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState<{ cupom: string | null; nome: string } | null>(null);
  const [copia, setCopia] = useState<"" | "ok" | "manual">("");
  const [link, setLink] = useState("");
  const tituloSucesso = useRef<HTMLParagraphElement>(null);
  const campoLink = useRef<HTMLInputElement>(null);
  const avisoCopia = useRef(0);

  useEffect(() => () => window.clearTimeout(avisoCopia.current), []);
  // O aviso de sucesso recebe o foco: o leitor de tela anuncia e a página não pula.
  useEffect(() => { if (sucesso) tituloSucesso.current?.focus(); }, [sucesso]);
  useEffect(() => { if (copia === "manual") campoLink.current?.select(); }, [copia]);

  const campo = (chave: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [chave]: chave === "nascimento" ? mascaraData(e.target.value) : e.target.value }));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (enviando) return;
    setErro("");
    if (!dataValida(form.nascimento, new Date().getFullYear())) { setErro("Confira a data de nascimento (DD/MM/AAAA)."); return; }
    setEnviando(true);
    try {
      const res = await fetch("/api/partners/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.nome.trim(),
          email: form.email.trim(),
          phone: form.whatsapp.trim(),
          birthday: dataIso(form.nascimento),
          portal_password: form.senha,
          profession: profissao,
          sales_rep_referral_code: temCodigo && codigo.trim() ? codigo.trim() : null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const mensagem = typeof json.error === "string" && json.error ? json.error : "Não deu para cadastrar agora. Tente de novo em instantes.";
        if (codigoTravado && CODIGO_RECUSADO.test(mensagem)) {
          // Código do link recusado: vira um campo comum, já com o código, para corrigir ou apagar.
          setForm((f) => ({ ...f, codigo: codigoTravado }));
          setTravaSolta(true);
          setAbriuCodigo(true);
          setErro(`${mensagem} Corrija o código ou apague-o para seguir sem indicação.`);
        } else {
          setErro(mensagem);
        }
        return;
      }
      setSucesso({ cupom: typeof json.coupon_code === "string" && json.coupon_code ? json.coupon_code : null, nome: json.name ?? form.nome });
    } catch {
      setErro("Não deu para cadastrar agora. Confira a conexão e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  async function copiarLink() {
    const u = new URL(window.location.href);
    const rep = u.searchParams.get("rep");
    const endereco = `${u.origin}${u.pathname}${rep ? `?rep=${encodeURIComponent(rep)}` : ""}#${ancora}`;
    window.clearTimeout(avisoCopia.current);
    try {
      await navigator.clipboard.writeText(endereco);
      setCopia("ok");
      avisoCopia.current = window.setTimeout(() => setCopia(""), 2200);
    } catch {
      // Sem acesso à área de transferência: mostra o link já selecionado para copiar à mão.
      setLink(endereco);
      setCopia("manual");
    }
  }

  return (
    <section id={ancora} aria-labelledby={`${id}-titulo`} className={claro ? "bg-[#F6F5F2]" : undefined}>
      <div className="ds-wrap ds-secao grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20 lg:items-start">
        <div>
          <h2 id={`${id}-titulo`} className="font-serif text-t1 text-[#0B1F45] text-balance max-w-[18ch]">{titulo}</h2>
          <p className="mt-4 text-lead text-[#43474e] max-w-[36ch]">{apoio}</p>
          {children}
          <button type="button" onClick={copiarLink} data-teste="copiar-link"
            className="mt-6 inline-flex items-center gap-2 min-h-11 text-legenda font-semibold text-[#0B1F45] underline underline-offset-4 decoration-[#0B1F45]/30 hover:decoration-[#0B1F45] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1F45]">
            <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07l-1.5 1.5M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07l1.5-1.5" />
            </svg>
            <span aria-live="polite">{copia === "ok" ? CADASTRO.copiado : CADASTRO.copiar}</span>
          </button>
          {copia === "manual" && (
            <div className="mt-2 max-w-[36ch]">
              <label htmlFor={`${id}-link`} className={ROTULO}>Copie o link abaixo</label>
              <input ref={campoLink} id={`${id}-link`} readOnly value={link} onFocus={(e) => e.currentTarget.select()} className={`${CAMPO} text-legenda`} />
            </div>
          )}
        </div>

        <div className="bg-white border border-[#0B1F45]/12 p-5 sm:p-8">
          {sucesso ? (
            <div role="status" className="py-6 text-center">
              <p ref={tituloSucesso} tabIndex={-1} className="font-serif text-t2 text-[#0B1F45] focus:outline-none">{CADASTRO.sucessoTitulo}</p>
              <p className="mt-4 text-corpo text-[#43474e]">
                Olá, <strong>{sucesso.nome.split(" ")[0]}</strong>.
                {sucesso.cupom && (
                  <> O seu cupom reservado é <strong className="font-mono tracking-widest text-[#0B1F45]">{sucesso.cupom}</strong>.</>
                )}
              </p>
              <p className="mt-3 text-legenda text-[#43474e]">{CADASTRO.apoio}</p>
            </div>
          ) : (
            <form onSubmit={enviar} noValidate={false} className="grid gap-4 sm:grid-cols-2">
              {profissoes.length > 1 && (
                <fieldset className="sm:col-span-2">
                  <legend className={ROTULO}>Sua profissão</legend>
                  <div className="flex flex-wrap gap-2">
                    {profissoes.map((p) => (
                      <label key={p} className={`inline-flex items-center min-h-11 px-4 border cursor-pointer text-legenda has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#0B1F45] ${
                        profissao === p ? "bg-[#0B1F45] border-[#0B1F45] text-white" : "border-[#0B1F45]/20 text-[#0B1F45] hover:border-[#0B1F45]/50"
                      }`}>
                        <input type="radio" name={`${id}-profissao`} value={p} checked={profissao === p} onChange={() => setProfissao(p)} className="sr-only" />
                        {p}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              <div>
                <label htmlFor={`${id}-nome`} className={ROTULO}>Nome completo</label>
                <input id={`${id}-nome`} name="nome" required autoComplete="name" value={form.nome} onChange={campo("nome")} className={CAMPO} />
              </div>
              <div>
                <label htmlFor={`${id}-whatsapp`} className={ROTULO}>WhatsApp</label>
                <input id={`${id}-whatsapp`} name="whatsapp" required type="tel" inputMode="tel" autoComplete="tel" placeholder="(92) 90000-0000"
                  value={form.whatsapp} onChange={campo("whatsapp")} className={CAMPO} />
              </div>
              <div>
                <label htmlFor={`${id}-email`} className={ROTULO}>E-mail</label>
                <input id={`${id}-email`} name="email" required type="email" autoComplete="email" value={form.email} onChange={campo("email")} className={CAMPO} />
              </div>
              <div>
                <label htmlFor={`${id}-nascimento`} className={ROTULO}>Data de nascimento</label>
                <input id={`${id}-nascimento`} name="nascimento" required inputMode="numeric" autoComplete="bday" placeholder="DD/MM/AAAA" maxLength={10}
                  value={form.nascimento} onChange={campo("nascimento")} className={CAMPO} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor={`${id}-senha`} className={ROTULO}>Senha para o seu portal (mínimo de 8 caracteres)</label>
                <div className="relative">
                  <input id={`${id}-senha`} name="senha" required minLength={8} type={verSenha ? "text" : "password"} autoComplete="new-password"
                    value={form.senha} onChange={campo("senha")} className={`${CAMPO} pr-24`} />
                  <button type="button" onClick={() => setVerSenha((v) => !v)} aria-pressed={verSenha}
                    className="absolute right-1 top-1/2 -translate-y-1/2 min-h-10 px-3 text-legenda text-[#0B1F45] underline underline-offset-4 decoration-[#0B1F45]/30 focus-visible:outline-2 focus-visible:outline-[#0B1F45]">
                    {verSenha ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2">
                {temCodigo ? (
                  <>
                    <label htmlFor={`${id}-codigo`} className={ROTULO}>Código de indicação</label>
                    <input id={`${id}-codigo`} name="codigo" value={codigo} onChange={campo("codigo")} readOnly={!!codigoTravado} autoCapitalize="characters"
                      className={`${CAMPO} ${codigoTravado ? "bg-[#F6F5F2]" : ""}`} />
                    {codigoTravado && <p className="mt-1.5 text-legenda text-[#43474e]">Código do seu consultor Orbital, já aplicado.</p>}
                  </>
                ) : (
                  <button type="button" onClick={() => setAbriuCodigo(true)}
                    className="min-h-11 text-legenda text-[#0B1F45] underline underline-offset-4 decoration-[#0B1F45]/30 hover:decoration-[#0B1F45] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1F45]">
                    {CADASTRO.codigoPergunta}
                  </button>
                )}
              </div>

              {erro && <p role="alert" className="sm:col-span-2 text-legenda text-[#B3261E]">{erro}</p>}
              <button type="submit" disabled={enviando}
                className="sm:col-span-2 ds-botao ds-botao-cheio min-h-12 w-full justify-center active:opacity-90 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1F45]">
                {enviando ? CADASTRO.enviando : botao}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
