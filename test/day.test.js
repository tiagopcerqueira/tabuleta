import test from "node:test";
import assert from "node:assert/strict";

import { sanitizeDay, isEmptyDay, hasDishes, hasDesserts, copyDesserts } from "../src/core/day.js";

test("sanitizeDay aceita a forma canónica sem a alterar", () => {
  const day = sanitizeDay({
    soup: "Caldo verde",
    dishes: ["Bacalhau", "Bife"],
    desserts: [{ name: "Arroz doce", price: "3,50 €" }],
  });

  assert.equal(day.soup, "Caldo verde");
  assert.deepEqual(day.dishes, ["Bacalhau", "Bife"]);
  assert.deepEqual(day.desserts, [{ name: "Arroz doce", price: "3,50 €" }]);
});

test("sanitizeDay converte sobremesas do esquema antigo em texto", () => {
  const day = sanitizeDay({ desserts: ["Leite-creme", "Pudim"] });
  assert.deepEqual(day.desserts, [
    { name: "Leite-creme", price: "" },
    { name: "Pudim", price: "" },
  ]);
});

test("sanitizeDay descarta o resto de importações corrompidas", () => {
  const day = sanitizeDay({ desserts: ["[object Object]", { name: "Bom", price: "3 €" }] });
  assert.deepEqual(day.desserts, [{ name: "Bom", price: "3 €" }]);
});

test("sanitizeDay limpa espaços e remove entradas sem nome", () => {
  const day = sanitizeDay({
    soup: "  Canja  ",
    dishes: ["  Cozido  ", "", "   "],
    desserts: [
      { name: "  Pudim  ", price: "  3 €  " },
      { name: "", price: "5 €" },
    ],
  });

  assert.equal(day.soup, "Canja");
  assert.deepEqual(day.dishes, ["Cozido"]);
  assert.deepEqual(day.desserts, [{ name: "Pudim", price: "3 €" }]);
});

test("sanitizeDay sobrevive a lixo sem lançar exceção", () => {
  for (const bad of [null, undefined, 42, "texto", [], { dishes: "não é lista" }]) {
    const day = sanitizeDay(bad);
    assert.deepEqual(day.dishes, []);
    assert.deepEqual(day.desserts, []);
    assert.equal(day.soup, "");
  }
});

test("sanitizeDay preserva updatedAt quando é texto", () => {
  assert.equal(sanitizeDay({ updatedAt: "2026-07-24T10:00:00.000Z" }).updatedAt, "2026-07-24T10:00:00.000Z");
  assert.equal(sanitizeDay({ updatedAt: 12345 }).updatedAt, null);
  assert.equal(sanitizeDay({}).updatedAt, null);
});

test("isEmptyDay distingue um dia sem conteúdo de um dia com conteúdo", () => {
  assert.equal(isEmptyDay({ soup: "", dishes: [], desserts: [] }), true);
  assert.equal(isEmptyDay({ soup: "  ", dishes: ["  "], desserts: [{ name: "" }] }), true);
  assert.equal(isEmptyDay(null), true);
  assert.equal(isEmptyDay({ soup: "Canja", dishes: [], desserts: [] }), false);
  assert.equal(isEmptyDay({ soup: "", dishes: ["Cozido"], desserts: [] }), false);
  assert.equal(isEmptyDay({ soup: "", dishes: [], desserts: [{ name: "Pudim" }] }), false);
});

test("hasDishes e hasDesserts olham para o conteúdo, não para a existência do registo", () => {
  const soDesserts = { soup: "", dishes: [], desserts: [{ name: "Pudim", price: "" }] };
  assert.equal(hasDishes(soDesserts), false);
  assert.equal(hasDesserts(soDesserts), true);
});

test("copyDesserts produz cópias independentes", () => {
  const original = [{ name: "Pudim", price: "3 €" }];
  const copia = copyDesserts(original);
  copia[0].name = "Alterado";
  assert.equal(original[0].name, "Pudim");
});
