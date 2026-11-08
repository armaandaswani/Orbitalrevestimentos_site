import test from "node:test";
import assert from "node:assert/strict";
import { separarLugares } from "./pfb-lugares.ts";

function lugar(nome, kind) {
  return {
    id: nome,
    slug: nome.toLowerCase().replace(/\s+/g, "-"),
    name: nome,
    kind,
    address: null,
    maps_url: null,
    description: null,
    logo_url: null,
    cover_url: null,
    ambient_count: 0,
    display_cover: null,
    display_focus_x: 0.5,
    display_focus_y: 0.5,
    display_zoom: 1,
  };
}

test("até 6 showrooms na ordem recebida", () => {
  const lugares = [
    lugar("S1", "showroom"),
    lugar("S2", "showroom"),
    lugar("R1", "revenda"),
    lugar("S3", "showroom"),
    lugar("S4", "showroom"),
    lugar("S5", "showroom"),
    lugar("S6", "showroom"),
    lugar("S7", "showroom"),
    lugar("S8", "showroom"),
  ];
  const { showrooms } = separarLugares(lugares);
  assert.deepEqual(
    showrooms.map((s) => s.name),
    ["S1", "S2", "S3", "S4", "S5", "S6"],
  );
  assert.ok(showrooms.every((s) => s.kind === "showroom"));
});

test("revendas: só os nomes, na ordem", () => {
  const lugares = [
    lugar("R2", "revenda"),
    lugar("S1", "showroom"),
    lugar("R1", "revenda"),
    lugar("R3", "revenda"),
  ];
  assert.deepEqual(separarLugares(lugares).revendas, ["R2", "R1", "R3"]);
});

test("sem showroom: lista vazia e as revendas ficam", () => {
  const { showrooms, revendas } = separarLugares([lugar("R1", "revenda"), lugar("R2", "revenda")]);
  assert.deepEqual(showrooms, []);
  assert.deepEqual(revendas, ["R1", "R2"]);
});

test("nome com travessão passa como veio", () => {
  const { revendas } = separarLugares([lugar("Casa do Eletricista — Centro", "revenda")]);
  assert.deepEqual(revendas, ["Casa do Eletricista — Centro"]);
});

test("máximo menor que o número de showrooms corta no máximo", () => {
  const lugares = [lugar("S1", "showroom"), lugar("S2", "showroom"), lugar("S3", "showroom")];
  assert.deepEqual(
    separarLugares(lugares, 2).showrooms.map((s) => s.name),
    ["S1", "S2"],
  );
});
