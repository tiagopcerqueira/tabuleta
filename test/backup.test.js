import test from "node:test";
import assert from "node:assert/strict";

import { serializeBackup, parseBackup, BACKUP_VERSION } from "../src/core/backup.js";
import { defaultSettings } from "../src/core/settings.js";

function settingsWith(overrides = {}) {
  return { ...defaultSettings(), ...overrides };
}

const DAYS = {
  "2026-07-23": {
    soup: "Caldo verde",
    dishes: ["Bacalhau à Brás", "Bife à casa"],
    desserts: [],
    updatedAt: null,
  },
  "2026-07-24": {
    soup: "Sopa de legumes",
    dishes: ["Arroz de pato"],
    desserts: [
      { name: "Arroz doce", price: "3,50 €" },
      { name: "Mousse de chocolate", price: "3 €" },
    ],
    updatedAt: null,
  },
};

/* ============================================================
   O teste que faltava.

   O defeito: importar um backup passava cada sobremesa por String(), o que
   sobre um objeto {name, price} produz a cadeia "[object Object]". Todas as
   sobremesas e todos os preços de todos os dias eram destruídos em silêncio,
   porque a normalização seguinte aceitava o resultado como um nome válido.
   ============================================================ */
test("exportar e importar preserva as sobremesas com os seus preços", () => {
  const text = serializeBackup(settingsWith({ restaurant: "Tasca do Manel" }), DAYS);
  const result = parseBackup(text);

  assert.equal(result.ok, true);
  assert.deepEqual(result.days["2026-07-24"].desserts, [
    { name: "Arroz doce", price: "3,50 €" },
    { name: "Mousse de chocolate", price: "3 €" },
  ]);
});

test("exportar e importar preserva sopa, pratos e definições", () => {
  const settings = settingsWith({
    restaurant: "Tasca do Manel",
    tagline: "Cozinha caseira desde 1985",
    price: "9,50 €",
    format: "story",
    templateStory: "vibrante",
  });

  const result = parseBackup(serializeBackup(settings, DAYS));

  assert.equal(result.ok, true);
  assert.equal(result.settings.restaurant, "Tasca do Manel");
  assert.equal(result.settings.tagline, "Cozinha caseira desde 1985");
  assert.equal(result.settings.format, "story");
  assert.equal(result.settings.templateStory, "vibrante");
  assert.equal(result.days["2026-07-23"].soup, "Caldo verde");
  assert.deepEqual(result.days["2026-07-23"].dishes, ["Bacalhau à Brás", "Bife à casa"]);
});

test("uma segunda viagem de ida e volta não degrada nada", () => {
  const settings = settingsWith({ restaurant: "Tasca do Manel" });
  const first = parseBackup(serializeBackup(settings, DAYS));
  const second = parseBackup(serializeBackup(first.settings, first.days));

  assert.deepEqual(second.days, first.days);
  assert.deepEqual(second.settings, first.settings);
});

test("lê ficheiros do esquema antigo, em que as sobremesas eram texto simples", () => {
  const legacy = JSON.stringify({
    app: "prato-do-dia",
    version: 3,
    settings: defaultSettings(),
    days: {
      "2026-07-20": { soup: "Canja", dishes: ["Cozido"], desserts: ["Leite-creme", "Pudim"] },
    },
  });

  const result = parseBackup(legacy);

  assert.equal(result.ok, true);
  assert.deepEqual(result.days["2026-07-20"].desserts, [
    { name: "Leite-creme", price: "" },
    { name: "Pudim", price: "" },
  ]);
});

test("repara dias já corrompidos por uma importação anterior", () => {
  const corrupted = JSON.stringify({
    app: "prato-do-dia",
    version: 3,
    settings: defaultSettings(),
    days: {
      "2026-07-19": {
        soup: "Canja",
        dishes: ["Cozido"],
        desserts: ["[object Object]", "[object Object]"],
      },
    },
  });

  const result = parseBackup(corrupted);

  assert.equal(result.ok, true);
  assert.deepEqual(result.days["2026-07-19"].desserts, []);
  assert.equal(result.days["2026-07-19"].soup, "Canja");
});

test("o ficheiro exportado declara aplicação e versão", () => {
  const parsed = JSON.parse(serializeBackup(defaultSettings(), DAYS));
  assert.equal(parsed.app, "prato-do-dia");
  assert.equal(parsed.version, BACKUP_VERSION);
  assert.equal(typeof parsed.exportedAt, "string");
});

/* ---------------- Rejeições ---------------- */

test("rejeita ficheiros inválidos sem lançar exceção", () => {
  assert.equal(parseBackup("isto não é json").reason, "json");
  assert.equal(parseBackup("null").reason, "shape");
  assert.equal(parseBackup(JSON.stringify({ app: "outra-app", settings: {}, days: {} })).reason, "app");
  assert.equal(parseBackup(JSON.stringify({ app: "prato-do-dia", days: {} })).reason, "shape");
  assert.equal(
    parseBackup(JSON.stringify({ app: "prato-do-dia", version: 99, settings: {}, days: {} })).reason,
    "version"
  );
});

test("descarta chaves que não são datas válidas", () => {
  const text = JSON.stringify({
    app: "prato-do-dia",
    version: 4,
    settings: defaultSettings(),
    days: {
      "2026-02-30": { soup: "Inexistente", dishes: [], desserts: [] },
      "não-é-data": { soup: "Lixo", dishes: [], desserts: [] },
      "2026-07-24": { soup: "Canja", dishes: [], desserts: [] },
    },
  });

  const result = parseBackup(text);

  assert.deepEqual(Object.keys(result.days), ["2026-07-24"]);
});

test("descarta dias que ficam vazios depois de normalizados", () => {
  const text = JSON.stringify({
    app: "prato-do-dia",
    version: 4,
    settings: defaultSettings(),
    days: {
      "2026-07-24": { soup: "   ", dishes: ["", "  "], desserts: [{ name: "", price: "5 €" }] },
    },
  });

  assert.deepEqual(parseBackup(text).days, {});
});
