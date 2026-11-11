export const FIELDS = {
  authority: "Órgão emissor", city: "Município", state: "UF", process: "Processo",
  permit: "Alvará", expires: "Validade na placa", type: "Tipo de obra", use: "Uso declarado",
  floors: "Pavimentos", area: "Área construída (m²)", address: "Endereço original",
  neighborhood: "Bairro", development: "Condomínio", block: "Quadra", lot: "Lote",
  author: "Autor do projeto", authorRegistry: "Registro do autor", rrt: "RRT",
  supervisor: "Responsável técnico", supervisorRegistry: "Registro do responsável", art: "ART",
  company: "Empresa declarada",
} as const;
export type Field = keyof typeof FIELDS;
export type Fields = Partial<Record<Field, string>>;
export type Observation = { raw: string; value: string; confidence: number; box?: number[]; method: "tesseract" | "vision"; status: "pending"; observedAt: string };
export type Observations = Partial<Record<Field, Observation>>;
export type Stage = "pending" | "processing" | "review" | "failed" | "saved";
export type Asset = { id: string; batch: string; sha: string; mime: string; created_at: string; updated_at: string; status: Stage; version: number; attempts: number; observations: Observations; project_id: string | null; error: string | null };
export type Project = { id: string; fields: Fields; created_at: string; updated_at: string };
export const MAX_BYTES = 12_000_000;
export const SERVERLESS_MAX_BYTES = 4_000_000;
export const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
export function redact(s: string) {
  return s.replace(/(?<![\p{L}\d])\d{3}[.\s-]?\d{3}[.\s-]?\d{3}[.\s-]?\d{2}(?![\p{L}\d])/gu, "[suprimido]")
    .replace(/\b(?:CPF|CNPJ|RG)\s*[:.\-]?\s*[0-9][0-9.\s/\-]{4,24}/gi, "[suprimido]")
    .replace(/\b[^\s@]+@[^\s@]+\.[^\s@]+/g, "[suprimido]");
}
export function normalize(field: Field, text: string): string {
  const value = redact(text).trim().replace(/\s+/g, " ").slice(0, 300);
  if (!value || value.includes("[suprimido]")) return "";
  if (field === "area") {
    const raw = value.replace(/\s*m\s*[²2\x27’]?\s*$/i, "");
    if (!/^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?$/.test(raw) && !/^\d+\.\d{1,2}$/.test(raw)) return "";
    const n = Number(raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : /^\d{1,3}(?:\.\d{3})+$/.test(raw) ? raw.replace(/\./g, "") : raw);
    return n > 0 && n <= 100_000_000 ? String(n) : "";
  }
  if (field === "floors") return /^\d{1,3}$/.test(value) && +value > 0 ? String(+value) : "";
  if (field === "expires") {
    const pt = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(value);
    const iso = pt ? `${pt[3]}-${pt[2].padStart(2,"0")}-${pt[1].padStart(2,"0")}` : value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
    const time = Date.parse(iso);
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === iso ? iso : "";
  }
  if (field === "permit" || field === "process") {
    return /^(?=.*\d)[A-Za-z0-9./ _-]{2,80}$/.test(value) ? value : "";
  }
  if (field === "state") return /^[A-Za-z]{2}$/.test(value) ? value.toUpperCase() : "";
  return value;
}

const LABELS: Array<[Field, RegExp]> = [
  ["authority", /^(?:orgao(?: emissor)?|autoridade)/], ["city", /^(?:municipio|cidade)/],
  ["state", /^(?:estado|uf)/], ["process", /^processo/], ["permit", /^(?:alvara|licenca)/],
  ["expires", /^(?:validade|vencimento|valido ate)/], ["type", /^tipo(?: de obra)?/],
  ["use", /^(?:uso|classificacao|destinacao)/], ["floors", /^(?:n[°ºo.]?\s*(?:de\s*)?)?pavimentos/],
  ["area", /^area(?: total)?(?: de construcao| construida)?/], ["address", /^(?:endereco|local da obra)/],
  ["neighborhood", /^bairro/], ["development", /^(?:condominio|empreendimento)/],
  ["block", /^quadra/], ["lot", /^lote/], ["author", /^(?:autor(?:a)?(?: do projeto)?|projetista)/],
  ["supervisor", /^(?:responsavel tecnico|resp\.?\s*tecnico)/],
  ["authorRegistry", /^(?:cau|crea|registro) (?:do )?autor/],
  ["supervisorRegistry", /^(?:cau|crea|registro) (?:do )?responsavel/],
  ["rrt", /^rrt/], ["art", /^art/], ["company", /^(?:construtora|incorporadora|empresa)/],
];
export type Line = { text: string; confidence: number; box?: number[] };
export function parseLines(lines: Line[], observedAt = new Date().toISOString(), method: Observation["method"] = "tesseract"): { observations: Observations; ambiguous: boolean } {
  const observations: Observations = {};
  const conflicts = new Set<Field>();
  let role: "author" | "supervisor" | undefined;
  for (const line of lines) {
    const text = redact(line.text).trim();
    if (text.includes("[suprimido]")) { role = undefined; continue; }
    if (/^implurb$/i.test(text)) {
      observations.authority ??= { raw: text, value: "IMPLURB", confidence: line.confidence, box: line.box, method, status: "pending", observedAt };
      continue;
    }
    const separator = text.indexOf(":");
    if (separator < 0) { role = undefined; continue; }
    const label = fold(text.slice(0, separator).trim());
    let field = LABELS.find(([, re]) => re.test(label))?.[0];
    if (/^(?:cau|crea)$/.test(label) && role) field = role === "author" ? "authorRegistry" : "supervisorRegistry";
    if (!field) { role = undefined; continue; }
    if (field === "author" || field === "supervisor") role = field;
    else if (field !== "authorRegistry" && field !== "supervisorRegistry" && field !== "art" && field !== "rrt") role = undefined;
    const raw = text.slice(separator + 1).trim().slice(0, 300);
    const value = normalize(field, raw);
    if (!value || conflicts.has(field)) continue;
    if (observations[field] && observations[field]?.value !== value) { conflicts.add(field); delete observations[field]; continue; }
    observations[field] = { raw, value, confidence: Math.max(0, Math.min(1, line.confidence)), box: line.box, method, status: "pending", observedAt };
  }
  return { observations, ambiguous: conflicts.size > 0 };
}
export function validateFields(input: unknown): Fields {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Campos inválidos.");
  const fields: Fields = {};
  for (const field of Object.keys(FIELDS) as Field[]) {
    const text = (input as Fields)[field];
    if (text === undefined || text === "") continue;
    if (typeof text !== "string" || text.length > 300) throw new Error(`Campo inválido: ${FIELDS[field]}.`);
    const value = normalize(field, text);
    if (!value) throw new Error(`Confira o campo ${FIELDS[field]} e remova identificadores pessoais.`);
    fields[field] = value;
  }
  if (!fields.city || !fields.state || (!fields.permit && !fields.process)) throw new Error("Informe município, UF e pelo menos um número de alvará ou processo.");
  return fields;
}
export function identityKeys(fields: Fields): string[] {
  const scope = [fields.state?.toLowerCase(), fold(fields.city ?? "").replace(/[^a-z0-9]+/g, "")].join(":");
  return (["permit", "process"] as const).flatMap((key) => fields[key] ? [`${scope}:${key}:${fold(fields[key]).replace(/[ ._-]/g, "")}`] : []);
}
export function score(fields: Fields) {
  const factors = [
    { label: "Identificação documental", points: fields.permit && fields.process ? 20 : 12, max: 20 },
    { label: "Localização informada", points: fields.address ? 15 : 0, max: 15 },
    { label: "Uso compatível para avaliar interiores", points: /residencial|comercial|misto/.test(fold(fields.use ?? "")) ? 20 : 0, max: 20 },
    { label: "Profissional identificado na placa", points: fields.author || fields.supervisor ? 15 : 0, max: 15 },
    { label: "Momento da obra, vínculo e canal verificados", points: 0, max: 30 },
  ];
  const points = factors.reduce((sum, f) => sum + f.points, 0);
  return { points, factors, band: points >= 55 ? "Promissora para pesquisa" : points >= 35 ? "Pesquisar mais" : "Dados insuficientes" };
}
export function csv(projects: Project[], columns: Field[]) {
  const escape = (s: string) => `"${s.replace(/^[\s\uFEFF]*[=+\-@\t\r\n]/, m => "'" + m).replaceAll('"', '""')}"`;
  return "\uFEFF" + [columns.map(k => FIELDS[k]), ...projects.map(p => columns.map(k => {
    const v = p.fields[k] ?? "";
    if (k === "area" && v) return Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 4 });
    if (k === "expires" && v) return v.split("-").reverse().join("/");
    return redact(v);
  }))].map(row => row.map(escape).join(";")).join("\r\n");
}

const geometryLabels: Array<[Field, RegExp]> = [
  ["process", /^(?:(?:n[°ºo.]|numero)\s*(?:do\s*)?)?processo\b/],
  ["permit", /^(?:n[°ºo.]|numero)\s*(?:do\s*)?alvara\b/],
  ["floors", /^(?:(?:n[°ºo.]|numero)\s*(?:d[eo]\s*)?)?pavimentos?\b/],
  ["area", /^area\s+d[eo]\s+(?:empreendimento|construcao)\b/],
  ["expires", /^(?:vencimento|validade)\s*(?:do\s*)?alvara\b/],
  ["use", /^uso\b/], ["address", /^endereco\b/],
  ["author", /^autor\s*do\s*projeto\b/], ["supervisor", /^responsavel\s*tecnico\b/],
];
const structuralValue = (field: Field, text: string) => {
  if (field === "floors") return text.replace(/\s+pavimentos?$/i, "");
  if (field === "permit" || field === "process") return /^\d{1,12}\s*\/\s*\d{4}$/.test(text) ? text.replace(/\s/g,"") : "";
  if (field === "use") return /^(?:residencial|comercial|misto|industrial|institucional)\b/i.test(text) ? text : "";
  return text;
};
/** Match isolated labels and their nearby value on the same sign. Positions are normalized in the OCR frame. */
export function parseLayout(input: Line[], observedAt = new Date().toISOString()) {
  const lines = input.filter(l => typeof l.text === "string" && l.box?.length === 4 && l.box.every(Number.isFinite))
    .map(l => ({ ...l, text: l.text.normalize("NFC").trim() }))
    .sort((a,b) => a.box![1]-b.box![1]);
  const tagged = lines.map(line => {
    const normalized = fold(line.text);
    for (const [field,pattern] of geometryLabels) {
      const hit = pattern.exec(normalized);
      if (hit) return { line, field, suffix: line.text.slice(hit[0].length).replace(/^\s*[:=]?\s*/, "") };
    }
    return {line,field:undefined,suffix:""};
  });
  const prepared: Line[] = [];
  const roles: Array<{ field: "author" | "supervisor"; line: Line }> = [];
  const append = (field: Field, text: string, line: Line) => prepared.push({...line,text:`${field}: ${text}`});
  const alias: Record<string,string> = Object.fromEntries(Object.entries({
    authority:"Órgão",city:"Município",state:"UF",process:"Processo",permit:"Alvará",expires:"Validade",
    use:"Uso",floors:"Pavimentos",area:"Área",address:"Endereço",author:"Autor do projeto",
    supervisor:"Responsável técnico",authorRegistry:"Registro do autor",supervisorRegistry:"Registro responsável",art:"ART",rrt:"RRT",
  }));
  const consumed = new Set<Line>();
  for (const {line,field,suffix} of tagged) {
    if (!field) continue;
    let value = structuralValue(field,suffix);
    let source = line;
    if (!normalize(field,value)) {
      if (field === "author" || field === "supervisor") continue; // Never borrow a nearby name.
      const candidates = tagged.filter(item => !item.field && !consumed.has(item.line) && !item.line.text.includes(":"))
        .map(({line: candidate}) => {
          const a=line.box!, b=candidate.box!;
          const dy=b[1]-a[1], dx=Math.abs(b[0]-a[0]);
          return {candidate,dy,dx,value:structuralValue(field,candidate.text)};
        }).filter(c=>c.dy>0 && c.dy<.055 && c.dx<.155 && normalize(field,c.value))
        .sort((a,b)=>(a.dy+a.dx*.45)-(b.dy+b.dx*.45));
      if (!candidates[0]) continue;
      ({candidate:source,value}=candidates[0]);
      consumed.add(source);
    }
    if (field === "author" || field === "supervisor") {
      roles.push({field,line});
      const registry=/\s+(CAU|CREA)\s*:\s*(.+)$/i.exec(value);
      if (registry) {
        append(field==="author"?"authorRegistry":"supervisorRegistry",`${registry[1]} ${registry[2]}`,line);
        value=value.slice(0,registry.index).trim();
      }
    }
    append(field,value,source);
  }
  for (const line of lines) {
    const f=fold(line.text);
    if (/^implurb$/i.test(f)) append("authority","IMPLURB",line);
    if (/^manaus$/i.test(f)) append("city","Manaus",line);
    if (/^(?:crea\s*[/|i]?\s*cau|crea|cau)\s*:/i.test(f)) {
      const role = [...roles].reverse().find(r => {
        const dy=line.box![1]-r.line.box![1];
        return dy>=0 && dy<.04 && Math.abs(line.box![0]-r.line.box![0])<.10;
      });
      const registration = line.text.split(":")[1]?.trim().match(/^[\w./-]+/)?.[0];
      if (role && registration) append(role.field==="author"?"authorRegistry":"supervisorRegistry",registration,line);
    }
    const taggedId = /^(ART|RRT)\s*:\s*([A-Z\d./-]+)\b/i.exec(line.text);
    if (taggedId) append(taggedId[1].toUpperCase()==="ART"?"art":"rrt",taggedId[2],line);
  }
  const a = parseLines(prepared.map(l => {
    const index=l.text.indexOf(":");
    return {...l,text:`${alias[l.text.slice(0,index)] ?? l.text.slice(0,index)}${l.text.slice(index)}`};
  }),observedAt,"vision");
  const b = parseLines(lines,observedAt,"vision");
  const observations = {...b.observations,...a.observations};
  // A broad colon pass must never overwrite role values carrying another label.
  for (const field of ["author","supervisor"] as const)
    if (!a.observations[field] && /\b(?:CAU|CREA)\s*:/i.test(observations[field]?.value ?? "")) delete observations[field];
  return { observations, ambiguous:a.ambiguous || b.ambiguous };
}

export const CHECK_KINDS = { registry: "Registro profissional", affiliation: "Vínculo com a obra", stage: "Estágio confirmado", channel: "Canal comercial publicado" } as const;
export const CHECK_RESULTS = { verified:"Verificado", possible:"Possível, revisar", not_found:"Não encontrado", unavailable:"Fonte indisponível" } as const;
export const ROLES = {author:"Autor do projeto",supervisor:"Responsável técnico",company:"Empresa declarada"} as const;
export type ResearchCheck = {
  id: string;
  kind: keyof typeof CHECK_KINDS;
  result: keyof typeof CHECK_RESULTS;
  role: keyof typeof ROLES;
  url: string;
  corroboration: string | null;
  note: string;
  verifiedAt: string;
};
export type Intel = { project_id: string; version: number; checks: ResearchCheck[]; draft: string | null; approved_at: string | null; suppressed: boolean; updated_at: string };
export function evidenceUrl(raw: unknown): string {
  if (typeof raw !== "string" || raw.length > 600) throw new Error("Informe uma URL pública válida.");
  let url: URL;
  try { url=new URL(raw); } catch { throw new Error("Informe uma URL pública válida."); }
  // Links are presented to the operator; the Radar never fetches them server-side.
  if (url.protocol!=="https:" || url.username || url.password || url.port ||
      !/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(url.hostname) ||
      /\.(?:localhost|local|internal|test|invalid)$/.test(url.hostname) || redact(raw)!==raw) throw new Error("Use uma fonte pública HTTPS sem identificadores pessoais na URL.");
  return url.href;
}
export function parseCheck(input: unknown): Omit<ResearchCheck,"id"|"verifiedAt"> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Evidência inválida.");
  const {kind,result,role,url,corroboration,note} = input as Record<string,unknown>;
  if (typeof kind!=="string" || !Object.hasOwn(CHECK_KINDS,kind) || typeof result!=="string" || !Object.hasOwn(CHECK_RESULTS,result) || typeof role!=="string" || !Object.hasOwn(ROLES,role)) throw new Error("Selecione tipo, papel e resultado.");
  const source=evidenceUrl(url);
  const second=corroboration ? evidenceUrl(corroboration) : null;
  if (result==="verified" && ["registry","affiliation"].includes(kind) && (!second || new URL(source).hostname===new URL(second).hostname))
    throw new Error("Para verificar a identidade ou o vínculo, inclua uma segunda fonte de outro domínio.");
  if (typeof note!=="string" || note.length>350 || redact(note)!==note) throw new Error("Use uma nota curta sem CPF, RG ou contatos pessoais.");
  return {kind:kind as ResearchCheck["kind"],result:result as ResearchCheck["result"],role:role as ResearchCheck["role"],url:source,corroboration:second,note:note.trim()};
}
export function researchBrief(project: Project, intel: Intel) {
  const checks = [...new Map(intel.checks.map(check=>[`${check.kind}:${check.role}`,check])).values()];
  const verified = (kind: ResearchCheck["kind"],role: ResearchCheck["role"]) => checks.some(c=>c.kind===kind && c.role===role && c.result==="verified");
  const bestRole = (Object.keys(ROLES) as ResearchCheck["role"][]).find(role=>project.fields[role] && verified("affiliation",role));
  const publishedChannel=bestRole ? checks.find(c=>c.kind==="channel" && c.role===bestRole && c.result==="verified") : undefined;
  const canDraft=!!bestRole && !intel.suppressed;
  const timingVerified=checks.some(c=>c.kind==="stage" && c.result==="verified");
  const base=score(project.fields);
  const factors=[...base.factors.slice(0,-1),
    {label:"Vínculo com a obra confirmado",points:bestRole?15:0,max:15},
    {label:"Estágio documentado",points:timingVerified?10:0,max:10},
    {label:"Canal comercial publicado",points:publishedChannel?5:0,max:5},
  ];
  const points=factors.reduce((n,f)=>n+f.points,0);
  const audience=bestRole==="author" ? "Posso compartilhar acabamentos e opções de aplicação para paredes, forros e curvas." :
    "Posso compartilhar o catálogo e informações sobre o material e sua aplicação em paredes e tetos internos.";
  const draft = canDraft ? `Olá! Falo pela Orbital Revestimentos, de Manaus. Fornecemos o Painel Flexível em Fibra de Bambu para interiores. ${audience} Se for útil para algum projeto do seu escritório, posso enviar o material para avaliação.` : null;
  return {bestRole,publishedChannel,timingVerified,canDraft,draft,points,factors,
    next:intel.suppressed ? "Contato suprimido. Não iniciar nem retomar prospecção." :
      !bestRole ? "Confirme quem especifica os revestimentos e registre a fonte do vínculo." :
        !publishedChannel ? "Localize um canal comercial publicado e verifique as regras de contato." :
          "Confira a permissão do canal com a equipe antes de qualquer contato manual.",
  };
}
