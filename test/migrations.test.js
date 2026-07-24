import test from "node:test";
import assert from "node:assert/strict";

import { createStorage, createMemoryBackend } from "../src/data/storage.js";
import { loadMigrated, markMigrated } from "../src/data/migrations.js";
import { GLOBAL_KEYS, LEGACY_KEYS, storeKeys } from "../src/data/keys.js";
import { defaultSettings } from "../src/core/settings.js";

const keys = storeKeys("default");

function storageWith(entries) {
  return createStorage(createMemoryBackend(entries));
}

test("uma instalação nova arranca nas definições por omissão", () => {
  const result = loadMigrated(storageWith({}), "default");

  assert.deepEqual(result.settings, defaultSettings());
  assert.deepEqual(result.days, {});
  assert.equal(result.migratedFrom, null);
});

test("lê o esquema atual sem migrar", () => {
  const storage = storageWith({
    [GLOBAL_KEYS.meta]: JSON.stringify({ schemaVersion: 4 }),
    [keys.settings]: JSON.stringify({ ...defaultSettings(), restaurant: "Tasca do Manel" }),
    [keys.history]: JSON.stringify({
      days: { "2026-07-24": { soup: "Canja", dishes: ["Cozido"], desserts: [] } },
    }),
  });

  const result = loadMigrated(storage, "default");

  assert.equal(result.settings.restaurant, "Tasca do Manel");
  assert.equal(result.days["2026-07-24"].soup, "Canja");
  assert.equal(result.migratedFrom, null);
});

test("o logótipo é lido da sua própria chave", () => {
  const logo = "data:image/png;base64,iVBORw0KGgo=";
  const storage = storageWith({
    [GLOBAL_KEYS.meta]: JSON.stringify({ schemaVersion: 4 }),
    [keys.settings]: JSON.stringify(defaultSettings()),
    [keys.logo]: logo,
  });

  assert.equal(loadMigrated(storage, "default").settings.logo, logo);
});

/* ---------------- Migração a partir da versão 3 ---------------- */

test("migra definições e histórico da versão 3", () => {
  const storage = storageWith({
    [LEGACY_KEYS.v3]: JSON.stringify({
      settings: { restaurant: "Tasca do Manel", price: "9,50 €", templatePrint: "bistro" },
    }),
    [LEGACY_KEYS.historyV1]: JSON.stringify({
      days: {
        "2026-07-24": {
          soup: "Canja",
          dishes: ["Cozido"],
          desserts: [{ name: "Pudim", price: "3 €" }],
        },
      },
    }),
  });

  const result = loadMigrated(storage, "default");

  assert.equal(result.migratedFrom, 3);
  assert.equal(result.settings.restaurant, "Tasca do Manel");
  assert.equal(result.settings.price, "9,50 €");
  assert.equal(result.settings.templatePrint, "bistro");
  assert.deepEqual(result.days["2026-07-24"].desserts, [{ name: "Pudim", price: "3 €" }]);
});

test("a migração da versão 3 normaliza sobremesas em texto simples", () => {
  const storage = storageWith({
    [LEGACY_KEYS.v3]: JSON.stringify({ settings: {} }),
    [LEGACY_KEYS.historyV1]: JSON.stringify({
      days: { "2026-07-24": { soup: "", dishes: [], desserts: ["Leite-creme"] } },
    }),
  });

  const result = loadMigrated(storage, "default");

  assert.deepEqual(result.days["2026-07-24"].desserts, [{ name: "Leite-creme", price: "" }]);
});

/* ---------------- Migração a partir da versão 2 ---------------- */

test("migra a versão 2, recuperando o menu do dia para o histórico", () => {
  const storage = storageWith({
    [LEGACY_KEYS.v2]: JSON.stringify({
      restaurant: "Tasca Antiga",
      tagline: "Desde 1985",
      price: "8 €",
      date: "2026-07-20",
      soup: "Caldo verde",
      dishes: ["Bacalhau", "Bife"],
    }),
  });

  const result = loadMigrated(storage, "default");

  assert.equal(result.migratedFrom, 2);
  assert.equal(result.settings.restaurant, "Tasca Antiga");
  assert.equal(result.settings.tagline, "Desde 1985");
  assert.equal(result.days["2026-07-20"].soup, "Caldo verde");
  assert.deepEqual(result.days["2026-07-20"].dishes, ["Bacalhau", "Bife"]);
});

test("a versão 2 sem conteúdo de dia não cria um registo vazio", () => {
  const storage = storageWith({
    [LEGACY_KEYS.v2]: JSON.stringify({ restaurant: "Tasca", date: "2026-07-20" }),
  });

  const result = loadMigrated(storage, "default");

  assert.equal(result.settings.restaurant, "Tasca");
  assert.deepEqual(result.days, {});
});

test("a versão 3 tem precedência sobre a versão 2", () => {
  const storage = storageWith({
    [LEGACY_KEYS.v2]: JSON.stringify({ restaurant: "Antiga" }),
    [LEGACY_KEYS.v3]: JSON.stringify({ settings: { restaurant: "Mais recente" } }),
  });

  assert.equal(loadMigrated(storage, "default").settings.restaurant, "Mais recente");
});

/* ---------------- Robustez ---------------- */

test("dados antigos corrompidos não impedem o arranque", () => {
  const storage = storageWith({
    [LEGACY_KEYS.v3]: "{isto não é json",
    [LEGACY_KEYS.v2]: "também não",
  });

  const result = loadMigrated(storage, "default");

  assert.deepEqual(result.settings, defaultSettings());
  assert.deepEqual(result.days, {});
});

test("migrar é idempotente", () => {
  const backend = createMemoryBackend({
    [LEGACY_KEYS.v3]: JSON.stringify({ settings: { restaurant: "Tasca" } }),
    [LEGACY_KEYS.historyV1]: JSON.stringify({
      days: { "2026-07-24": { soup: "Canja", dishes: [], desserts: [] } },
    }),
  });
  const storage = createStorage(backend);

  const primeira = loadMigrated(storage, "default");
  const segunda = loadMigrated(storage, "default");

  assert.deepEqual(segunda.settings, primeira.settings);
  assert.deepEqual(segunda.days, primeira.days);
});

/* ============================================================
   Os dados antigos ficam onde estão. Se uma versão nova tiver um
   defeito, o histórico do restaurante continua recuperável.
   ============================================================ */
test("a migração não apaga as chaves antigas", () => {
  const backend = createMemoryBackend({
    [LEGACY_KEYS.v3]: JSON.stringify({ settings: { restaurant: "Tasca" } }),
  });
  const storage = createStorage(backend);

  loadMigrated(storage, "default");

  assert.notEqual(backend.getItem(LEGACY_KEYS.v3), null);
});

test("markMigrated regista a versão do esquema", () => {
  const backend = createMemoryBackend();
  const storage = createStorage(backend);

  markMigrated(storage, new Date("2026-07-24T10:00:00.000Z"));

  const meta = JSON.parse(backend.getItem(GLOBAL_KEYS.meta));
  assert.equal(meta.schemaVersion, 4);
  assert.equal(meta.migratedAt, "2026-07-24T10:00:00.000Z");
});

test("dados na forma atual são lidos mesmo sem registo de versão", () => {
  // Acontece se a gravação do registo de versão falhou por falta de espaço.
  const storage = storageWith({
    [keys.settings]: JSON.stringify({ ...defaultSettings(), restaurant: "Tasca" }),
    [keys.history]: JSON.stringify({ days: { "2026-07-24": { soup: "Canja" } } }),
  });

  const result = loadMigrated(storage, "default");

  assert.equal(result.settings.restaurant, "Tasca");
  assert.equal(result.days["2026-07-24"].soup, "Canja");
});
