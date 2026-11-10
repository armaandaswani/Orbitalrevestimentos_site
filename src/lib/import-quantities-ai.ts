type SourceFile = { mime: string; name: string; bytes: Buffer };
type ExtractionOptions = { text: string; file?: SourceFile; system: string };
type Environment = Record<string, string | undefined>;

/** Native PDF/image inputs; test dependencies allow exercising each provider offline. */
export async function extractQuantityDocument(options: ExtractionOptions, dependencies: { fetch?: typeof fetch; env?: Environment } = {}): Promise<string> {
  const env = dependencies.env || process.env, fetcher = dependencies.fetch || fetch;
  const { file, text, system } = options;
  const prompt = text || "Transcreva o quantitativo deste arquivo para revisão.";
  const attempts: Array<(signal: AbortSignal) => Promise<string>> = [];
  const list = (v: string | undefined) => (v || "").split(",").map((s) => s.trim()).filter(Boolean);
  async function post(url: string, headers: Record<string, string>, body: unknown, signal: AbortSignal) {
    const res = await fetcher(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body), signal });
    if (!res.ok) throw new Error("Falha no provedor.");
    return res.json();
  }
  if (env.OPENAI_API_KEY) attempts.push(async (signal) => {
    const content: Record<string, unknown>[] = [{ type: "input_text", text: prompt }];
    if (file) content.push(file.mime === "application/pdf"
      ? { type: "input_file", filename: file.name, file_data: `data:application/pdf;base64,${file.bytes.toString("base64")}` }
      : { type: "input_image", image_url: `data:${file.mime};base64,${file.bytes.toString("base64")}`, detail: "high" });
    const base = (env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
    const data = await post(`${base}/responses`, { Authorization: `Bearer ${env.OPENAI_API_KEY}` }, {
      model: env.OPENAI_QUANTITIES_MODEL || env.OPENAI_VISION_MODEL || "gpt-4.1-mini", store: false, instructions: system,
      input: [{ role: "user", content }], max_output_tokens: 7500, text: { format: { type: "json_object" } },
    }, signal);
    if (data.status === "incomplete") throw new Error("Resposta incompleta.");
    return (data.output || []).flatMap((v: { content?: { type?: string; text?: string }[] }) => v.content || []).filter((v: { type?: string }) => v.type === "output_text").map((v: { text?: string }) => v.text || "").join("");
  });
  if (env.ANTHROPIC_API_KEY) attempts.push(async (signal) => {
    const content: Record<string, unknown>[] = [{ type: "text", text: prompt }];
    if (file) content.unshift({ type: file.mime === "application/pdf" ? "document" : "image", source: { type: "base64", media_type: file.mime, data: file.bytes.toString("base64") } });
    const data = await post("https://api.anthropic.com/v1/messages", { "x-api-key": env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" }, {
      model: env.ANTHROPIC_QUANTITIES_MODEL || "claude-haiku-5-5", max_tokens: 7500, system, messages: [{ role: "user", content }],
    }, signal);
    if (data.stop_reason === "max_tokens") throw new Error("Resposta incompleta.");
    return (data.content || []).filter((v: { type?: string }) => v.type === "text").map((v: { text?: string }) => v.text || "").join("");
  });
  // A FREE_LLM key is only reused for Google's native API when its endpoint is Google.
  const googleKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY || (/^https:\/\/generativelanguage\.googleapis\.com(?:\/|$)/.test(env.FREE_LLM_API_URL || "") ? env.FREE_LLM_API_KEY : undefined);
  if (googleKey) attempts.push(async (signal) => {
    const parts: Record<string, unknown>[] = [{ text: prompt }];
    if (file) parts.unshift({ inlineData: { mimeType: file.mime, data: file.bytes.toString("base64") } });
    const model = env.GEMINI_QUANTITIES_MODEL || "gemini-3.5-flash-lite";
    const data = await post(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { "x-goog-api-key": googleKey }, {
      systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts }], generationConfig: { responseMimeType: "application/json", maxOutputTokens: 7500 },
    }, signal);
    const candidate = data.candidates?.[0];
    if (candidate?.finishReason && candidate.finishReason !== "STOP") throw new Error("Resposta incompleta.");
    return (candidate?.content?.parts || []).map((v: { text?: string }) => v.text || "").join("");
  });
  // OpenAI-compatible configured model lists (including Groq), never a guessed vision model.
  if (env.FREE_LLM_API_URL && (!file || file.mime !== "application/pdf")) {
    const models = list(file ? env.FREE_LLM_VISION_MODEL || env.FREE_LLM_MODEL : env.FREE_LLM_MODEL);
    for (const model of models) attempts.push(async (signal) => {
      const content = file ? [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: `data:${file.mime};base64,${file.bytes.toString("base64")}` } }] : prompt;
      const data = await post(`${env.FREE_LLM_API_URL!.replace(/\/+$/, "")}/chat/completions`, { Authorization: `Bearer ${env.FREE_LLM_API_KEY || ""}` }, {
        model, messages: [{ role: "system", content: system }, { role: "user", content }], response_format: { type: "json_object" }, max_tokens: 7500,
      }, signal);
      if (data.choices?.[0]?.finish_reason === "length") throw new Error("Resposta incompleta.");
      return data.choices?.[0]?.message?.content || "";
    });
  }
  const deadline = Date.now() + 48_000;
  for (const attempt of attempts) {
    const remaining = deadline - Date.now();
    if (remaining < 1000) break;
    try {
      const output = await attempt(AbortSignal.timeout(Math.min(30_000, remaining)));
      // Check shape here so a broken provider can fall back before route validation.
      const parsed = JSON.parse(output.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
      if (Array.isArray(parsed.items)) return JSON.stringify(parsed);
    } catch { /* Try the next configured provider, without logging customer data. */ }
  }
  throw new Error(file?.mime === "application/pdf"
    ? "Análise de PDF indisponível. Envie uma foto das páginas ou cole uma tabela com ambiente, produto e quantidade."
    : "Análise indisponível. Você pode importar um CSV com as colunas ambiente, produto, quantidade e unidade.");
}
