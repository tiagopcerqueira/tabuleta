import test from "node:test";
import assert from "node:assert/strict";

import {
  sanitizeHistory,
  pruneHistory,
  setDay,
  findPreviousDishesDate,
  findPreviousDessertsDate,
  collectSuggestions,
  sortedDates,
} from "../src/core/history.js";

function day(overrides = {}) {
  return { soup: "", dishes: [], desserts: [], updatedAt: null, ...overrides };
}

test("sanitizeHistory descarta chaves que não são datas e dias vazios", () => {
  const history = sanitizeHistory({
    days: {
      "2026-07-24": { soup: "Canja", dishes: [], desserts: [] },
      "2026-07-25": { soup: "", dishes: [], desserts: [] },
      lixo: { soup: "Canja", dishes: [], desserts: [] },
      "2026-02-30": { soup: "Canja", dishes: [], desserts: [] },
    },
  });

  assert.deepEqual(Object.keys(history.days), ["2026-07-24"]);
});

test("sanitizeHistory sobrevive a estruturas inesperadas", () => {
  for (const bad of [null, undefined, 42, "texto", {}, { days: null }, { days: "x" }]) {
    assert.deepEqual(sanitizeHistory(bad), { days: {} });
  }
});

test("pruneHistory mantém as datas mais recentes", () => {
  const days = {};
  for (let i = 1; i <= 10; i++) days[`2026-07-${String(i).padStart(2, "0")}`] = day({ soup: `S${i}` });

  const pruned = pruneHistory(days, 3);

  assert.deepEqual(sortedDates(pruned), ["2026-07-08", "2026-07-09", "2026-07-10"]);
});

test("pruneHistory não muta a entrada", () => {
  const days = { "2026-07-01": day({ soup: "A" }), "2026-07-02": day({ soup: "B" }) };
  pruneHistory(days, 1);
  assert.equal(Object.keys(days).length, 2);
});

test("setDay grava, carimba updatedAt e poda", () => {
  const now = new Date("2026-07-24T12:00:00.000Z");
  const days = setDay({}, "2026-07-24", { soup: "Canja", dishes: ["Cozido"], desserts: [] }, { now });

  assert.equal(days["2026-07-24"].soup, "Canja");
  assert.equal(days["2026-07-24"].updatedAt, "2026-07-24T12:00:00.000Z");
});

test("setDay remove o registo quando o dia fica vazio", () => {
  const before = { "2026-07-24": day({ soup: "Canja" }) };
  const after = setDay(before, "2026-07-24", { soup: "", dishes: [], desserts: [] });

  assert.equal("2026-07-24" in after, false);
  assert.equal("2026-07-24" in before, true, "a entrada original não deve ser mutada");
});

test("setDay ignora datas inválidas", () => {
  assert.deepEqual(setDay({}, "não-é-data", { soup: "Canja" }), {});
});

test("setDay respeita o limite de dias", () => {
  let days = {};
  for (let i = 1; i <= 5; i++) {
    days = setDay(days, `2026-07-${String(i).padStart(2, "0")}`, { soup: `S${i}` }, { max: 3 });
  }
  assert.equal(Object.keys(days).length, 3);
  assert.deepEqual(sortedDates(days), ["2026-07-03", "2026-07-04", "2026-07-05"]);
});

/* ============================================================
   "Copiar de ontem" — o botão dos pratos ignorava se o dia anterior
   tinha mesmo pratos, e anunciava "Copiado o menu de …" depois de
   copiar uma lista vazia vinda de um dia que só tinha sobremesas.
   ============================================================ */
test("copiar de ontem salta dias que só têm sobremesas", () => {
  const days = {
    "2026-07-20": day({ soup: "Canja", dishes: ["Cozido"] }),
    "2026-07-22": day({ desserts: [{ name: "Pudim", price: "3 €" }] }),
  };

  assert.equal(findPreviousDishesDate(days, "2026-07-24"), "2026-07-20");
  assert.equal(findPreviousDessertsDate(days, "2026-07-24"), "2026-07-22");
});

test("copiar de ontem devolve null quando não há nada antes", () => {
  const days = { "2026-07-24": day({ dishes: ["Cozido"] }) };
  assert.equal(findPreviousDishesDate(days, "2026-07-24"), null);
  assert.equal(findPreviousDishesDate({}, "2026-07-24"), null);
});

test("copiar de ontem escolhe o dia mais recente, não o primeiro", () => {
  const days = {
    "2026-07-01": day({ dishes: ["Antigo"] }),
    "2026-07-20": day({ dishes: ["Recente"] }),
  };
  assert.equal(findPreviousDishesDate(days, "2026-07-24"), "2026-07-20");
});

/* ---------------- Sugestões ---------------- */

test("as sugestões vêm dos dias mais recentes primeiro e não se repetem", () => {
  const days = {
    "2026-07-20": day({ soup: "Canja", dishes: ["Cozido", "Bacalhau"] }),
    "2026-07-22": day({ soup: "Caldo verde", dishes: ["Bacalhau", "Bife"] }),
  };

  const { dishes, soups } = collectSuggestions(days);

  assert.deepEqual(dishes, ["Bacalhau", "Bife", "Cozido"]);
  assert.deepEqual(soups, ["Caldo verde", "Canja"]);
});

test("as sugestões excluem o dia que se está a editar", () => {
  const days = {
    "2026-07-22": day({ dishes: ["Antigo"] }),
    "2026-07-24": day({ dishes: ["A escrever agora"] }),
  };

  const { dishes } = collectSuggestions(days, { excludeDate: "2026-07-24" });

  assert.deepEqual(dishes, ["Antigo"]);
});

test("as sugestões ignoram diferenças de maiúsculas ao deduplicar", () => {
  const days = {
    "2026-07-20": day({ dishes: ["bacalhau à brás"] }),
    "2026-07-22": day({ dishes: ["Bacalhau à Brás"] }),
  };

  assert.deepEqual(collectSuggestions(days).dishes, ["Bacalhau à Brás"]);
});

test("as sugestões respeitam os limites", () => {
  const days = {};
  for (let i = 1; i <= 30; i++) {
    days[`2026-07-${String(i).padStart(2, "0")}`] = day({ soup: `Sopa ${i}`, dishes: [`Prato ${i}`] });
  }

  const { dishes, soups } = collectSuggestions(days, { limits: { dishes: 5, soups: 2 } });

  assert.equal(dishes.length, 5);
  assert.equal(soups.length, 2);
  assert.equal(dishes[0], "Prato 30", "deve começar pelo mais recente");
});

test("as sugestões incluem sobremesas em lista própria", () => {
  const days = {
    "2026-07-22": day({
      desserts: [
        { name: "Pudim", price: "3 €" },
        { name: "", price: "" },
      ],
    }),
  };

  assert.deepEqual(collectSuggestions(days).desserts, ["Pudim"]);
});
