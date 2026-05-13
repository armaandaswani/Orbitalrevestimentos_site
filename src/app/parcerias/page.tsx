"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";

const CATALOGUE_URL =
  "https://drive.google.com/file/d/1zhm5MgKGSDRThqk8FqqwfX-WijI7K-iD/view?usp=drive_link";
const WA_BASE = "https://wa.me/5592988150149?text=";

type SegmentKey = "arquitetos" | "marceneiros" | "engenheiros" | "revendedores";
type Segment = {
  key: SegmentKey;
  label: string;
  short: string;
  icon: React.ReactNode;
  badge: string;
  pricingCallout?: string;
  tagline: string;
  headline: string;
  body: string;
  benefits: { title: string; desc: string }[];
  image: string;
  waText: string;
  stat: { value: string; label: string };
  ctaLabel: string;
  highlight: string;
};

const segments: Segment[] = [
  {
    key: "arquitetos" as SegmentKey,
    label: "Arquitetos & Urbanistas",
    short: "Arquitetos",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    badge: "Amostras grátis para moodboard",
    tagline: "Especifique com confiança. Entregue projetos que envelhecem bem.",
    headline: "O projeto que o seu cliente ainda vai elogiar daqui a cinco anos.",
    body: "Em Manaus, o MDF se deteriora em 2 a 3 anos. O ambiente entregue com perfeição começa a envergonhar o cliente — e a manchar a memória do profissional que assinou o projeto. O PFB Orbital mantém a aparência por anos: os veios do mármore continuam nítidos, a textura da madeira permanece intacta. Especifique o material certo e deixe o projeto falar por você muito depois da entrega.",
    benefits: [
      {
        title: "Acabamento que preserva a aparência por anos",
        desc: "Impermeável, anti-mofo e resistente a ciclos térmicos extremos. O visual que saiu da obra se mantém — protegendo a imagem do seu trabalho.",
      },
      {
        title: "15 acabamentos para moodboard",
        desc: "Classic (mármore fosco), Brilliance (mármore polido) e Elegance (madeira texturizada). Impressão UV fotorrealística de alta fidelidade.",
      },
      {
        title: "Amostras físicas gratuitas",
        desc: "Parceiros arquitetos recebem amostras sem custo para apresentar a clientes e compor moodboards.",
      },
      {
        title: "Documentação técnica completa",
        desc: "ART de Engenharia Civil e CREA registrado, com ficha técnica detalhada. Tudo pronto para aprovação de engenharia.",
      },
      {
        title: "Seja referência em inovação",
        desc: "O PFB Orbital é um material novo, certificado e premium que poucos arquitetos da cidade ainda conhecem. Especificá-lo posiciona você como profissional que traz o que há de melhor ao cliente — antes dos outros.",
      },
      {
        title: "Indicação acima do mercado",
        desc: "Arquitetos parceiros recebem comissão de indicação acima da média praticada no mercado para projetos especificados com Orbital.",
      },
    ],
    image: "/images/catalogue/aplicacao-sala.jpeg",
    waText:
      "Olá! Sou arquiteto/urbanista e vim pela aba de Arquitetos no site. Gostaria de conhecer as condições para especificação de projetos com o PFB Orbital.",
    stat: { value: "+5 anos", label: "de aparência preservada" },
    ctaLabel: "Solicitar amostras para projeto",
    highlight: "Arquitetos parceiros recebem indicação acima do mercado para projetos especificados com Orbital.",
  },
  {
    key: "marceneiros" as SegmentKey,
    label: "Marceneiros",
    short: "Marceneiros",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
      </svg>
    ),
    badge: "Treinamento de instalação gratuito",
    tagline: "Mais projetos por mês. Processo mais simples. Resultado premium.",
    headline: "Quem instala rápido, fecha mais contratos.",
    body: "Com o PFB Orbital, um cômodo sai em 2 a 3 horas. Você atende mais clientes no mesmo mês, sem aumentar equipe, sem estresse com poeira ou equipamento pesado. O volume é o seu ganho — e o processo é surpreendentemente simples.",
    benefits: [
      {
        title: "Processo de instalação simplificado",
        desc: "Cola PU 40 para fixação principal, com uso de tupia recomendado para acabamento perfeito nas bordas. Resultado profissional desde o primeiro projeto.",
      },
      {
        title: "Ganhe mais pelo volume, não pelo esforço",
        desc: "Com 2–3h por cômodo, você consegue 4× mais projetos no mesmo mês. Mais contratos fechados, mais receita — sem contratar ninguém.",
      },
      {
        title: "Obra limpa em qualquer ambiente",
        desc: "Sem serra circular, sem poeira tóxica. Ideal para clínicas, escritórios ocupados, residências com crianças — sem interditar o espaço.",
      },
      {
        title: "Material que surpreende o cliente",
        desc: "O acabamento fotorrealístico em mármore ou madeira entrega uma aparência que o cliente não espera — e que dura anos sem deteriorar.",
      },
      {
        title: "Preço diferenciado para compra direta",
        desc: "Marceneiros parceiros têm acesso a tabela especial para comprar as placas e embutir o material nos seus próprios projetos.",
      },
      {
        title: "Suporte direto do fabricante",
        desc: "Dúvida de instalação? Atendimento direto via WhatsApp — sem intermediários, sem demora.",
      },
    ],
    pricingCallout: "Compra direta disponível: marceneiros parceiros têm acesso a tabela de preços diferenciada para comprar as placas e embutir o material nos seus projetos — sem intermediários.",
    image: "/images/catalogue/projeto-escritorio-depois.jpeg",
    waText:
      "Olá! Sou marceneiro e vim pela aba de Marceneiros no site. Gostaria de saber sobre as condições de parceria e preço diferenciado para compra direta do PFB Orbital.",
    stat: { value: "2–3h", label: "instalação por cômodo" },
    ctaLabel: "Quero instalar PFB Orbital",
    highlight: "Marceneiros parceiros recebem indicação acima do mercado para instalações com PFB Orbital e preço diferenciado para compra direta.",
  },
  {
    key: "engenheiros" as SegmentKey,
    label: "Engenheiros",
    short: "Engenheiros",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
    badge: "ART · CREA · Documentação técnica",
    tagline: "Especifique com segurança. A documentação técnica faz o trabalho.",
    headline: "ART homologada, documentação completa, aprovação sem improviso.",
    body: "O PFB Orbital vem com ART de Engenharia Civil assinada e CREA registrado, além de ficha técnica completa com dados de resistência, umidade e comportamento ao fogo. Você especifica com base em dados reais — e defende em qualquer aprovação técnica sem precisar improvisar.",
    benefits: [
      {
        title: "ART nº AM20260593657",
        desc: "Assinada por Eng. Civil Werksson Sousa — CREA 042030134-8-D. Disponível para projetos que exigem laudo técnico de engenharia.",
      },
      {
        title: "72,3 MPa de resistência à flexão",
        desc: "Mais de 3× a resistência do MDF convencional (17–22 MPa). Dados disponíveis na ficha técnica.",
      },
      {
        title: "Inchamento de 0,2% em 48h",
        desc: "Testado em ciclos de imersão, congelamento e aquecimento. Aprovado para banheiros, cozinhas e áreas úmidas.",
      },
      {
        title: "Anti-mofo · Anti-cupim · Não propaga chamas",
        desc: "Indicado para clínicas, ambientes hospitalares e projetos com requisitos de segurança contra incêndio.",
      },
      {
        title: "Aprovado para projetos navais",
        desc: "Utilizado em embarcações registradas. Resistência à umidade e salinidade documentada em ensaios.",
      },
    ],
    image: "/images/catalogue/projeto-hall.jpeg",
    waText:
      "Olá! Sou engenheiro e vim pela aba de Engenheiros no site. Gostaria de acessar a documentação técnica e as condições de parceria Orbital.",
    stat: { value: "72,3 MPa", label: "resistência à flexão" },
    ctaLabel: "Solicitar documentação técnica",
    highlight: "Engenheiros parceiros recebem indicação acima do mercado para projetos com PFB Orbital.",
  },
  {
    key: "revendedores" as SegmentKey,
    label: "Revendedores",
    short: "Revendedores",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
    ),
    badge: "Tabela exclusiva para parceiros",
    tagline: "Margem real. Estoque em Manaus.",
    headline: "Um produto que seus clientes não encontram em outra loja.",
    body: "A Orbital oferece tabela exclusiva, pronta entrega e suporte de marketing para revendedores autorizados em Manaus. Um portfólio de alto ticket com diferenciação natural — o material faz a venda sozinho.",
    benefits: [
      {
        title: "Estoque local, entrega em 24–48h",
        desc: "Sem depender de frete nacional. A reforma do seu cliente começa essa semana.",
      },
      {
        title: "Tabela de preços diferenciada",
        desc: "Condições especiais para revendedores cadastrados, com margem compatível com produto premium.",
      },
      {
        title: "15 acabamentos sem concorrência local",
        desc: "Um portfólio exclusivo no mercado de Manaus. Seus clientes não vão encontrar em outro lugar.",
      },
      {
        title: "Alto ticket médio por placa",
        desc: "R$559–R$649 por placa (3,48m²). Ideal para elevar o valor médio de venda do seu negócio.",
      },
      {
        title: "Suporte comercial completo",
        desc: "Catálogo digital, ficha técnica e suporte de equipe para você vender com autoridade.",
      },
    ],
    image: "/images/catalogue/projeto-sala-depois.jpeg",
    waText:
      "Olá! Tenho interesse em revender os produtos Orbital. Vim pela aba de Revendedores no site e gostaria de saber sobre tabela de preços e condições de parceria.",
    stat: { value: "R$559+", label: "ticket por placa" },
    ctaLabel: "Quero ser revendedor",
    highlight: "Revendedores cadastrados têm acesso a condições exclusivas e estoque garantido.",
  },
];

const sharedStats = [
  { value: "15", unit: "acabamentos", label: "Em estoque em Manaus" },
  { value: "3,48", unit: "m²", label: "Por placa · 1,2m × 2,9m" },
  { value: "72,3", unit: "MPa", label: "Resistência à flexão" },
  { value: "0,2%", unit: "", label: "Absorção de água (48h)" },
];

export default function ParceriasPage() {
  const [active, setActive] = useState<SegmentKey>("arquitetos");
  const seg = segments.find((s) => s.key === active)!;

  return (
    <div className="pt-20">
      {/* ── Hero ─────────────────────────────── */}
      <section className="bg-[#002045] text-white py-24 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.5) 39px, rgba(255,255,255,0.5) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.5) 39px, rgba(255,255,255,0.5) 40px)"
        }} />
        <div className="relative max-w-[1280px] mx-auto px-8 lg:px-16">
          <div className="max-w-3xl mb-16">
            <p className="text-[#a1d494] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-5">
              Programa de Parceiros
            </p>
            <h1 className="font-[var(--font-noto-serif)] text-5xl lg:text-6xl font-normal tracking-[-0.02em] leading-tight mb-6">
              Para cada profissional,
              <br />
              <em className="text-[#86a0cd]">uma proposta única.</em>
            </h1>
            <p className="text-white/65 text-lg font-[var(--font-inter)] leading-relaxed max-w-2xl">
              Arquitetos, marceneiros, engenheiros e revendedores — cada um tem desafios específicos.
              Selecione o seu perfil abaixo e veja o que a Orbital tem para você.
            </p>
          </div>

          {/* Segment preview cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {segments.map(({ key, label, icon, tagline }) => (
              <button
                key={key}
                onClick={() => setActive(key)}
                className={`text-left p-6 border transition-all duration-200 group ${
                  active === key
                    ? "border-white bg-white/10"
                    : "border-white/15 hover:border-white/40 hover:bg-white/5"
                }`}
              >
                <div className={`mb-3 transition-colors duration-200 ${active === key ? "text-[#a1d494]" : "text-white/50 group-hover:text-white/80"}`}>
                  {icon}
                </div>
                <p className="text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] mb-1">
                  {label}
                </p>
                <p className="text-white/50 text-xs font-[var(--font-inter)] leading-relaxed">
                  {tagline}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sticky segment switcher ───────────── */}
      <div className="sticky top-20 z-40 bg-white border-b border-[#e2e2e2] shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">
          <div className="flex gap-0 overflow-x-auto">
            {segments.map(({ key, label, short }) => (
              <button
                key={key}
                onClick={() => setActive(key)}
                className={`flex-shrink-0 px-6 py-5 border-b-2 text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] transition-all duration-200 whitespace-nowrap ${
                  active === key
                    ? "border-[#002045] text-[#002045]"
                    : "border-transparent text-[#74777f] hover:text-[#002045]"
                }`}
              >
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{short}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Dynamic segment content ───────────── */}
      <section key={active} className="overflow-hidden animate-fade-in">
        <div className="flex flex-col lg:flex-row min-h-[620px]">
          {/* Left — dark text column */}
          <div className="lg:w-[52%] bg-[#002045] px-8 lg:px-14 xl:px-20 py-16 lg:py-24 flex flex-col justify-center">
            <div className="max-w-[560px]">
              <span className="inline-block bg-[#3b6934] text-white text-[9px] tracking-[0.18em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 mb-6">
                {seg.badge}
              </span>
              <p className="text-[#86a0cd] text-xs tracking-[0.18em] uppercase font-semibold font-[var(--font-inter)] mb-4">
                {seg.tagline}
              </p>
              <h2 className="font-[var(--font-noto-serif)] text-white text-[32px] lg:text-[40px] font-normal leading-[1.2] mb-6">
                {seg.headline}
              </h2>
              <p className="text-white/60 text-base font-[var(--font-inter)] leading-relaxed mb-10">
                {seg.body}
              </p>
              <ul className="space-y-5 mb-10">
                {seg.benefits.map(({ title, desc }) => (
                  <li key={title} className="flex gap-4">
                    <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-[#a1d494]" />
                    <div>
                      <p className="text-white text-sm font-semibold font-[var(--font-inter)] mb-0.5">
                        {title}
                      </p>
                      <p className="text-white/50 text-xs font-[var(--font-inter)] leading-relaxed">
                        {desc}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              {seg.pricingCallout && (
                <div className="bg-[#0d2d1a] border border-[#3b6934] px-5 py-4 mb-6 flex gap-3 items-start">
                  <svg className="flex-shrink-0 mt-0.5 text-[#a1d494]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" strokeLinejoin="round" />
                  </svg>
                  <p className="text-[#a1d494] text-xs font-[var(--font-inter)] leading-relaxed">
                    {seg.pricingCallout}
                  </p>
                </div>
              )}
              <div className="border-l-2 border-[#3b6934] pl-4 mb-10">
                <p className="text-[#a1d494] text-xs font-[var(--font-inter)] italic leading-relaxed">
                  {seg.highlight}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href={`${WA_BASE}${encodeURIComponent(seg.waText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 bg-white text-[#002045] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-4 hover:bg-[#f3f3f3] transition-colors"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  {seg.ctaLabel}
                </a>
                <a
                  href={CATALOGUE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border border-white/30 text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-4 hover:border-white transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  Baixar Catálogo PDF
                </a>
              </div>
            </div>
          </div>

          {/* Right — image + floating stat */}
          <div className="lg:w-[48%] relative min-h-[400px] lg:min-h-[620px]">
            <Image
              src={seg.image}
              alt={`PFB Orbital — ${seg.label}`}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#001530]/40 to-transparent" />
            {/* Floating stat badge */}
            <div className="absolute bottom-8 right-8 bg-white/96 px-6 py-5 shadow-xl">
              <p className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal leading-none mb-1">
                {seg.stat.value}
              </p>
              <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-semibold font-[var(--font-inter)]">
                {seg.stat.label}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Shared stats ─────────────────────── */}
      <div className="bg-[#1a365d] py-10">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {sharedStats.map(({ value, unit, label }) => (
              <div key={label}>
                <p className="font-[var(--font-noto-serif)] text-white text-3xl font-normal mb-0.5">
                  {value}
                  {unit && (
                    <span className="text-lg text-[#86a0cd] ml-1">{unit}</span>
                  )}
                </p>
                <p className="text-[#86a0cd] text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)]">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Longevity argument ────────────────── */}
      <section className="py-24 bg-[#f9f9f9]">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">
          <ScrollReveal direction="up">
            <div className="mb-12">
              <p className="text-[#74777f] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-3">
                Longevidade
              </p>
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl lg:text-4xl font-normal max-w-2xl">
                O projeto que envelhece bem fala por você.
              </h2>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ScrollReveal direction="up" delay={0}>
              <div className="bg-white border border-[#e2e2e2] p-8 h-full">
                <p className="text-[#74777f] text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] mb-4">
                  MDF em clima amazônico
                </p>
                <p className="font-[var(--font-noto-serif)] text-[#74777f] text-3xl font-normal mb-3 leading-tight">
                  2–3 anos e já mostra desgaste.
                </p>
                <p className="text-[#74777f] text-sm font-[var(--font-inter)] leading-relaxed mb-5">
                  Com umidade acima de 80% o ano todo, o MDF absorve água continuamente. O resultado aparece cedo.
                </p>
                <ul className="space-y-2">
                  {[
                    "Incha, empena e descola das paredes",
                    "Manchas de umidade e mofo visíveis",
                    "Pintura e laminado perdem aderência",
                    "O projeto entregue com esmero parece negligenciado",
                    "O cliente lembra quem especificou o material",
                  ].map((item) => (
                    <li key={item} className="text-[#74777f] text-xs font-[var(--font-inter)] flex gap-2 leading-relaxed">
                      <span className="flex-shrink-0 mt-0.5">—</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={100}>
              <div className="bg-[#002045] p-8 relative overflow-hidden h-full">
                <div className="absolute top-3 right-3 bg-[#3b6934] text-white text-[9px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-2.5 py-1">
                  PFB Orbital
                </div>
                <p className="text-[#86a0cd] text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] mb-4">
                  Aparência preservada por anos
                </p>
                <p className="font-[var(--font-noto-serif)] text-white text-3xl font-normal mb-3 leading-tight">
                  O visual que saiu da obra, anos depois.
                </p>
                <p className="text-white/60 text-sm font-[var(--font-inter)] leading-relaxed mb-5">
                  Impermeável, anti-mofo e resistente a ciclos térmicos extremos. O acabamento não deteriora.
                </p>
                <ul className="space-y-2">
                  {[
                    "Inchamento máximo de 0,2% em 48h de imersão",
                    "Veios do mármore permanecem nítidos",
                    "Textura da madeira intacta ao longo do tempo",
                    "Sem descolar, sem manchar, sem empenar",
                    "O cliente mostra o projeto com orgulho a visitas",
                  ].map((item) => (
                    <li key={item} className="text-white/80 text-xs font-[var(--font-inter)] flex gap-2 leading-relaxed">
                      <span className="text-[#a1d494] flex-shrink-0 mt-0.5">✓</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={200}>
              <div className="bg-white border border-[#e2e2e2] p-8 flex flex-col justify-between h-full">
                <div>
                  <p className="text-[#74777f] text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] mb-4">
                    O impacto na sua reputação
                  </p>
                  <p className="font-[var(--font-noto-serif)] text-[#002045] text-2xl font-normal mb-5 leading-snug">
                    "Um ambiente bem executado é o seu melhor portfólio vivo."
                  </p>
                  <p className="text-[#43474e] text-sm font-[var(--font-inter)] leading-relaxed mb-4">
                    Cada projeto entregue com PFB Orbital continua impecável anos depois — e continua atraindo novos clientes para você.
                  </p>
                  <p className="text-[#43474e] text-sm font-[var(--font-inter)] leading-relaxed mb-8">
                    Especificar o material certo não é só uma escolha técnica. É uma decisão de proteção da sua imagem profissional.
                  </p>
                </div>
                <a
                  href={`${WA_BASE}${encodeURIComponent("Olá! Tenho interesse em conhecer o PFB Orbital para os meus projetos.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 text-center hover:bg-[#1a365d] transition-colors"
                >
                  Quero conhecer o PFB Orbital
                </a>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────── */}
      <section className="py-24 bg-[#1e212a] text-white">
        <div className="max-w-[760px] mx-auto px-8 text-center">
          <ScrollReveal direction="up">
            <p className="text-[#9c9faa] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-5">
              Condições exclusivas para profissionais
            </p>
            <h2 className="font-[var(--font-noto-serif)] text-white text-4xl lg:text-5xl font-normal mb-6">
              Pronto para fazer parte da rede Orbital?
            </h2>
            <p className="text-white/55 text-base font-[var(--font-inter)] leading-relaxed mb-10">
              Tabela diferenciada, amostras gratuitas, suporte técnico e estoque
              pronto em Manaus. Entre em contato e receba sua proposta.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href={`${WA_BASE}${encodeURIComponent("Olá! Sou profissional e quero conhecer as condições de parceria Orbital.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 bg-white text-[#1e212a] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-9 py-4 hover:bg-[#f3f3f3] transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Iniciar parceria
              </a>
              <a
                href={CATALOGUE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-white/25 text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-9 py-4 hover:border-white transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Baixar Catálogo PDF
              </a>
              <Link
                href="/produtos"
                className="border border-white/25 text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-9 py-4 hover:border-white transition-colors"
              >
                Ver catálogo online
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <div className="bg-[#f9f9f9] border-t border-[#eeeeee] py-5 text-center">
        <p className="text-[#74777f] text-xs font-[var(--font-inter)] italic">
          Orbital · Catálogo 2026 · Dados sujeitos a alteração sem aviso prévio.
          Somos fornecedores diretos — não fazemos instalação.
        </p>
      </div>
    </div>
  );
}
