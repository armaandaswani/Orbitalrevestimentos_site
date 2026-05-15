"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import Link from "next/link";

const WA_BASE = "https://wa.me/5592988150149?text=";

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w\s]/g, " ");
}

interface Message {
  from: "user" | "bot";
  text: string;
  waMsg?: string;
  linkCta?: { label: string; href: string };
}

interface FAQ {
  id: string;
  keywords: string[];
  answer: string;
  waMsg?: string;
  linkCta?: { label: string; href: string };
}

const FAQS: FAQ[] = [
  {
    id: "pfb",
    keywords: ["pfb", "placa", "bambu", "o que e", "material", "produto", "painel", "flexivel", "revestimento", "o que sao"],
    answer: "O PFB é uma placa de revestimento feita de fibra de bambu com acabamento fotorrealista e textura premium — com acabamento de Mármore Fosco, Mármore Polido ou Madeira. Instala direto na sua parede atual, sem quebrar nada, em poucas horas. Eco-premium e feito pra durar.",
  },
  {
    id: "mdf",
    keywords: ["mdf", "melhor que mdf", "diferenca mdf", "vantagem mdf", "comparar mdf"],
    answer: "MDF no clima de Manaus dura 2 a 3 anos — a umidade faz ele inchar, empenar e deteriorar. O PFB absorve só 0,2% de umidade (contra 35% do MDF), é anti-mofo, anti-cupim e não propaga chamas. Uma instalação dura 10+ anos.",
  },
  {
    id: "papel",
    keywords: ["papel de parede", "papel", "vinil", "adesivo"],
    answer: "Papel de parede em Manaus é praticamente descartável — com a umidade, bolha, descasca e mofa por baixo. O PFB é uma placa sólida de 5mm, impermeável e lavável. Não tem comparação.",
  },
  {
    id: "vsoutras",
    keywords: ["vs", "versus", "comparar", "comparacao", "alternativas", "opcoes de mercado", "outras opcoes", "concorrente", "vale a pena", "compensa", "melhor opcao", "outras alternativas"],
    answer: "O PFB se destaca em todas as comparações:\n• vs MDF — dura 10+ anos contra 2–3 anos do MDF no clima úmido de Manaus\n• vs Papel de parede — impermeável, lavável e permanente. Papel bolha e mofa.\n• vs Forro PVC — estética arquitetônica, aprovado com ART para teto\n• vs Tinta — acabamento fotorrealista de pedra ou madeira, sem retoque periódico",
    linkCta: { label: "Ver comparativo técnico completo", href: "/tecnologia" },
  },
  {
    id: "banheiro",
    keywords: ["banheiro", "lavabo", "box", "ducha", "umidade", "agua", "molhado", "umido", "impermeavel", "areas umidas", "cozinha", "area molhada"],
    answer: "Pode sim! O PFB foi aprovado via laudo técnico para uso em banheiro, lavabo, box, ducha e cozinha. Ele é um material resistente à água e umidade, e é anti-mofo por natureza, sem nenhum tratamento extra.",
  },
  {
    id: "teto",
    keywords: ["teto", "forro", "forro pvc", "tecto", "telhado"],
    answer: "Com certeza. A placa pesa só 3,5 kg/m², então vai sem problema no teto. Temos ART de Engenheiro Civil (CREA) para aplicação em forro. Fica muito mais bonito que forro PVC.",
  },
  {
    id: "instalacao",
    keywords: ["instalar", "instalacao", "como instala", "tempo", "obra", "cola", "colocacao", "aplicacao", "horas", "rapido"],
    answer: "Super prático e rápido! Instalado com Cola PU na parede ou cola de contato no teto. Sem quebradeira, sem poeira, sem barulho de obra. Um cômodo padrão fica pronto em 2 a 3 horas — dá pra instalar com a casa habitada.",
  },
  {
    id: "preco",
    keywords: ["preco", "valor", "quanto custa", "custo", "reais", "investimento", "orcamento", "simulador"],
    answer: "Temos 3 linhas:\n• Classic (Mármore Fosco) — R$ 559/placa\n• Brilliance (Mármore Polido) — R$ 589/placa\n• Elegance (Madeira Texturizada) — R$ 649/placa\n\nCada placa mede 1,2m × 2,9m × 5mm (3,48 m²). Use o simulador para calcular quantas placas você precisa e o custo total.",
    linkCta: { label: "Usar o Simulador", href: "/contato#simulador" },
  },
  {
    id: "entrega",
    keywords: ["entrega", "prazo", "estoque", "pronta entrega", "quando", "receber", "disponivel"],
    answer: "Todos os 15 acabamentos em estoque aqui em Manaus. Sem esperar frete de fora — você pode ter o material ainda essa semana.",
    waMsg: "Olá! Gostaria de saber sobre disponibilidade e prazo de entrega.",
  },
  {
    id: "instaladores",
    keywords: ["voces instalam", "faz instalacao", "fazem instalacao", "voces fazem", "instalador", "mao de obra", "quem instala", "servico de instalacao", "fazem a instalacao"],
    answer: "A Orbital fornece o material — não fazemos instalação. Mas podemos lhe colocar em contato com profissionais instaladores que já fizeram obras para clientes. É só pedir pelo WhatsApp.",
    waMsg: "Olá! Gostaria de indicação de instaladores parceiros para o PFB Orbital.",
  },
  {
    id: "certificacao",
    keywords: ["certificacao", "art", "crea", "laudo", "aprovacao", "homologado", "tecnico", "engenheiro", "documento", "ficha tecnica"],
    answer: "Sim, temos ART nº AM20260593657 assinada pelo Eng. Civil Werksson Sousa (CREA 042030134-8-D). Ficha técnica completa disponível — só pedir pelo WhatsApp.",
    waMsg: "Olá! Gostaria de receber a ficha técnica completa do PFB Orbital (ART/CREA).",
  },
  {
    id: "parceria",
    keywords: ["arquiteto", "designer", "engenheiro", "parceria", "parceiro", "especificar", "projeto", "amostra", "marceneiro", "revendedor", "profissional"],
    answer: "Temos condições exclusivas para parceria com arquitetos, designers, engenheiros, marceneiros e revendedores. Disponibilizamos amostras grátis, temos fichas técnicas com ART e suporte técnico para especificação. Quer saber mais?",
    waMsg: "Olá! Sou profissional e gostaria de saber sobre o programa de parcerias Orbital.",
  },
  {
    id: "dimensoes",
    keywords: ["tamanho", "dimensao", "medida", "comprimento", "largura", "espessura", "peso", "5mm", "metros"],
    answer: "Cada placa tem 1,2m × 2,9m × 5mm — isso é 3,48 m² por placa. Pesa só 3,5 kg/m². O grande formato significa menos emendas e um acabamento muito mais limpo.",
  },
  {
    id: "showroom",
    keywords: ["showroom", "loja", "visitar", "visita", "onde fica", "localizacao", "manaus", "comprar", "onde comprar", "ver pessoalmente", "endereco"],
    answer: "Trabalhamos via showroom em Manaus. Vale muito a visita — ver os acabamentos ao vivo é completamente diferente de foto. Agende pelo WhatsApp para um atendimento personalizado e especializado.",
    waMsg: "Olá! Gostaria de agendar uma visita ao showroom da Orbital.",
  },
  {
    id: "linhas",
    keywords: ["linha", "classic", "brilliance", "elegance", "acabamento", "modelo", "cor", "opcoes", "colecao", "catalogo"],
    answer: "São 3 linhas, 15 acabamentos no total:\n• Classic — 3 mármores foscos\n• Brilliance — 8 mármores polidos\n• Elegance — 4 madeiras texturizadas",
    linkCta: { label: "Ver catálogo completo", href: "/produtos" },
  },
];

const QUICK_CHIPS = [
  { label: "O que é o PFB?",      id: "pfb"      },
  { label: "PFB vs outras opções", id: "vsoutras" },
  { label: "Quanto custa?",        id: "preco"    },
  { label: "Serve p/ banheiro?",   id: "banheiro" },
  { label: "Como instalar?",       id: "instalacao" },
];

function findAnswer(input: string): FAQ | null {
  const norm = normalize(input);
  const words = norm.split(/\s+/).filter((w) => w.length > 2);

  let best: FAQ | null = null;
  let bestScore = 0;

  for (const faq of FAQS) {
    let score = 0;
    for (const kw of faq.keywords) {
      if (norm.includes(kw)) {
        score += kw.split(" ").length + 1;
      } else {
        for (const w of words) {
          if (kw === w) score += 1;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = faq;
    }
  }

  return bestScore >= 2 ? best : null;
}

function WaIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { from: "bot", text: "Olá! Como posso ajudar com o PFB Orbital?" },
  ]);
  const [input, setInput] = useState("");
  const [showChips, setShowChips] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  function sendMessage(text: string) {
    setShowChips(false);
    const faq = findAnswer(text);
    const botMsg: Message = faq
      ? { from: "bot", text: faq.answer, waMsg: faq.waMsg, linkCta: faq.linkCta }
      : {
          from: "bot",
          text: "Não encontrei uma resposta específica para isso. Nossa equipe pode te ajudar pelo WhatsApp.",
          waMsg: `Olá! Tenho uma dúvida: ${text}`,
        };
    setMessages((prev) => [...prev, { from: "user", text }, botMsg]);
    setInput("");
  }

  function handleChip(id: string, label: string) {
    setShowChips(false);
    const faq = FAQS.find((f) => f.id === id);
    if (!faq) return;
    setMessages((prev) => [
      ...prev,
      { from: "user", text: label },
      { from: "bot", text: faq.answer, waMsg: faq.waMsg, linkCta: faq.linkCta },
    ]);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && input.trim()) sendMessage(input.trim());
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

      {open && (
        <div
          className="w-[340px] sm:w-[380px] bg-white border border-[#e2e2e2] shadow-2xl flex flex-col overflow-hidden"
          style={{ maxHeight: "520px" }}
        >
          {/* Header */}
          <div className="bg-[#002045] px-5 py-4 flex items-center justify-between flex-shrink-0">
            <div>
              <p className="text-white text-sm font-bold tracking-[0.15em] font-[var(--font-noto-serif)]">
                ORBITAL
              </p>
              <p className="text-[#86a0cd] text-[10px] tracking-[0.12em] uppercase font-[var(--font-inter)] mt-0.5">
                Assistente
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/50 hover:text-white transition-colors p-1"
              aria-label="Fechar chat"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[84%] px-4 py-2.5 text-sm font-[var(--font-inter)] leading-relaxed whitespace-pre-line ${
                    msg.from === "user"
                      ? "bg-[#002045] text-white"
                      : "bg-[#f3f5f8] text-[#1a1c1c]"
                  }`}
                >
                  {msg.text}

                  {/* Internal link CTA */}
                  {msg.linkCta && (
                    <Link
                      href={msg.linkCta.href}
                      className="flex items-center gap-1.5 mt-3 text-[10px] tracking-[0.1em] uppercase font-bold bg-[#3b6934] text-white px-3 py-2 hover:bg-[#2d5228] transition-colors w-fit"
                    >
                      {msg.linkCta.label}
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )}

                  {/* WhatsApp CTA */}
                  {msg.waMsg && !msg.linkCta && (
                    <a
                      href={`${WA_BASE}${encodeURIComponent(msg.waMsg)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 mt-3 text-[10px] tracking-[0.1em] uppercase font-bold bg-[#3b6934] text-white px-3 py-2 hover:bg-[#2d5228] transition-colors w-fit"
                    >
                      <WaIcon />
                      Falar no WhatsApp
                    </a>
                  )}
                </div>
              </div>
            ))}

            {/* Quick reply chips */}
            {showChips && (
              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK_CHIPS.map(({ label, id }) => (
                  <button
                    key={id}
                    onClick={() => handleChip(id, label)}
                    className="text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] border border-[#3b6934] text-[#3b6934] px-3 py-1.5 hover:bg-[#3b6934] hover:text-white transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="border-t border-[#e2e2e2] px-4 py-3 flex gap-2 flex-shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua pergunta..."
              className="flex-1 text-sm font-[var(--font-inter)] text-[#1a1c1c] placeholder-[#b0b0b0] border border-[#e2e2e2] px-3 py-2 focus:outline-none focus:border-[#002045] transition-colors"
            />
            <button
              onClick={() => input.trim() && sendMessage(input.trim())}
              disabled={!input.trim()}
              className="w-10 h-10 bg-[#002045] text-white flex items-center justify-center hover:bg-[#1a365d] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
              aria-label="Enviar"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-14 h-14 bg-[#3b6934] text-white flex items-center justify-center shadow-lg hover:bg-[#2d5228] transition-colors"
        aria-label={open ? "Fechar chat" : "Abrir chat"}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}
