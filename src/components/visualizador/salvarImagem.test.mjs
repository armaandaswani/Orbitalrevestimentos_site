import test from "node:test";
import assert from "node:assert/strict";
import { arquivoDeDataUrl, prepararArquivo } from "./salvarImagem.ts";

// PNG 1×1 transparente.
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

test("data: de PNG vira arquivo PNG com os mesmos bytes, sem rede", () => {
  const f = arquivoDeDataUrl(`data:image/png;base64,${PNG}`);
  assert.ok(f);
  assert.equal(f.type, "image/png");
  assert.equal(f.name, "orbital-visualizacao.png");
  assert.equal(f.size, Buffer.from(PNG, "base64").length);
});

test("JPEG ganha a extensão certa", () => {
  const f = arquivoDeDataUrl(`data:image/jpeg;base64,${PNG}`);
  assert.equal(f?.name, "orbital-visualizacao.jpg");
});

test("o que não é data: de imagem não vira arquivo na hora", () => {
  assert.equal(arquivoDeDataUrl("https://exemplo.com/a.png"), null);
  assert.equal(arquivoDeDataUrl("data:image/png;base64,@@@"), null);
});

test("data: estragado não tenta a rede", async () => {
  assert.equal(await prepararArquivo("data:image/png;base64,@@@"), null);
});
