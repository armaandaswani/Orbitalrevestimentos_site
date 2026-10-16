import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";

/**
 * Ponte para o Atendente IA (Mathilda), que roda no servidor próprio (Google Cloud).
 *
 * O navegador fala só com esta rota (sessão de admin); daqui a chamada segue
 * para o servidor do atendente com o token secreto, que nunca chega ao cliente.
 * Env: ATENDENTE_API_URL (ex.: https://34-73-54-63.sslip.io) e ATENDENTE_API_TOKEN.
 */

async function proxy(req: NextRequest, params: Promise<{ path: string[] }>) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const base = process.env.ATENDENTE_API_URL?.replace(/\/$/, "");
  const token = process.env.ATENDENTE_API_TOKEN;
  if (!base || !token) return NextResponse.json({ error: "nao_configurado" }, { status: 503 });

  const { path } = await params;
  const url = `${base}/api/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;
  const hasBody = req.method !== "GET" && req.method !== "DELETE";

  try {
    const res = await fetch(url, {
      method: req.method,
      headers: { Authorization: `Bearer ${token}`, ...(hasBody ? { "Content-Type": "application/json" } : {}) },
      body: hasBody ? await req.text() : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") ?? "application/json", "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "atendente_offline" }, { status: 502 });
  }
}

type Ctx = { params: Promise<{ path: string[] }> };
export const GET = (req: NextRequest, { params }: Ctx) => proxy(req, params);
export const POST = (req: NextRequest, { params }: Ctx) => proxy(req, params);
export const DELETE = (req: NextRequest, { params }: Ctx) => proxy(req, params);
