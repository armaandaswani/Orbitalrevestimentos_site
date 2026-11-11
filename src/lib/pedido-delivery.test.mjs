import test from "node:test";
import assert from "node:assert/strict";
import { cleanExpectedDeliveryMonth, expectedDeliveryLabel, snapshotDeliveryMonth } from "./pedido-delivery.ts";

test("forecast accepts a calendar month only, without guessing invalid dates", () => {
  for (const bad of ["2027-13", "2027-00", "2027-02-01", "27-02", "", null, 202702]) assert.equal(cleanExpectedDeliveryMonth(bad), null);
  assert.equal(cleanExpectedDeliveryMonth(" 2027-02 "), "2027-02");
});
test("client copy gives a month forecast without promising an exact day", () => {
  assert.equal(expectedDeliveryLabel("2027-02"), "Entrega prevista: fevereiro de 2027");
  assert.equal(expectedDeliveryLabel(null), null);
});
test("legacy has no new promise; existing snapshot survives catalog changes", () => {
  assert.equal(snapshotDeliveryMonth(null, null, null), null);
  assert.equal(snapshotDeliveryMonth(undefined, "2027-02", "2027-03"), "2027-02");
  assert.equal(snapshotDeliveryMonth(undefined, null, "2027-02"), "2027-02");
});
