import assert from "node:assert/strict";
import test from "node:test";
import { repPriority } from "../../src/lib/rep-priority.ts";

const now = Date.parse("2026-11-11T16:00:00Z");
const daysAgo = days => new Date(now - days * 86_400_000).toISOString();
const oldContact = {
  stage: "acompanhamento",
  created_at: daysAgo(150),
  next_reminder_at: daysAgo(2),
  last_followup_at: daysAgo(1),
  updated_at: daysAgo(1),
};

test("saída recente e atualização de cadastro não renovam um contato antigo", () => {
  assert.equal(repPriority(oldContact, now).kind, "review");
  assert.equal(repPriority({ ...oldContact, first_contact_at: daysAgo(90) }, now).kind, "review");
});

test("resposta ou reunião registrada recoloca o contato na fila", () => {
  assert.equal(repPriority({ ...oldContact, last_reply_at: daysAgo(1) }, now).kind, "due");
  assert.equal(repPriority({ ...oldContact, meeting_happened_at: daysAgo(89) }, now).kind, "due");
});

test("inativos, sem histórico, novos e futuros ficam fora dos retornos vencidos", () => {
  assert.equal(repPriority({ ...oldContact, stage: "inativo" }, now).kind, "inactive");
  assert.equal(repPriority({ stage: "novo_contato" }, now).kind, "review");
  assert.equal(repPriority({ stage: "novo_contato", created_at: daysAgo(0) }, now).kind, "new");
  assert.equal(repPriority({ stage: "novo_contato", created_at: daysAgo(0), next_reminder_at: daysAgo(-1) }, now).kind, "later");
});
