import { test } from "node:test";
import assert from "node:assert/strict";
import { nomeDaTextura } from "./salvarTextura.ts";

test("nome do arquivo sai sem acento, sem espaço e sempre .jpg", () => {
  assert.equal(nomeDaTextura("Orbital_PFB12_Carvalho Ébano_textura"), "Orbital_PFB12_Carvalho-Ebano_textura.jpg");
  assert.equal(nomeDaTextura("techstone-travertino-navona-classico-2400x1200"), "techstone-travertino-navona-classico-2400x1200.jpg");
  assert.equal(nomeDaTextura("foto.png"), "foto.jpg");
  assert.equal(nomeDaTextura("  "), "orbital-textura.jpg");
});
