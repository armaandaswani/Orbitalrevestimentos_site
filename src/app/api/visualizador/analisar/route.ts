import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

/**
 * POST /api/visualizador/analisar — a IA olha a foto + a marcação aproximada do
 * cliente e escreve, para cada área, QUAL superfície revestir ("toda a parede
 * branca da esquerda, do rodapé ao teto") e o que precisa continuar igual
 * ("os três quadros, a mesa de sinuca"). O cliente revisa esse texto antes de
 * escolher o modelo; é ele que guia o render (sem máscara).
 *
 * Body: { photo: dataURL, zones: [{ id, label, color, rect?: {x,y,w,h} (0..1), point?: boolean, text?: string }] }
 * Resposta: { areas: [{ id, descricao }], manter }
 */

export const maxDuration = 60;

const BASE = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const MODELS = [process.env.OPENAI_VISION_MODEL?.trim(), "gpt-4.1-mini", "gpt-4o-mini"].filter(
  (m, i, a): m is string => !!m && a.indexOf(m) === i
);

type ZoneIn = { id?: unknown; label?: unknown; color?: unknown; rect?: { x?: unknown; y?: unknown; w?: unknown; h?: unknown } | null; point?: unknown; text?: unknown };

const SYSTEM = `Você ajuda clientes da Orbital Revestimentos a visualizar o Painel Flexível Fibra de Bambu aplicado em fotos dos seus ambientes.
O cliente marcou na foto, de forma APROXIMADA, onde quer aplicar o painel: cada área aparece como um contorno colorido numerado (ou um alvo numerado, quando ele só tocou num ponto).
A marcação é só uma indicação: descubra a SUPERFÍCIE REAL que ele quer revestir — normalmente a parede, o teto ou o móvel inteiro onde está a marcação, mesmo que o contorno pegue só parte dela ou passe por cima de quadros e objetos.

Responda SOMENTE em JSON: {"areas":[{"id":"...","descricao":"..."}],"manter":"..."}
- descricao: uma frase curta em português do Brasil que identifique a superfície sem ambiguidade para quem olha a foto: qual parede/teto/móvel, a cor ou material atual, a posição (esquerda, fundo, atrás do sofá…) e os limites (do rodapé até o teto, até a coluna preta…). Não cite produto, cor nova nem acabamento. Ex.: "toda a parede branca da esquerda, atrás da mesa de sinuca, do rodapé até o teto".
- manter: lista curta, em português, do que precisa continuar igual — principalmente o que está pendurado ou na frente das superfícies (quadros, TV, prateleiras, luminárias, móveis). Ex.: "os três quadros pendurados, a mesa de sinuca, o pendente e a estante iluminada".
Se uma área já vier com texto do cliente, use-o como a intenção dele e só deixe a descrição mais precisa.`;

const num01 = (v: unknown) => (typeof v === "number" && isFinite(v) ? Math.min(1, Math.max(0, v)) : null);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

export async function POST(req: NextRequest) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: "Análise indisponível." }, { status: 503 });

  const body = (await req.json().catch(() => null)) as { photo?: unknown; zones?: unknown } | null;
  const m = typeof body?.photo === "string" ? body.photo.match(/^data:[^;]+;base64,([\s\S]+)$/) : null;
  if (!m) return NextResponse.json({ error: "Foto obrigatória." }, { status: 400 });
  const zones = (Array.isArray(body?.zones) ? (body!.zones as ZoneIn[]) : []).slice(0, 6).map((z, i) => ({
    id: str(z.id, 40) || `z${i + 1}`,
    n: i + 1,
    color: /^#[0-9a-f]{6}$/i.test(str(z.color, 7)) ? str(z.color, 7) : "#3b6934",
    rect: z.rect ? { x: num01(z.rect.x), y: num01(z.rect.y), w: num01(z.rect.w), h: num01(z.rect.h) } : null,
    point: z.point === true,
    text: str(z.text, 300),
  }));
  if (zones.length === 0) return NextResponse.json({ error: "Marque uma área." }, { status: 400 });

  // Foto reduzida (rápido) com as marcações desenhadas por cima.
  let annotated: string;
  try {
    const img = sharp(Buffer.from(m[1], "base64")).rotate().resize(1024, 1024, { fit: "inside", withoutEnlargement: true });
    const { data, info } = await img.jpeg({ quality: 82 }).toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height;
    const stroke = Math.max(3, Math.round(Math.min(W, H) / 160));
    const font = Math.max(16, Math.round(Math.min(W, H) / 22));
    const shapes = zones
      .filter((z) => z.rect && z.rect.x !== null && z.rect.y !== null && z.rect.w !== null && z.rect.h !== null)
      .map((z) => {
        const r = z.rect as { x: number; y: number; w: number; h: number };
        const x = r.x * W, y = r.y * H, w = r.w * W, h = r.h * H;
        const label = `<rect x="${x + 4}" y="${y + 4}" width="${font * 1.4}" height="${font * 1.3}" fill="${z.color}"/><text x="${x + 4 + font * 0.7}" y="${y + 4 + font}" font-size="${font}" font-family="Arial, sans-serif" font-weight="bold" fill="#fff" text-anchor="middle">${z.n}</text>`;
        if (z.point) {
          const cx = x + w / 2, cy = y + h / 2, rr = Math.max(font, Math.min(w, h) / 2);
          return `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="${z.color}" stroke-width="${stroke}"/><circle cx="${cx}" cy="${cy}" r="${stroke * 1.5}" fill="${z.color}"/><text x="${cx + rr + font < W ? cx + rr + 4 : cx - rr - 4}" text-anchor="${cx + rr + font < W ? "start" : "end"}" y="${cy}" font-size="${font}" font-family="Arial, sans-serif" font-weight="bold" fill="${z.color}" stroke="#fff" stroke-width="2" paint-order="stroke">${z.n}</text>`;
        }
        return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${z.color}" stroke-width="${stroke}" stroke-dasharray="${stroke * 4} ${stroke * 2}"/>${label}`;
      })
      .join("");
    const out = shapes
      ? await sharp(data).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${shapes}</svg>`) }]).jpeg({ quality: 82 }).toBuffer()
      : data;
    annotated = `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    return NextResponse.json({ error: "Foto inválida." }, { status: 400 });
  }

  const userText = [
    "Áreas marcadas pelo cliente:",
    ...zones.map((z) =>
      `- Área ${z.n} (id "${z.id}")${z.rect ? (z.point ? ": alvo (o cliente tocou neste ponto)" : ": contorno tracejado") : ": sem marcação na foto"}${z.text ? ` — o cliente escreveu: "${z.text}"` : ""}`
    ),
  ].join("\n");

  let lastErr = "";
  for (const model of MODELS) {
    try {
      const res = await fetch(`${BASE}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          response_format: { type: "json_object" },
          max_completion_tokens: 700,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: [{ type: "text", text: userText }, { type: "image_url", image_url: { url: annotated, detail: "high" } }] },
          ],
        }),
      });
      const text = await res.text();
      if (!res.ok) {
        lastErr = `${res.status} ${text.slice(0, 300)}`;
        console.error(`[analisar] ${model}:`, lastErr);
        if (res.status === 404 || /model/i.test(text)) continue; // modelo indisponível → próximo
        break;
      }
      const content = JSON.parse(text)?.choices?.[0]?.message?.content ?? "";
      const parsed = JSON.parse(content) as { areas?: Array<{ id?: unknown; descricao?: unknown }>; manter?: unknown };
      const byId = new Map((parsed.areas ?? []).map((a) => [str(a.id, 40), str(a.descricao, 300)]));
      return NextResponse.json({
        areas: zones.map((z, i) => ({ id: z.id, descricao: byId.get(z.id) || str(parsed.areas?.[i]?.descricao, 300) || "" })),
        manter: str(parsed.manter, 300),
        model,
      });
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      console.error(`[analisar] ${model}:`, lastErr);
    }
  }
  return NextResponse.json({ error: "Não consegui analisar a foto agora. Descreva a área no campo de texto." }, { status: 502 });
}
