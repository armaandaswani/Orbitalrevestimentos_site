import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";

// Live currency quotes for the import calculator: BRL per 1 USD and per 1 CNY
// (RMB), plus the CNY→USD cross. Source: AwesomeAPI (economia.awesomeapi.com.br)
// — Brazilian, free, no key. Cached ~10 min in module memory so the tab can
// poll cheaply. On any failure the UI falls back to manually-typed rates.

export const dynamic = "force-dynamic";

interface FxPayload {
  usd_brl: number | null;
  cny_brl: number | null;
  cny_usd: number | null;
  updated_at: string | null;
  source: string;
  stale: boolean;
}

let cache: { data: FxPayload; at: number } | null = null;
const TTL_MS = 10 * 60 * 1000;

async function fetchRates(): Promise<FxPayload> {
  const res = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL,CNY-BRL", {
    // Next fetch cache off — we do our own in-memory TTL.
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`fx ${res.status}`);
  const j = (await res.json()) as Record<string, { bid?: string; create_date?: string }>;
  const usd = j?.USDBRL?.bid ? Number(j.USDBRL.bid) : null;
  const cny = j?.CNYBRL?.bid ? Number(j.CNYBRL.bid) : null;
  return {
    usd_brl: usd && usd > 0 ? usd : null,
    cny_brl: cny && cny > 0 ? cny : null,
    cny_usd: usd && cny && usd > 0 ? cny / usd : null,
    updated_at: j?.USDBRL?.create_date ?? new Date().toISOString(),
    source: "AwesomeAPI",
    stale: false,
  };
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (cache && Date.now() - cache.at < TTL_MS) {
    return NextResponse.json(cache.data);
  }
  try {
    const data = await fetchRates();
    cache = { data, at: Date.now() };
    return NextResponse.json(data);
  } catch {
    // Serve a stale cache if we have one; otherwise nulls (UI prompts for
    // manual rates). Never fail the whole tab over an FX hiccup.
    if (cache) return NextResponse.json({ ...cache.data, stale: true });
    return NextResponse.json({ usd_brl: null, cny_brl: null, cny_usd: null, updated_at: null, source: "indisponível", stale: true });
  }
}
