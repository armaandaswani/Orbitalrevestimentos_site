"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import Botao from "@/components/ds/Botao";
import Capitulo from "@/components/ds/Capitulo";
import ProgressoCapitulos from "@/components/ds/ProgressoCapitulos";
import Revelar from "@/components/projetos/Revelar";
import SecaoCabecalho, { Sobretitulo } from "@/components/projetos/SecaoCabecalho";
import type { RespostasContato } from "@/lib/contato";

const CATALOGUE_URL =
  "https://drive.google.com/file/d/1zhm5MgKGSDRThqk8FqqwfX-WijI7K-iD/view?usp=drive_link";

/**
 * Parcerias como apresentação: abertura → 01 Arquitetos e designers →
 * 02 Marceneiros → 03 Engenheiros → 04 Revendedores → 05 Cadastro (cupom e
 * portal) → 06 Contato. Aplicadores e instaladores vão para a formação da
 * Academia Orbital. Todo caminho comercial abre o pré-contato; o PFB se
 * apresenta só pelos próprios méritos, sem comparar com outros materiais.
 */
interface Perfil {
  id: string;
  numero: string;
  rotulo: string;
  curto: string;
  sobretitulo: string;
  titulo: string;
  texto: string;
  beneficios: { t: string; d: string }[];
  imagem: string;
  destaque: { valor: string; rotulo: string };
  cta: string;
  inicial?: RespostasContato;
  nota?: string;
}

const PERFIS_PARCERIA: Perfil[] = [
  {
    id: "arquitetos", numero: "01", rotulo: "Arquitetos e designers", curto: "Arquitetos",
    sobretitulo: "Arquitetos, urbanistas e designers de interiores",
    titulo: "O projeto que o seu cliente ainda vai elogiar daqui a cinco anos.",
    texto: "Em Manaus, com umidade acima de 80% o ano todo, o acabamento precisa envelhecer bem. O Painel Flexível em Fibra de Bambu (PFB) mantém a aparência original, com veios nítidos e textura intacta: o projeto fala por você muito depois da entrega.",
    beneficios: [
      { t: "Acabamento que preserva a aparência por anos", d: "Resistente à água, anti-mofo e estável em ciclos térmicos. O visual que saiu da obra se mantém, protegendo a imagem do seu trabalho." },
      { t: "15 acabamentos para o moodboard", d: "Classic (mármore fosco), Brilliance (mármore polido) e Elegance (madeira texturizada), em impressão fotorrealista de alta fidelidade." },
      { t: "Amostras físicas gratuitas", d: "Parceiros recebem amostras sem custo para apresentar a clientes e compor moodboards. Um consultor leva até o seu escritório." },
      { t: "Documentação técnica completa", d: "ART de Engenharia Civil, CREA registrado e ficha técnica detalhada. Tudo pronto para aprovação." },
      { t: "Seja referência em inovação", d: "Um material novo, certificado e premium que poucos profissionais da cidade ainda conhecem. Especificá-lo posiciona você à frente." },
      { t: "Condições exclusivas para parceiros", d: "Arquitetos cadastrados têm acesso a condições e benefícios disponíveis apenas para a rede Orbital." },
    ],
    imagem: "/images/catalogue/aplicacao-sala.jpeg",
    destaque: { valor: "+5 anos", rotulo: "de aparência preservada" },
    cta: "Quero especificar o PFB",
    inicial: { perfil: "arquiteto" },
  },
  {
    id: "marceneiros", numero: "02", rotulo: "Marceneiros", curto: "Marceneiros",
    sobretitulo: "Marceneiros",
    titulo: "Quem instala rápido, fecha mais contratos.",
    texto: "Um cômodo em 2 a 3 horas, sem poeira e sem equipamento pesado. Mais projetos por mês com a mesma equipe: o volume é o seu ganho.",
    beneficios: [
      { t: "Processo de instalação simplificado", d: "Cola PU-40 na fixação (2 tubos por placa) e tupia para o acabamento das bordas. Resultado profissional desde o primeiro projeto." },
      { t: "Ganhe mais pelo volume, não pelo esforço", d: "Com 2 a 3 horas por cômodo, você atende mais projetos no mesmo mês, sem contratar ninguém." },
      { t: "Obra limpa em qualquer ambiente", d: "Sem serra circular, sem poeira. Ideal para clínicas, escritórios ocupados e residências com crianças, sem interditar o espaço." },
      { t: "Material que surpreende o cliente", d: "Acabamento fotorrealista em mármore ou madeira que dura anos sem deteriorar." },
      { t: "Compra direta com condições de parceiro", d: "Marceneiros parceiros compram as placas direto com a Orbital, com tabela diferenciada, para embutir nos próprios projetos." },
      { t: "Suporte e formação", d: "Manual técnico, material de apoio no Instagram (@orbitalrevestimentos), atendimento do consultor e a formação da Academia Orbital." },
    ],
    imagem: "/images/catalogue/projeto-escritorio-depois.jpeg",
    destaque: { valor: "2–3 h", rotulo: "de instalação por cômodo" },
    cta: "Quero instalar o PFB",
    nota: "Aplicadores e instaladores: a formação em instalação, no padrão Orbital, é da Academia Orbital.",
  },
  {
    id: "engenheiros", numero: "03", rotulo: "Engenheiros", curto: "Engenheiros",
    sobretitulo: "Engenheiros",
    titulo: "ART homologada, documentação completa, aprovação sem improviso.",
    texto: "ART de Engenharia Civil assinada, CREA registrado e ficha técnica com dados de resistência, umidade e fogo. Especifique com base em dados reais.",
    beneficios: [
      { t: "ART nº AM20260593657", d: "Assinada por Eng. Civil Werksson Sousa — CREA 042030134-8-D. Disponível para projetos que exigem laudo técnico." },
      { t: "72,3 MPa de resistência à flexão", d: "Certificada em laboratório; dados completos na ficha técnica." },
      { t: "Inchamento de 0,2% em 48 h", d: "Testado em ciclos de imersão, congelamento e aquecimento. Aprovado para banheiros, cozinhas e áreas úmidas." },
      { t: "Anti-mofo · anti-cupim · não propaga chamas", d: "Indicado para clínicas, ambientes hospitalares e projetos com requisitos de segurança contra incêndio." },
      { t: "Aprovado para projetos navais", d: "Utilizado em embarcações registradas. Resistência à umidade e à salinidade documentada em ensaios." },
    ],
    imagem: "/images/catalogue/projeto-hall.jpeg",
    destaque: { valor: "72,3 MPa", rotulo: "de resistência à flexão" },
    cta: "Solicitar documentação técnica",
    inicial: { perfil: "arquiteto" },
  },
  {
    id: "revendedores", numero: "04", rotulo: "Revendedores", curto: "Revendedores",
    sobretitulo: "Revendedores",
    titulo: "Um produto que seus clientes não encontram em outra loja.",
    texto: "Tabela exclusiva, pronta-entrega em Manaus e suporte comercial. Um portfólio de alto valor com diferenciação natural: o material se vende pela própria obra.",
    beneficios: [
      { t: "Estoque local, entrega em 24–48 h", d: "Sem depender de frete nacional. A reforma do seu cliente começa essa semana." },
      { t: "Tabela diferenciada para parceiros", d: "Condições especiais para revendedores cadastrados, apresentadas pelo consultor." },
      { t: "15 acabamentos exclusivos em Manaus", d: "Um portfólio que seus clientes não vão encontrar em outro lugar." },
      { t: "Alto valor por placa", d: "Produto premium, 3,48 m² por placa: eleva o valor médio de venda do seu negócio." },
      { t: "Suporte comercial completo", d: "Catálogo digital, ficha técnica e apoio da equipe para você vender com autoridade." },
    ],
    imagem: "/images/catalogue/projeto-sala-depois.jpeg",
    destaque: { valor: "15", rotulo: "acabamentos exclusivos" },
    cta: "Quero ser revendedor",
  },
];

export default function ParceriasPage() {
  return (
    <div className="pt-20">
      <ProgressoCapitulos />

      {/* ── Abertura ───────────────────────────────────────────────────────── */}
      <section className="bg-[#0B1F45] text-white ds-escuro">
        <div className="ds-wrap pt-10 pb-10 lg:py-16">
          <div className="max-w-3xl">
            <Sobretitulo escuro>Orbital Revestimentos · Programa de parceiros · Manaus</Sobretitulo>
            <h1 className="font-serif text-white text-t1 font-normal tracking-[-0.025em] mt-4 mb-4 text-balance">
              Para cada profissional, uma proposta.
            </h1>
            <p className="text-white/75 text-lead max-w-2xl text-pretty">
              Condições da Orbital para quem especifica, instala, aprova e revende o Painel Flexível em Fibra de Bambu (PFB). Escolha o seu perfil.
            </p>
          </div>
          <ol className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3 mt-8">
            {PERFIS_PARCERIA.map((p) => (
              <li key={p.id}>
                <a href={`#${p.id}`} className="group flex flex-col justify-between h-full min-h-[7rem] p-4 lg:p-5 border border-white/20 hover:border-secondary hover:bg-white/5 transition-colors">
                  <span className="font-serif text-white/60 text-sm">{p.numero}</span>
                  <span className="text-white text-xs tracking-[0.12em] uppercase font-bold mt-3">{p.rotulo}</span>
                </a>
              </li>
            ))}
          </ol>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-6">
            <Botao href="#cadastro" tom="linha" largo>Já tenho código de indicação</Botao>
            <Botao href="/academia" tom="linha" largo seta>Aplicadores: formação na Academia</Botao>
          </div>
        </div>
      </section>

      {/* ── 01–04 Perfis ───────────────────────────────────────────────────── */}
      {PERFIS_PARCERIA.map((p, i) => {
        const escuro = i % 2 === 1;
        return (
          <Capitulo key={p.id} id={p.id} numero={p.numero} rotulo={p.curto} rotuladoPor={`${p.id}-titulo`} escuro={escuro}
            className={`ds-secao ${escuro ? "bg-[#0B1F45] text-white" : "bg-background"}`}>
            <div className="ds-wrap grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-16 items-start">
              <div>
                <Revelar>
                  <SecaoCabecalho id={`${p.id}-titulo`} numero={p.numero} escuro={escuro} sobretitulo={p.sobretitulo} titulo={p.titulo} texto={p.texto} />
                </Revelar>
                <ul className="space-y-4">
                  {p.beneficios.map((b, j) => (
                    <Revelar key={b.t} como="li" ordem={j} className="flex gap-4">
                      <span aria-hidden className="w-6 h-px bg-secondary mt-3 flex-shrink-0" />
                      <div>
                        <p className={`font-semibold text-corpo ${escuro ? "text-white" : "text-primary"}`}>{b.t}</p>
                        <p className={`text-legenda mt-1 leading-relaxed ${escuro ? "text-white/70" : "text-on-surface-variant"}`}>{b.d}</p>
                      </div>
                    </Revelar>
                  ))}
                </ul>
                {p.nota && (
                  <p className={`mt-8 border-l-2 border-secondary pl-4 text-corpo ${escuro ? "text-white/80" : "text-on-surface-variant"}`}>
                    {p.nota} <a href="/academia" className={`underline underline-offset-4 font-semibold ${escuro ? "text-white" : "text-primary"}`}>Conhecer a formação</a>
                  </p>
                )}
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-8">
                  <Botao contato inicial={p.inicial} tom={escuro ? "claro" : "cheio"} grande largo>{p.cta}</Botao>
                  <Botao href={CATALOGUE_URL} externo tom={escuro ? "linha" : "vazado"} grande largo>Baixar catálogo</Botao>
                </div>
              </div>
              <Revelar ordem={1} className="lg:sticky lg:top-24">
                <div className="relative aspect-[4/5] overflow-hidden bg-primary">
                  <Image src={p.imagem} alt={`Ambiente com PFB Orbital: ${p.rotulo}`} fill sizes="(max-width: 1023px) 92vw, 520px" className="object-cover mv-desvela" />
                  <div className="absolute bottom-4 left-4 bg-white px-5 py-4 shadow-xl">
                    <p className="font-serif text-primary text-t2 leading-none">{p.destaque.valor}</p>
                    <p className="text-on-surface-variant text-sobre tracking-[0.12em] uppercase font-semibold mt-1">{p.destaque.rotulo}</p>
                  </div>
                </div>
              </Revelar>
            </div>
          </Capitulo>
        );
      })}

      {/* ── 05 Cadastro ────────────────────────────────────────────────────── */}
      <Capitulo id="cadastro" numero="05" rotulo="Cadastro" rotuladoPor="cadastro-titulo" className="ds-secao bg-white border-t border-surface-container-high">
        <SelfRegisterSection />
      </Capitulo>

      {/* ── 06 Contato ─────────────────────────────────────────────────────── */}
      <Capitulo id="contato" numero="06" rotulo="Contato" rotuladoPor="contato-titulo" escuro className="ds-secao bg-[#0B1F45] text-white">
        <div className="ds-wrap">
          <Revelar className="max-w-3xl mx-auto text-center">
            <Sobretitulo escuro numero="06">Condições exclusivas para profissionais</Sobretitulo>
            <h2 id="contato-titulo" className="font-serif text-white text-t1 font-normal tracking-[-0.025em] mt-4 mb-5 text-balance">Pronto para fazer parte da rede Orbital?</h2>
            <p className="text-white/75 text-lead mb-8 text-pretty">
              Tabela diferenciada, amostras gratuitas, suporte técnico e estoque pronto em Manaus. Um consultor responde pelo pré-contato.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3">
              <Botao contato tom="claro" grande largo>Iniciar parceria</Botao>
              <Botao href="/produtos" tom="linha" grande largo seta>Ver o catálogo</Botao>
            </div>
            <p className="text-white/60 text-legenda italic mt-10">Orbital · Catálogo 2026 · Dados sujeitos a alteração sem aviso prévio. Somos fornecedores diretos e não realizamos instalação.</p>
          </Revelar>
        </div>
      </Capitulo>
    </div>
  );
}

const labelCls = "block text-sobre tracking-[0.15em] uppercase font-bold text-[#74777f] mb-2";
const inputCls = "w-full min-h-11 border border-[#e2e2e2] px-4 py-3 text-base sm:text-sm text-[#0B1F45] focus:outline-none focus:border-[#0B1F45] placeholder-[#b0b4bc]";

function SelfRegisterSection() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", referral_code: "", portal_password: "", birthday: "" });
  const [noReferral, setNoReferral] = useState(false);
  const [lockedRepCode, setLockedRepCode] = useState<string | null>(null); // código vindo de ?rep=
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ coupon_code: string; name: string } | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Código de indicação pela URL (?rep=): preenche, trava e leva ao formulário.
  useEffect(() => {
    const rep = new URLSearchParams(window.location.search).get("rep");
    if (!rep) return;
    const code = rep.toUpperCase();
    const t = setTimeout(() => {
      setForm((f) => ({ ...f, referral_code: code }));
      setLockedRepCode(code);
      setNoReferral(false);
      formRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }, 300);
    return () => clearTimeout(t);
  }, []);

  function handleBdayChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    let masked = digits;
    if (digits.length > 4) masked = digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4);
    else if (digits.length > 2) masked = digits.slice(0, 2) + "/" + digits.slice(2);
    setForm({ ...form, birthday: masked });
  }

  function bdayToISO(dmy: string): string {
    const [d, m, y] = dmy.split("/");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/partners/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        phone: form.phone,
        sales_rep_referral_code: noReferral ? null : (form.referral_code || null),
        portal_password: form.portal_password,
        birthday: form.birthday.length === 10 ? bdayToISO(form.birthday) : form.birthday,
      }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { setError(json.error || "Erro ao cadastrar. Tente novamente."); return; }
    setSuccess({ coupon_code: json.coupon_code, name: json.name });
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }, [form, noReferral]);

  return (
    <div className="ds-wrap flex flex-col lg:flex-row gap-10 lg:gap-20 items-start">
      <div className="lg:w-[38%] flex-shrink-0">
        <Revelar>
          <SecaoCabecalho id="cadastro-titulo" numero="05" sobretitulo="Já é parceiro?" titulo="Cadastre-se e receba seu cupom personalizado."
            texto="Crie sua conta, receba seu cupom e acesse o portal do parceiro para acompanhar tudo." />
          <ol className="space-y-3">
            {["Preencha o formulário", "Receba seu cupom por e-mail", "Acesse o portal e acompanhe tudo"].map((t, i) => (
              <li key={t} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 bg-primary text-white text-sobre font-bold flex items-center justify-center">{i + 1}</span>
                <p className="text-on-surface-variant text-corpo leading-relaxed">{t}</p>
              </li>
            ))}
          </ol>
        </Revelar>
      </div>

      <div ref={formRef} className="lg:w-[62%] w-full scroll-mt-24">
        {success ? (
          <div className="bg-background border border-[#36A35C] px-6 py-10 text-center" role="status">
            <p className="font-serif text-primary text-t3 mb-2">Cadastro recebido!</p>
            <p className="text-on-surface-variant text-corpo leading-relaxed mb-4">
              Olá, <strong>{success.name.split(" ")[0]}</strong>. Seu cupom reservado é{" "}
              <strong className="text-primary tracking-widest font-mono text-base">{success.coupon_code}</strong>.
            </p>
            <p className="text-on-surface-variant text-legenda">Nossa equipe ativa seu cadastro em até 24 h. Você receberá uma confirmação por e-mail.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-background border border-surface-variant p-5 lg:p-8">
            <p className="font-serif text-primary text-t3 mb-6">Criar conta de parceiro</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="p-nome" className={labelCls}>Nome completo *</label>
                <input id="p-nome" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Seu nome" autoComplete="name" />
              </div>
              <div>
                <label htmlFor="p-email" className={labelCls}>E-mail *</label>
                <input id="p-email" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="seu@email.com" autoComplete="email" />
              </div>
              <div>
                <label htmlFor="p-whats" className={labelCls}>WhatsApp *</label>
                <input id="p-whats" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} placeholder="(92) 9 0000-0000" autoComplete="tel" inputMode="tel" />
              </div>
              <div>
                <label htmlFor="p-nasc" className={labelCls}>Data de nascimento *</label>
                <input id="p-nasc" required type="text" placeholder="DD/MM/AAAA" value={form.birthday} onChange={(e) => handleBdayChange(e.target.value)} maxLength={10} className={inputCls} inputMode="numeric" />
              </div>
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-2 gap-3">
                  <label htmlFor="p-codigo" className={`${labelCls} mb-0`}>Código de indicação {noReferral ? "" : "*"}</label>
                  {!lockedRepCode && (
                    <label className="flex items-center gap-2 min-h-11 cursor-pointer select-none">
                      <input type="checkbox" checked={noReferral}
                        onChange={(e) => { setNoReferral(e.target.checked); if (e.target.checked) setForm((f) => ({ ...f, referral_code: "" })); }}
                        className="w-6 h-6 accent-[#0B1F45] cursor-pointer" />
                      <span className="text-legenda text-on-surface-variant whitespace-nowrap">Não tenho código</span>
                    </label>
                  )}
                </div>
                <div className="relative">
                  <input id="p-codigo" required={!noReferral} disabled={noReferral || !!lockedRepCode} value={noReferral ? "" : form.referral_code}
                    onChange={(e) => setForm({ ...form, referral_code: e.target.value.toUpperCase() })}
                    className={`${inputCls} uppercase tracking-widest ${noReferral ? "bg-surface-container text-[#b0b4bc] cursor-not-allowed" : lockedRepCode ? "border-[#36A35C] bg-[#f0f5ec] text-[#2347A0] cursor-not-allowed font-bold" : ""}`}
                    placeholder={noReferral ? "Sem código de indicação" : "EX: REP_JOAO"} />
                  {lockedRepCode && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sobre font-bold tracking-wide text-[#1F7A44] bg-[#dcf0d8] px-1.5 py-0.5">Validado</span>}
                </div>
                {lockedRepCode && <p className="text-sobre text-[#1F7A44] mt-1">Código do seu consultor Orbital aplicado automaticamente.</p>}
              </div>
            </div>
            <div className="mb-5">
              <label htmlFor="p-senha" className={labelCls}>Senha para seu portal *</label>
              <div className="relative">
                <input id="p-senha" required type={showPassword ? "text" : "password"} value={form.portal_password}
                  onChange={(e) => setForm({ ...form, portal_password: e.target.value })} className={`${inputCls} pr-12`} placeholder="Mínimo 8 caracteres" minLength={8} autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-0 top-0 h-full w-11 flex items-center justify-center text-[#74777f] hover:text-primary transition-colors">
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
            </div>
            {error && <p className="text-error text-legenda mb-4" role="alert">{error}</p>}
            <button type="submit" disabled={loading} className="ds-botao ds-botao-cheio w-full min-h-12 disabled:opacity-50">
              {loading ? "Enviando…" : "Solicitar cadastro"}
            </button>
            <p className="text-on-surface-variant text-legenda text-center mt-3">Aprovação em até 24 h · Cupom gerado automaticamente</p>
          </form>
        )}
      </div>
    </div>
  );
}
