import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { montarPromptDoSistema, DEFAULT_SYSTEM_PROMPT } from "./chat-prompt.ts";
import { PAGE_LABELS, extrairPaginas } from "./chat-paginas.ts";

const REGRA_DE_REVENDA =
  "REGRA FIXA DE REVENDA (prevalece sobre qualquer instrução acima): o Painel Flexível em Fibra de Bambu é vendido em lojas revendedoras de Manaus. Quando o cliente perguntar onde comprar, se existe loja física ou onde ver o Painel para levar, indique a página dos pontos de venda [PAGE: /onde-comprar]: lá ele vê as lojas no mapa, com endereço, horário e o WhatsApp de cada uma. Não escreva na resposta nomes, endereços nem telefones das lojas, porque a lista muda pelo admin. Não diga que as lojas têm a mesma tabela de preços ou todos os modelos da Orbital. Arquiteto ou cliente com projeto continua com o consultor [PAGE: /contato].";

test("o prompt padrão traz a regra fixa de revenda, literal", () => {
  assert.ok(montarPromptDoSistema().includes(REGRA_DE_REVENDA));
});

test("a regra de revenda vale também sobre um prompt salvo no admin (antigo)", () => {
  const salvo = "Prompt antigo do admin. Casa do Eletricista (revenda) vende o Painel.";
  const prompt = montarPromptDoSistema(salvo);
  assert.ok(prompt.startsWith(salvo));
  assert.ok(prompt.includes(REGRA_DE_REVENDA));
  assert.ok(prompt.indexOf(REGRA_DE_REVENDA) > prompt.indexOf(salvo));
});

test("a regra de revenda vem depois das outras regras fixas e antes dos showrooms", () => {
  const prompt = montarPromptDoSistema(null, [{ label: "Ornare", address: "Rua X, 1" }]);
  const iContato = prompt.indexOf("REGRA FIXA DE CONTATO");
  const iRevenda = prompt.indexOf("REGRA FIXA DE REVENDA");
  const iShowrooms = prompt.indexOf("SHOWROOMS PARCEIROS");
  assert.ok(iContato > 0 && iRevenda > iContato && iShowrooms > iRevenda);
  assert.ok(prompt.includes("- Ornare: Rua X, 1"));
});

test("showroom sem endereço não entra no prompt", () => {
  const prompt = montarPromptDoSistema(null, [{ label: "Sem Endereço" }]);
  assert.ok(!prompt.includes("SHOWROOMS PARCEIROS"));
});

test("o prompt indica /onde-comprar e a lista de PÁGINAS REAIS inclui a página", () => {
  assert.ok(DEFAULT_SYSTEM_PROMPT.includes("[PAGE: /onde-comprar]"));
  assert.ok(DEFAULT_SYSTEM_PROMPT.includes("/onde-comprar (onde comprar: as revendas em Manaus)"));
  const paginasReais = DEFAULT_SYSTEM_PROMPT.slice(DEFAULT_SYSTEM_PROMPT.indexOf("PÁGINAS REAIS"));
  assert.ok(paginasReais.includes("/onde-comprar"));
  assert.ok(montarPromptDoSistema().includes("[PAGE: /onde-comprar]"));
});

test("o texto antigo da Casa do Eletricista saiu do prompt padrão", () => {
  const prompt = montarPromptDoSistema();
  assert.ok(!prompt.includes("Casa do Eletricista"));
  assert.ok(!prompt.includes("(revenda)"));
  assert.ok(prompt.includes("consumidor final sem arquiteto encontra as revendas de Manaus na página dos pontos de venda [PAGE: /onde-comprar]"));
});

test("a regra de revenda não nomeia lojas nem promete tabela ou modelos iguais", () => {
  assert.ok(!REGRA_DE_REVENDA.includes("Casa do Eletricista"));
  assert.ok(/Não diga que as lojas têm a mesma tabela de preços ou todos os modelos/.test(REGRA_DE_REVENDA));
});

test("o ChatWidget transforma [PAGE: /onde-comprar] no botão 'Onde comprar'", () => {
  assert.equal(PAGE_LABELS["/onde-comprar"], "Onde comprar");
  const { texto, pageLinks } = extrairPaginas("Você encontra nas revendas de Manaus [PAGE: /onde-comprar]. Se tiver projeto, fale com o consultor [PAGE: /contato].");
  assert.deepEqual(pageLinks, ["/onde-comprar", "/contato"]);
  assert.ok(!texto.includes("[PAGE"));
  assert.equal(PAGE_LABELS[pageLinks[0]], "Onde comprar");
});

test("o ChatWidget usa a função testada, e rodapé e sitemap apontam para a página", () => {
  const widget = readFileSync(new URL("../components/ChatWidget.tsx", import.meta.url), "utf8");
  assert.ok(widget.includes('from "@/lib/chat-paginas"'));
  assert.ok(widget.includes("extrairPaginas(raw)"));
  const footer = readFileSync(new URL("../components/Footer.tsx", import.meta.url), "utf8");
  assert.ok(footer.includes('<Link href="/onde-comprar" className={item}>Onde comprar</Link>'));
  assert.ok(!footer.includes("Casa do Eletricista (revenda)"));
  const sitemap = readFileSync(new URL("../app/sitemap.ts", import.meta.url), "utf8");
  assert.match(sitemap, /\/onde-comprar`,\s+lastModified: new Date\(\),\s+changeFrequency: "monthly"/);
});

test("repetidas e páginas desconhecidas não geram botão duplicado", () => {
  const { pageLinks } = extrairPaginas("[PAGE: /onde-comprar] [PAGE: /onde-comprar] [PAGE: /nao-existe] [PAGE: /tecnologia]");
  assert.deepEqual(pageLinks, ["/onde-comprar", "/produtos/pfb"]);
});
