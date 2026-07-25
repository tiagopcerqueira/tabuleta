import test from "node:test";
import assert from "node:assert/strict";

import { createStorage, createMemoryBackend } from "../src/data/storage.js";
import { loadMigrated, markMigrated } from "../src/data/migrations.js";
import { GLOBAL_KEYS, storeKeys, SCHEMA_VERSION } from "../src/data/keys.js";
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

test("lê o que está guardado no esquema atual", () => {
  const storage = storageWith({
    [GLOBAL_KEYS.meta]: JSON.stringify({ schemaVersion: SCHEMA_VERSION }),
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

test("o logótipo é lido da sua própria chave, não de dentro das definições", () => {
  const logo = "data:image/png;base64,iVBORw0KGgo=";
  const storage = storageWith({
    [GLOBAL_KEYS.meta]: JSON.stringify({ schemaVersion: SCHEMA_VERSION }),
    [keys.settings]: JSON.stringify(defaultSettings()),
    [keys.logo]: logo,
  });

  assert.equal(loadMigrated(storage, "default").settings.logo, logo);
});

/* ============================================================
   O mecanismo de versão existe antes de haver migrações a fazer: é o que
   permite que a primeira migração a sério seja um caso a mais e não uma
   reescrita do arranque.
   ============================================================ */
test("uma versão guardada diferente da atual é assinalada", () => {
  const storage = storageWith({
    [GLOBAL_KEYS.meta]: JSON.stringify({ schemaVersion: SCHEMA_VERSION + 1 }),
    [keys.settings]: JSON.stringify(defaultSettings()),
  });

  assert.equal(loadMigrated(storage, "default").migratedFrom, SCHEMA_VERSION + 1);
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
  assert.equal(result.migratedFrom, null);
});

/* ---------------- Robustez ---------------- */

test("dados corrompidos não impedem o arranque", () => {
  const storage = storageWith({
    [GLOBAL_KEYS.meta]: "{isto não é json",
    [keys.settings]: "também não",
    [keys.history]: "nem isto",
  });

  const result = loadMigrated(storage, "default");

  assert.deepEqual(result.settings, defaultSettings());
  assert.deepEqual(result.days, {});
});

test("a app arranca mesmo sem armazenamento nenhum", () => {
  const result = loadMigrated(createStorage(null), "default");

  assert.deepEqual(result.settings, defaultSettings());
  assert.deepEqual(result.days, {});
});

test("ler é idempotente", () => {
  const storage = storageWith({
    [keys.settings]: JSON.stringify({ restaurant: "Tasca" }),
    [keys.history]: JSON.stringify({ days: { "2026-07-24": { soup: "Canja" } } }),
  });

  const primeira = loadMigrated(storage, "default");
  const segunda = loadMigrated(storage, "default");

  assert.deepEqual(segunda.settings, primeira.settings);
  assert.deepEqual(segunda.days, primeira.days);
});

test("markMigrated regista a versão do esquema", () => {
  const backend = createMemoryBackend();
  const storage = createStorage(backend);

  markMigrated(storage, new Date("2026-07-25T10:00:00.000Z"));

  const meta = JSON.parse(backend.getItem(GLOBAL_KEYS.meta));
  assert.equal(meta.schemaVersion, SCHEMA_VERSION);
  assert.equal(meta.migratedAt, "2026-07-25T10:00:00.000Z");
});

/* ============================================================
   As chaves levam o identificador de loja desde o início. Não há interface
   para várias lojas, mas introduzir o prefixo mais tarde obrigaria a migrar
   dados de restaurantes reais em vez de mudar uma constante.
   ============================================================ */
test("cada loja tem o seu conjunto de chaves", () => {
  const a = storeKeys("default");
  const b = storeKeys("segunda-loja");

  assert.notEqual(a.settings, b.settings);
  assert.notEqual(a.history, b.history);
  assert.match(b.settings, /segunda-loja/);
});

test("os dados de uma loja não são vistos por outra", () => {
  const storage = storageWith({
    [storeKeys("default").settings]: JSON.stringify({ restaurant: "Primeira" }),
    [storeKeys("outra").settings]: JSON.stringify({ restaurant: "Segunda" }),
  });

  assert.equal(loadMigrated(storage, "default").settings.restaurant, "Primeira");
  assert.equal(loadMigrated(storage, "outra").settings.restaurant, "Segunda");
});
