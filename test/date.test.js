import test from "node:test";
import assert from "node:assert/strict";

import { todayISO, addDays, formatDatePT, parseISO, isValidISO } from "../src/core/date.js";

test("todayISO usa os componentes locais da data", () => {
  // 23:30 local — a via por UTC devolveria o dia seguinte em fusos a leste de Greenwich
  assert.equal(todayISO(new Date(2026, 6, 24, 23, 30)), "2026-07-24");
  assert.equal(todayISO(new Date(2026, 0, 1, 0, 5)), "2026-01-01");
  assert.equal(todayISO(new Date(2026, 11, 31, 23, 59)), "2026-12-31");
});

test("addDays atravessa meses e anos", () => {
  assert.equal(addDays("2026-07-24", 1), "2026-07-25");
  assert.equal(addDays("2026-07-24", -1), "2026-07-23");
  assert.equal(addDays("2026-07-31", 1), "2026-08-01");
  assert.equal(addDays("2026-01-01", -1), "2025-12-31");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});

test("addDays atravessa a mudança para a hora de verão sem saltar um dia", () => {
  // Em Portugal a hora avança no último domingo de março (2026-03-29).
  assert.equal(addDays("2026-03-28", 1), "2026-03-29");
  assert.equal(addDays("2026-03-29", 1), "2026-03-30");
  assert.equal(addDays("2026-03-30", -1), "2026-03-29");
  // E recua no último domingo de outubro (2026-10-25).
  assert.equal(addDays("2026-10-24", 1), "2026-10-25");
  assert.equal(addDays("2026-10-25", 1), "2026-10-26");
});

test("addDays lida com anos bissextos", () => {
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2028-02-29", 1), "2028-03-01");
  assert.equal(addDays("2026-02-28", 1), "2026-03-01");
});

test("formatDatePT escreve a data por extenso em português", () => {
  assert.equal(formatDatePT("2026-07-24"), "Sexta-feira, 24 de julho de 2026");
  assert.equal(formatDatePT("2026-03-01"), "Domingo, 1 de março de 2026");
  assert.equal(formatDatePT("2026-12-25"), "Sexta-feira, 25 de dezembro de 2026");
});

test("datas inválidas dão resultado vazio em vez de lixo", () => {
  for (const bad of ["", null, undefined, "não é data", "2026-13-01", "2026-02-30", "26-07-24", "2026-7-4"]) {
    assert.equal(formatDatePT(bad), "", `formatDatePT(${JSON.stringify(bad)})`);
    assert.equal(addDays(bad, 1), "", `addDays(${JSON.stringify(bad)})`);
    assert.equal(isValidISO(bad), false, `isValidISO(${JSON.stringify(bad)})`);
  }
});

test("parseISO decompõe datas válidas", () => {
  assert.deepEqual(parseISO("2026-07-24"), { y: 2026, m: 7, d: 24 });
  assert.equal(parseISO("2026-02-30"), null);
});
