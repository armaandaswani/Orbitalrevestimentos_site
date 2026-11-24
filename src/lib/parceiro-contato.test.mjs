import test from "node:test";
import assert from "node:assert/strict";
import {
  LISTA_PERFIS_PARCEIRO, PERFIS_PARCEIRO, digitosFone, foneValido, linkWhatsappParceiro, mascaraFone, mensagemParceiro,
  pendenciasParceiro, perfilParceiroDe, perguntasDe, totalPerguntas, validarParceiro,
} from "./parceiro-contato.ts";

const lojista = {
  respostas: { loja: "acabamentos", vende: "outros", quer: ["tabela", "consultor"] },
  cidade: "manaus", nome: "Ana Souza", whatsapp: "92991234567",
};

test("máscara: (92) 90000-0000 com 11 dígitos e (92) 0000-0000 com 10", () => {
  assert.equal(mascaraFone("9"), "(9");
  assert.equal(mascaraFone("929"), "(92) 9");
  assert.equal(mascaraFone("92991234567"), "(92) 99123-4567");
  assert.equal(mascaraFone("9233334444"), "(92) 3333-4444");
  assert.equal(mascaraFone("(92) 99123-4567 extra 8"), "(92) 99123-4567");
});

test("fone: 10 ou 11 dígitos, com ou sem o 55", () => {
  assert.equal(foneValido("92991234567"), true);
  assert.equal(foneValido("5592991234567"), true);
  assert.equal(digitosFone("+55 (92) 99123-4567"), "92991234567");
  assert.equal(foneValido("929912345"), false);
  assert.equal(foneValido(""), false);
});

test("apelidos de ?parceiro=", () => {
  assert.equal(perfilParceiroDe("Construtores"), "construtor");
  assert.equal(perfilParceiroDe("revendedor"), "lojista");
  assert.equal(perfilParceiroDe("imobiliária"), "corretor");
  assert.equal(perfilParceiroDe("arquiteto"), null);
});

test("quem ainda não tem loja pula a pergunta de revestimento", () => {
  assert.equal(perguntasDe("lojista", { respostas: { loja: "sem_loja" } }).map((p) => p.id).join(","), "loja,quer");
  assert.equal(perguntasDe("lojista", { respostas: {} }).length, 3);
  assert.equal(totalPerguntas("lojista"), 6);
  assert.equal(totalPerguntas("marceneiro"), 7);
  assert.equal(totalPerguntas("corretor"), 5);
});

test("pendências: nome e WhatsApp são obrigatórios; outro estado pede a cidade", () => {
  assert.deepEqual(pendenciasParceiro("lojista", lojista), []);
  assert.deepEqual(pendenciasParceiro("lojista", { ...lojista, nome: " ", whatsapp: "9299" }), ["nome", "whatsapp"]);
  assert.deepEqual(pendenciasParceiro("lojista", { ...lojista, cidade: "fora" }), ["cidade"]);
  assert.deepEqual(pendenciasParceiro("lojista", { ...lojista, cidade: "amazonas" }), []);
  assert.deepEqual(pendenciasParceiro("lojista", { ...lojista, respostas: { loja: "acabamentos", quer: [] } }), ["vende", "quer"]);
});

test("mensagem: saudação, quem é e as respostas em linhas curtas", () => {
  assert.equal(mensagemParceiro("lojista", lojista), [
    "Olá! Vim pelo site da Orbital e quero conversar sobre parceria.",
    "Sou Ana Souza, lojista em Manaus.",
    "",
    "Loja: Acabamentos e revestimentos",
    "Já vende revestimento de parede: Sim, outros revestimentos",
    "Quero: Conhecer a tabela para revendedor; Falar com um consultor sobre o primeiro pedido",
  ].join("\n"));
  const fora = mensagemParceiro("construtor", { respostas: { obra: "comercial" }, cidade: "fora", cidadeOutra: "Belém, PA", nome: "Rui" });
  assert.match(fora, /Sou Rui, construtor\(a\) em Belém, PA\./);
  assert.match(mensagemParceiro("aplicador", { respostas: {}, cidade: "amazonas", cidadeOutra: "Parintins", nome: "Lu" }), /em Parintins \(AM\)\./);
  assert.ok(linkWhatsappParceiro("5592988150149", "lojista", lojista).startsWith("https://wa.me/5592988150149?text=Ol%C3%A1!"));
});

test("cada perfil percorre o caminho inteiro e passa na validação do servidor", () => {
  for (const perfil of LISTA_PERFIS_PARCEIRO) {
    const respostas = {};
    for (const p of PERFIS_PARCEIRO[perfil].perguntas) respostas[p.id] = p.multipla ? [p.opcoes[0].value] : p.opcoes[0].value;
    const v = validarParceiro(perfil, { respostas, cidade: "manaus", nome: "Teste", whatsapp: "(92) 99123-4567" });
    assert.equal(v.ok, true, perfil);
  }
});

test("servidor: recusa perfil, opção e telefone fora da lista; descarta pergunta pulada", () => {
  assert.equal(validarParceiro("arquiteto", lojista).ok, false);
  assert.equal(validarParceiro("lojista", { ...lojista, respostas: { ...lojista.respostas, loja: "padaria" } }).ok, false);
  assert.equal(validarParceiro("lojista", { ...lojista, respostas: { ...lojista.respostas, quer: "tabela" } }).ok, false);
  assert.equal(validarParceiro("lojista", { ...lojista, whatsapp: "123" }).ok, false);
  assert.equal(validarParceiro("lojista", { ...lojista, nome: "" }).ok, false);
  assert.equal(validarParceiro("lojista", { ...lojista, cidade: "marte" }).ok, false);
  const semLoja = validarParceiro("lojista", { ...lojista, respostas: { loja: "sem_loja", vende: "nao", quer: ["tabela"] } });
  assert.equal(semLoja.ok, true);
  assert.equal(semLoja.r.respostas.vende, undefined);
});
