"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import Link from "next/link";

const WA_NUMBER = "5592988150149";
const WA_BASE = `https://wa.me/${WA_NUMBER}?text=`;

interface Message {
  from: "user" | "bot";
  text: string;
  showWa?: boolean;
  linkCta?: { label: string; href: string };
}

const QUICK_CHIPS = [
  { label: "O que é o PFB?",        prompt: "O que é o PFB Orbital?" },
  { label: "PFB vs outras opções",  prompt: "Como o PFB se compara a MDF, papel de parede e forro PVC?" },
  { label: "Quanto custa?",         prompt: "Quanto custa o PFB Orbital? Quais são as linhas e preços?" },
  { label: "Serve p/ banheiro?",    prompt: "Posso usar o PFB no banheiro ou em áreas úmidas?" },
  { label: "Como instalar?",        prompt: "Como é feita a instalação do PFB?" },
];

const PAGE_LABELS: Record<string, string> = {
  "/simulador":  "Abrir Simulador",
  "/produtos":   "Ver Produtos",
  "/projetos":   "Ver Projetos",
  "/tecnologia": "Ver Tecnologia",
  "/parcerias":  "Programa de Parcerias",
  "/contato":    "Ir para Contato",
};

function shouldShowWa(text: string) {
  return /whatsapp|showroom|visita|orçamento|comprar|agendar|preço específico/i.test(text);
}

function WaIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-[#f3f5f8] px-4 py-3 flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 bg-[#74777f] rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
          />
        ))}
      </div>
    </div>
  );
}

/** Render inline **bold** and *italic* markers within a plain-text segment. */
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) parts.push(text.slice(lastIdx, match.index));
    if (match[1] !== undefined) {
      parts.push(<strong key={match.index} className="font-semibold">{match[1]}</strong>);
    } else if (match[2] !== undefined) {
      parts.push(<em key={match.index} className="italic">{match[2]}</em>);
    }
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

/**
 * Parse a bot response into:
 * - `nodes` — rendered React elements with proper bold/italic/list formatting
 * - `pageLinks` — list of /paths extracted from [PAGE: /path] tags
 */
function parseBotText(raw: string): { nodes: React.ReactNode; pageLinks: string[] } {
  const pageLinks: string[] = [];

  // Extract [PAGE: /path] tags anywhere in the text
  const text = raw.replace(/\[PAGE:\s*(\/[^\]]*)\]/g, (_, path: string) => {
    const p = path.trim();
    if (PAGE_LABELS[p] && !pageLinks.includes(p)) pageLinks.push(p);
    return "";
  }).trim();

  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  const bulletBuffer: React.ReactNode[] = [];
  const numberedBuffer: React.ReactNode[] = [];

  function flushBullets() {
    if (bulletBuffer.length) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="space-y-0.5 my-1">
          {[...bulletBuffer]}
        </ul>
      );
      bulletBuffer.length = 0;
    }
  }
  function flushNumbered() {
    if (numberedBuffer.length) {
      elements.push(
        <ol key={`ol-${elements.length}`} className="space-y-0.5 my-1">
          {[...numberedBuffer]}
        </ol>
      );
      numberedBuffer.length = 0;
    }
  }

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushBullets();
      flushNumbered();
      return;
    }

    // Bullet list: * item or - item
    const bulletMatch = trimmed.match(/^[*\-]\s+(.*)/);
    if (bulletMatch) {
      flushNumbered();
      bulletBuffer.push(
        <li key={i} className="flex gap-1.5 items-start">
          <span className="text-[#3b6934] font-bold flex-shrink-0 mt-0.5 text-[10px]">•</span>
          <span>{renderInline(bulletMatch[1])}</span>
        </li>
      );
      return;
    }

    // Numbered list: 1. item
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      flushBullets();
      numberedBuffer.push(
        <li key={i} className="flex gap-1.5 items-start">
          <span className="text-[#002045] font-semibold flex-shrink-0 min-w-[14px]">{numMatch[1]}.</span>
          <span>{renderInline(numMatch[2])}</span>
        </li>
      );
      return;
    }

    // Plain paragraph
    flushBullets();
    flushNumbered();
    elements.push(
      <p key={i} className={elements.length > 0 ? "mt-1.5" : ""}>
        {renderInline(trimmed)}
      </p>
    );
  });

  flushBullets();
  flushNumbered();

  return { nodes: <>{elements}</>, pageLinks };
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { from: "bot", text: "Olá! Sou o assistente da Orbital. Pode me perguntar qualquer coisa sobre o PFB, instalação, preços ou projetos 👋" },
  ]);
  const [input, setInput] = useState("");
  const [showChips, setShowChips] = useState(true);
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<{ role: string; content: string }[]>([]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, typing]);

  async function sendMessage(text: string) {
    setShowChips(false);
    setInput("");
    setMessages((prev) => [...prev, { from: "user", text }]);
    historyRef.current = [...historyRef.current, { role: "user", content: text }];
    setTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historyRef.current }),
      });
      const json = await res.json();
      const botText: string = json.text || "Não consegui responder agora. Tente pelo WhatsApp!";
      historyRef.current = [...historyRef.current, { role: "assistant", content: botText }];
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: botText, showWa: shouldShowWa(botText) },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: "Ops, ocorreu um erro. Fale direto com nossa equipe no WhatsApp!", showWa: true },
      ]);
    } finally {
      setTyping(false);
    }
  }

  function handleChip(prompt: string, label: string) {
    setShowChips(false);
    sendMessage(label);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && input.trim() && !typing) sendMessage(input.trim());
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
              <p className="text-white text-sm font-bold tracking-[0.15em] font-[var(--font-noto-serif)]">ORBITAL</p>
              <p className="text-[#86a0cd] text-[10px] tracking-[0.12em] uppercase font-[var(--font-inter)] mt-0.5">Assistente IA</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white transition-colors p-1" aria-label="Fechar chat">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
            {messages.map((msg, i) => {
              if (msg.from === "user") {
                return (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[84%] px-4 py-2.5 text-sm font-[var(--font-inter)] leading-relaxed bg-[#002045] text-white">
                      {msg.text}
                    </div>
                  </div>
                );
              }

              const { nodes, pageLinks } = parseBotText(msg.text);

              return (
                <div key={i} className="flex justify-start">
                  <div className="max-w-[84%] px-4 py-2.5 text-sm font-[var(--font-inter)] leading-relaxed bg-[#f3f5f8] text-[#1a1c1c]">

                    {/* Rendered markdown */}
                    <div className="space-y-0.5">{nodes}</div>

                    {/* Page link buttons extracted from [PAGE: /path] */}
                    {pageLinks.length > 0 && (
                      <div className="flex flex-col gap-1.5 mt-3">
                        {pageLinks.map((href) => (
                          <Link
                            key={href}
                            href={href}
                            className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.1em] uppercase font-bold bg-[#002045] text-white px-3 py-2 hover:bg-[#1a365d] transition-colors w-fit"
                          >
                            {PAGE_LABELS[href]}
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Legacy linkCta */}
                    {msg.linkCta && !pageLinks.includes(msg.linkCta.href) && (
                      <Link
                        href={msg.linkCta.href}
                        className="inline-flex items-center gap-1.5 mt-3 text-[10px] tracking-[0.1em] uppercase font-bold bg-[#3b6934] text-white px-3 py-2 hover:bg-[#2d5228] transition-colors w-fit"
                      >
                        {msg.linkCta.label}
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </Link>
                    )}

                    {msg.showWa && (
                      <a
                        href={`${WA_BASE}${encodeURIComponent("Olá! Vim pelo site e gostaria de mais informações sobre o PFB Orbital.")}`}
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
              );
            })}

            {typing && <TypingIndicator />}

            {showChips && !typing && (
              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK_CHIPS.map(({ label, prompt }) => (
                  <button
                    key={label}
                    onClick={() => handleChip(prompt, label)}
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
              disabled={typing}
              className="flex-1 text-sm font-[var(--font-inter)] text-[#1a1c1c] placeholder-[#b0b0b0] border border-[#e2e2e2] px-3 py-2 focus:outline-none focus:border-[#002045] transition-colors disabled:opacity-50"
            />
            <button
              onClick={() => input.trim() && !typing && sendMessage(input.trim())}
              disabled={!input.trim() || typing}
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
