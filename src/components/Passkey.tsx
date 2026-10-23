"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";

/**
 * Entrar com passkey — Face ID, Touch ID ou digital (API em /api/passkey).
 * Usado no admin e nos portais do parceiro e do representante.
 *
 * - PasskeyLoginButton: na tela de login, entra sem senha.
 * - PasskeyCard: já logado, ativa o Face ID neste aparelho e lista/remove os aparelhos.
 * - PasskeyConvite: logo depois do login com senha, oferece ativar (uma vez por aparelho).
 */

export type PasskeyTipo = "admin" | "partner" | "rep";

// Neste aparelho: qual passkey ele tem (id da credencial) e se a pessoa dispensou o convite.
const chaveCredencial = (tipo: PasskeyTipo) => `orbital_passkey_${tipo}`;
const chaveDispensado = (tipo: PasskeyTipo) => `orbital_passkey_${tipo}_dispensado`;

function ler(k: string): string | null {
  try { return localStorage.getItem(k); } catch { return null; }
}
function gravar(k: string, v: string | null) {
  try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch { /* modo privado */ }
}

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Erro ${res.status}`);
  return data;
}

function mensagem(e: unknown): string | null {
  const err = e as { name?: string; code?: string; message?: string };
  // Pessoa cancelou ou o tempo acabou: não é erro para mostrar em vermelho.
  if (err?.name === "NotAllowedError" || err?.name === "AbortError") return null;
  if (err?.code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED") return "Este aparelho já tem o Face ID ativo.";
  return err?.message || "Não foi possível usar o Face ID agora.";
}

const semAssinatura = () => () => {};

/** Navegador aceita passkey? Falso no servidor (sem diferença na hidratação). */
function useSuporte() {
  return useSyncExternalStore(semAssinatura, browserSupportsWebAuthn, () => false);
}

// Avisa o cartão e o convite da mesma tela que a passkey foi ativada.
const EVENTO = "orbital-passkey-ativada";

async function cadastrar(tipo: PasskeyTipo, origem: "cartao" | "convite") {
  const optionsJSON = await post("/api/passkey/register", { tipo, step: "options" });
  const response = await startRegistration({ optionsJSON });
  await post("/api/passkey/register", { tipo, step: "verify", response });
  gravar(chaveCredencial(tipo), response.id);
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: { tipo, origem } }));
}

/** Id da passkey que este aparelho ativou (ou null). Atualiza quando ativa ou entra. */
function useCredLocal(tipo: PasskeyTipo): string | null {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVENTO, cb);
      window.addEventListener("storage", cb);
      return () => { window.removeEventListener(EVENTO, cb); window.removeEventListener("storage", cb); };
    },
    () => ler(chaveCredencial(tipo)),
    () => null,
  );
}

function useAoAtivar(tipo: PasskeyTipo, fn: (origem: string) => void) {
  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent<{ tipo: PasskeyTipo; origem: string }>).detail;
      if (d?.tipo === tipo) fn(d.origem);
    };
    window.addEventListener(EVENTO, h);
    return () => window.removeEventListener(EVENTO, h);
  });
}

const IconeFace = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
    <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
    <path d="M9 9.5v1M15 9.5v1M12 9.5v3.5h-1M9.5 15.5c1.4 1 3.6 1 5 0" />
  </svg>
);

// ── Login ────────────────────────────────────────────────────────────────────

export function PasskeyLoginButton<T = unknown>({ tipo, onSuccess }: { tipo: PasskeyTipo; onSuccess: (data: T) => void }) {
  const suporte = useSuporte();
  const credLocal = useCredLocal(tipo);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  if (!suporte) return null;

  // Com a passkey deste aparelho, o iPhone vai direto ao Face ID (sem lista de contas).
  // Sem ela, procura qualquer passkey salva (ex.: sincronizada pelo iCloud de outro aparelho).
  async function entrar(credential_id: string | null) {
    setErro("");
    setLoading(true);
    try {
      const optionsJSON = await post("/api/passkey/login", { tipo, step: "options", credential_id });
      const response = await startAuthentication({ optionsJSON });
      const data = await post("/api/passkey/login", { tipo, step: "verify", response });
      gravar(chaveCredencial(tipo), response.id);
      onSuccess(data as T);
    } catch (e) {
      const m = mensagem(e);
      if (m) setErro(m);
      // A passkey deste aparelho foi removida no site: volta para o modo "ativar".
      if (credential_id && m?.includes("não está cadastrada")) gravar(chaveCredencial(tipo), null);
    } finally {
      setLoading(false);
    }
  }

  if (!credLocal) {
    return (
      <div className="mt-5 border border-[#e2e2e2] bg-[#F6F5F2] px-4 py-3 flex items-start gap-3">
        <span className="text-[#0B1F45] mt-0.5"><IconeFace /></span>
        <div className="min-w-0">
          <p className="text-[#0B1F45] text-sm font-semibold">Quer entrar com Face ID?</p>
          <p className="text-[#43474e] text-xs mt-0.5">
            Entre com a senha uma vez neste aparelho e toque em <strong>Ativar</strong>, na faixa azul do topo
            {tipo === "admin" ? " ou no botão “Face ID”." : " ou no cartão “Face ID ou digital”."}
          </p>
          <button type="button" onClick={() => entrar(null)} disabled={loading}
            className="mt-2 text-[#2347A0] text-xs underline underline-offset-2 hover:text-[#0B1F45] disabled:opacity-50">
            {loading ? "Confirmando..." : "Já ativei — entrar com passkey salva"}
          </button>
          {erro && <p className="text-red-600 text-xs mt-1">{erro}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex items-center gap-3 mb-4">
        <span className="h-px flex-1 bg-[#e2e2e2]" />
        <span className="text-[10px] tracking-[0.15em] uppercase font-bold text-[#a0a3a8]">ou</span>
        <span className="h-px flex-1 bg-[#e2e2e2]" />
      </div>
      <button
        type="button"
        onClick={() => entrar(credLocal)}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 border border-[#0B1F45] text-[#0B1F45] text-xs tracking-[0.12em] uppercase font-bold px-6 py-3 hover:bg-[#0B1F45] hover:text-white transition-colors disabled:opacity-50"
      >
        <IconeFace />
        {loading ? "Confirmando..." : "Entrar com Face ID ou digital"}
      </button>
      {erro && <p className="text-red-600 text-sm mt-2">{erro}</p>}
    </div>
  );
}

// ── Gerenciar (já logado) ────────────────────────────────────────────────────

interface PasskeyRow { id: string; credential_id: string; device_name: string | null; created_at: string; last_used_at: string | null }

const fmtData = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : null);

export function PasskeyCard({ tipo }: { tipo: PasskeyTipo }) {
  const suporte = useSuporte();
  const [lista, setLista] = useState<PasskeyRow[] | null>(null);
  const [disponivel, setDisponivel] = useState(true);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const [credAqui, setCredAqui] = useState<string | null>(null);

  const [versao, setVersao] = useState(0);
  const carregar = () => setVersao((v) => v + 1);
  useAoAtivar(tipo, () => carregar());

  useEffect(() => {
    fetch(`/api/passkey?tipo=${tipo}`)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) return;
        setDisponivel(data?.disponivel !== false);
        const rows = (data?.passkeys ?? []) as PasskeyRow[];
        setLista(rows);
        // A passkey deste aparelho foi removida (aqui ou em outro aparelho): esquece.
        const local = ler(chaveCredencial(tipo));
        const existe = !!local && rows.some((r) => r.credential_id === local);
        if (local && !existe) gravar(chaveCredencial(tipo), null);
        setCredAqui(existe ? local : null);
      })
      .catch(() => { /* sem rede: tenta na próxima */ });
  }, [tipo, versao]);

  async function ativar() {
    setErro(""); setOk(""); setLoading(true);
    try {
      await cadastrar(tipo, "cartao");
      setOk("Pronto! Da próxima vez, toque em “Entrar com Face ID ou digital”.");
    } catch (e) {
      const m = mensagem(e);
      if (m) setErro(m);
    } finally {
      setLoading(false);
    }
  }

  async function remover(id: string) {
    if (!window.confirm("Remover o Face ID deste aparelho? Para entrar nele, vai precisar da senha.")) return;
    setErro(""); setOk("");
    try {
      const res = await fetch("/api/passkey", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipo, id }) });
      if (!res.ok) throw new Error();
      carregar();
    } catch {
      setErro("Não foi possível remover agora.");
    }
  }

  if (!disponivel) return null;

  return (
    <div className="bg-white border border-[#e2e2e2] px-5 py-5 sm:px-6">
      <div className="flex items-start gap-3">
        <span className="text-[#0B1F45] mt-0.5"><IconeFace /></span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f]">Face ID ou digital</p>
          <p className="text-[#43474e] text-sm mt-1">Entre sem digitar a senha. A biometria fica no seu aparelho; a Orbital não recebe nem guarda seu rosto ou digital.</p>
        </div>
      </div>

      {lista && lista.length > 0 && (
        <ul className="mt-4 divide-y divide-[#f0f0f0] border border-[#f0f0f0]">
          {lista.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-[#0B1F45] text-sm font-semibold">
                  {p.device_name || "Aparelho"}
                  {p.credential_id === credAqui && <span className="ml-2 text-[10px] uppercase tracking-wide font-bold text-green-700">Este aparelho</span>}
                </p>
                <p className="text-[#74777f] text-[11px]">
                  Ativado em {fmtData(p.created_at)}{p.last_used_at ? ` · último uso ${fmtData(p.last_used_at)}` : ""}
                </p>
              </div>
              <button type="button" onClick={() => remover(p.id)}
                className="text-[10px] uppercase tracking-wide font-bold text-[#cc0000] px-2 py-1 border border-[#f0d0d0] hover:bg-[#cc0000] hover:text-white transition-colors flex-shrink-0">
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}

      {credAqui ? (
        <p className="mt-4 text-green-700 text-sm font-semibold">✓ Ativo neste aparelho</p>
      ) : suporte ? (
        <button type="button" onClick={ativar} disabled={loading}
          className="mt-4 w-full sm:w-auto bg-[#0B1F45] text-white text-xs tracking-[0.12em] uppercase font-bold px-5 py-2.5 hover:bg-[#2347A0] transition-colors disabled:opacity-50">
          {loading ? "Confirmando..." : "Ativar neste aparelho"}
        </button>
      ) : (
        <p className="mt-4 text-[#74777f] text-xs">Este navegador não aceita passkeys. Abra pelo Safari ou Chrome atualizado.</p>
      )}
      {ok && <p className="text-green-700 text-sm mt-2">{ok}</p>}
      {erro && <p className="text-red-600 text-sm mt-2">{erro}</p>}
    </div>
  );
}

// ── Convite depois do login com senha ────────────────────────────────────────

export function PasskeyConvite({ tipo }: { tipo: PasskeyTipo }) {
  const [mostrar, setMostrar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [feito, setFeito] = useState(false);
  useAoAtivar(tipo, (origem) => { if (origem !== "convite") setMostrar(false); });

  useEffect(() => {
    if (!browserSupportsWebAuthn() || ler(chaveCredencial(tipo)) || ler(chaveDispensado(tipo))) return;
    // Só oferece em aparelho com Face ID / Touch ID / digital embutido, e com a
    // migração 070 já rodada no banco.
    platformAuthenticatorIsAvailable()
      .then(async (tem) => {
        if (!tem) return;
        const res = await fetch(`/api/passkey?tipo=${tipo}`);
        const data = await res.json().catch(() => null);
        if (res.ok && data?.disponivel !== false) setMostrar(true);
      })
      .catch(() => {});
  }, [tipo]);

  if (!mostrar) return null;

  async function ativar() {
    setErro(""); setLoading(true);
    try {
      await cadastrar(tipo, "convite");
      setFeito(true);
      setTimeout(() => setMostrar(false), 3500);
    } catch (e) {
      const m = mensagem(e);
      if (m === "Este aparelho já tem o Face ID ativo.") { gravar(chaveDispensado(tipo), "1"); setMostrar(false); return; }
      if (m) setErro(m);
    } finally {
      setLoading(false);
    }
  }

  function dispensar() {
    gravar(chaveDispensado(tipo), "1");
    setMostrar(false);
  }

  return (
    <div className="bg-[#eef2fb] border-b border-[#d5def3] px-4 sm:px-8 py-3">
      <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-[#0B1F45]"><IconeFace /></span>
        <p className="flex-1 min-w-[200px] text-[#0B1F45] text-sm">
          {feito ? "Face ID ativado. Da próxima vez, entre sem senha." : "Entre mais rápido da próxima vez: ative o Face ID (ou a digital) neste aparelho."}
        </p>
        {!feito && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={ativar} disabled={loading}
              className="bg-[#0B1F45] text-white text-[11px] tracking-[0.1em] uppercase font-bold px-4 py-2 hover:bg-[#2347A0] transition-colors disabled:opacity-50">
              {loading ? "Confirmando..." : "Ativar"}
            </button>
            <button type="button" onClick={dispensar}
              className="text-[#74777f] text-[11px] tracking-[0.1em] uppercase font-bold px-3 py-2 hover:text-[#0B1F45]">
              Agora não
            </button>
          </div>
        )}
        {erro && <p className="basis-full text-red-600 text-xs">{erro}</p>}
      </div>
    </div>
  );
}
