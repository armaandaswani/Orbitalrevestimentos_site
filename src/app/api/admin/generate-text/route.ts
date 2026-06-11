import { NextRequest, NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiBase = process.env.FREE_LLM_API_URL;
  const apiKey = process.env.FREE_LLM_API_KEY || "";

  if (!apiBase)
    return NextResponse.json({ error: "FREE_LLM_API_URL não configurada." }, { status: 503 });

  const { systemPrompt, userPrompt, maxTokens } = await req.json();

  if (!userPrompt)
    return NextResponse.json({ error: "userPrompt obrigatório." }, { status: 400 });

  const res = await fetch(`${apiBase}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.FREE_LLM_MODEL || "gemini-2.0-flash-lite",
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        { role: "user", content: userPrompt },
      ],
      max_tokens: maxTokens ?? 400,
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `API error: ${err}` }, { status: 502 });
  }

  const json = await res.json();
  const text: string = json.choices?.[0]?.message?.content?.trim() ?? "";
  return NextResponse.json({ text });
}
