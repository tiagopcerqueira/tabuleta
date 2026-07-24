import test from "node:test";
import assert from "node:assert/strict";

import { createStorage, createMemoryBackend, StorageFailure } from "../src/data/storage.js";

test("lê e escreve JSON", () => {
  const storage = createStorage(createMemoryBackend());
  assert.equal(storage.writeJSON("k", { a: 1 }).ok, true);
  assert.deepEqual(storage.readJSON("k").value, { a: 1 });
});

test("uma chave inexistente dá null, não um erro", () => {
  const storage = createStorage(createMemoryBackend());
  const result = storage.readJSON("não-existe");
  assert.equal(result.ok, true);
  assert.equal(result.value, null);
});

/* ============================================================
   O caminho que era engolido: o armazenamento cheio.
   Antes, quatro `catch {}` vazios tratavam isto como se nada
   fosse, e o utilizador perdia o trabalho sem nunca saber porquê.
   ============================================================ */
test("uma gravação que não cabe é comunicada como falta de espaço", () => {
  const storage = createStorage(createMemoryBackend({}, { limit: 50 }));
  const result = storage.writeJSON("k", { texto: "x".repeat(500) });

  assert.equal(result.ok, false);
  assert.equal(result.reason, StorageFailure.QUOTA);
});

test("distingue falta de espaço de armazenamento indisponível", () => {
  const partido = {
    getItem: () => {
      throw new Error("bloqueado");
    },
    setItem: () => {
      throw new Error("bloqueado");
    },
    removeItem: () => {},
    length: 0,
    key: () => null,
  };

  const storage = createStorage(partido);
  assert.equal(storage.available, false);
  assert.equal(storage.writeJSON("k", {}).reason, StorageFailure.UNAVAILABLE);
  assert.equal(storage.readJSON("k").reason, StorageFailure.UNAVAILABLE);
});

test("conteúdo que não é JSON é comunicado como corrompido, não como vazio", () => {
  const backend = createMemoryBackend({ k: "isto não é json" });
  const storage = createStorage(backend);

  const result = storage.readJSON("k");

  assert.equal(result.ok, false);
  assert.equal(result.reason, StorageFailure.CORRUPT);
});

test("a app continua utilizável sem armazenamento nenhum", () => {
  const storage = createStorage(null);
  assert.equal(storage.available, false);
  assert.doesNotThrow(() => storage.readJSON("k"));
  assert.doesNotThrow(() => storage.writeJSON("k", {}));
  assert.doesNotThrow(() => storage.remove("k"));
  assert.deepEqual(storage.keys(), []);
});

test("texto simples tem caminho próprio, sem passar por JSON", () => {
  const storage = createStorage(createMemoryBackend());
  storage.writeText("logo", "data:image/png;base64,AAA");
  assert.equal(storage.readText("logo").value, "data:image/png;base64,AAA");
});

test("keys lista as chaves guardadas", () => {
  const storage = createStorage(createMemoryBackend({ a: "1", b: "2" }));
  assert.deepEqual(storage.keys().sort(), ["a", "b"]);
});
