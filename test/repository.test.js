import test from "node:test";
import assert from "node:assert/strict";

import { createStorage, createMemoryBackend, StorageFailure } from "../src/data/storage.js";
import { createRepository } from "../src/data/repository.js";
import { storeKeys, GLOBAL_KEYS, SCHEMA_VERSION } from "../src/data/keys.js";

const keys = storeKeys("default");

/** Relógio manual: o tempo só avança quando o teste o mandar. */
function fakeScheduler() {
  let seq = 0;
  const pending = new Map();
  return {
    setTimeout(fn) {
      pending.set(++seq, fn);
      return seq;
    },
    clearTimeout(id) {
      pending.delete(id);
    },
    /** Corre tudo o que estiver agendado. */
    run() {
      const fns = Array.from(pending.values());
      pending.clear();
      fns.forEach((fn) => fn());
    },
    get pendingCount() {
      return pending.size;
    },
  };
}

function setup({ entries = {}, limit = Infinity } = {}) {
  const backend = createMemoryBackend(entries, { limit });
  const storage = createStorage(backend);
  const scheduler = fakeScheduler();
  const failures = [];
  const repo = createRepository({
    storage,
    scheduler,
    onFailure: (reason) => failures.push(reason),
    now: () => new Date("2026-07-24T12:00:00.000Z"),
  });
  return { backend, storage, scheduler, repo, failures };
}

/* ---------------- Leitura em memória ---------------- */

test("arranca com as definições e o histórico já carregados", () => {
  const { repo } = setup({
    entries: {
      [GLOBAL_KEYS.meta]: JSON.stringify({ schemaVersion: 4 }),
      [keys.settings]: JSON.stringify({ restaurant: "Tasca do Manel" }),
      [keys.history]: JSON.stringify({ days: { "2026-07-24": { soup: "Canja" } } }),
    },
  });

  assert.equal(repo.getSettings().restaurant, "Tasca do Manel");
  assert.equal(repo.getDay("2026-07-24").soup, "Canja");
});

/* ============================================================
   O histórico é lido do armazenamento UMA vez. Antes, cada tecla
   escrita provocava dois parses completos e duas serializações,
   porque gravar e recolher sugestões liam ambos do disco.
   ============================================================ */
test("depois de arrancar, ler não volta a tocar no armazenamento", () => {
  const { repo, backend } = setup({
    entries: {
      [GLOBAL_KEYS.meta]: JSON.stringify({ schemaVersion: 4 }),
      [keys.history]: JSON.stringify({ days: { "2026-07-24": { soup: "Canja" } } }),
    },
  });

  let leituras = 0;
  const getItem = backend.getItem;
  backend.getItem = (key) => {
    leituras++;
    return getItem(key);
  };

  for (let i = 0; i < 50; i++) {
    repo.getDays();
    repo.getSettings();
    repo.getDay("2026-07-24");
  }

  assert.equal(leituras, 0);
});

/* ---------------- Escrita diferida ---------------- */

test("escrever não toca no armazenamento até o atraso passar", () => {
  const { repo, backend, scheduler } = setup();

  repo.updateSettings({ restaurant: "Tasca" });

  assert.equal(backend.getItem(keys.settings), null, "ainda não deve ter gravado");
  scheduler.run();
  assert.notEqual(backend.getItem(keys.settings), null, "depois do atraso deve gravar");
});

test("várias alterações seguidas resultam numa só gravação", () => {
  const { repo, backend, scheduler } = setup();

  let escritas = 0;
  const setItem = backend.setItem.bind(backend);
  backend.setItem = (key, value) => {
    if (key === keys.settings) escritas++;
    setItem(key, value);
  };

  for (const nome of ["T", "Ta", "Tas", "Tasc", "Tasca"]) repo.updateSettings({ restaurant: nome });
  scheduler.run();

  assert.equal(escritas, 1);
  assert.equal(JSON.parse(backend.getItem(keys.settings)).restaurant, "Tasca");
});

test("flush grava imediatamente o que estiver pendente", () => {
  const { repo, backend } = setup();

  repo.saveDay("2026-07-24", { soup: "Canja", dishes: ["Cozido"], desserts: [] });
  repo.flush();

  assert.equal(JSON.parse(backend.getItem(keys.history)).days["2026-07-24"].soup, "Canja");
});

/* ============================================================
   O logótipo é o maior valor guardado. Gravar uma frase de rodapé
   não deve reescrever a imagem inteira.
   ============================================================ */
test("gravar definições não reescreve o logótipo", () => {
  const { repo, backend, scheduler } = setup();
  repo.setLogo("data:image/png;base64," + "A".repeat(200));
  scheduler.run();

  let escritasDoLogo = 0;
  const setItem = backend.setItem.bind(backend);
  backend.setItem = (key, value) => {
    if (key === keys.logo) escritasDoLogo++;
    setItem(key, value);
  };

  repo.updateSettings({ footer: "Bom apetite!" });
  scheduler.run();

  assert.equal(escritasDoLogo, 0);
});

test("o logótipo não é guardado dentro das definições", () => {
  const { repo, backend, scheduler } = setup();

  repo.setLogo("data:image/png;base64,AAAA");
  scheduler.run();

  const guardadas = JSON.parse(backend.getItem(keys.settings));
  assert.equal("logo" in guardadas, false);
  assert.equal(backend.getItem(keys.logo), "data:image/png;base64,AAAA");
  assert.equal(repo.getSettings().logo, "data:image/png;base64,AAAA", "mas continua visível na API");
});

test("remover o logótipo apaga a chave", () => {
  const { repo, backend, scheduler } = setup();
  repo.setLogo("data:image/png;base64,AAAA");
  scheduler.run();

  repo.setLogo("");
  scheduler.run();

  assert.equal(backend.getItem(keys.logo), null);
});

/* ============================================================
   O defeito D2: uma gravação que falha por falta de espaço tem de
   chegar ao utilizador. Em silêncio, o restaurante escreve o menu
   do dia e perde-o ao recarregar, sem nunca saber porquê.
   ============================================================ */
test("uma gravação que não cabe é comunicada", () => {
  const { repo, scheduler, failures } = setup({ limit: 120 });

  repo.updateSettings({ restaurant: "Tasca do Manel", footer: "x".repeat(500) });
  scheduler.run();

  assert.deepEqual(failures, [StorageFailure.QUOTA]);
});

test("o mesmo problema não é anunciado a cada tecla", () => {
  const { repo, scheduler, failures } = setup({ limit: 120 });

  for (let i = 0; i < 10; i++) {
    repo.updateSettings({ footer: "x".repeat(500) + i });
    scheduler.run();
  }

  assert.equal(failures.length, 1);
});

test("os dados continuam corretos em memória depois de uma gravação falhada", () => {
  const { repo, scheduler } = setup({ limit: 120 });

  repo.updateSettings({ restaurant: "Tasca do Manel", footer: "x".repeat(500) });
  scheduler.run();

  assert.equal(repo.getSettings().restaurant, "Tasca do Manel");
});

test("uma gravação falhada é retentada mais tarde", () => {
  const backend = createMemoryBackend();
  const storage = createStorage(backend);
  const scheduler = fakeScheduler();

  let falhar = true;
  const setItem = backend.setItem.bind(backend);
  backend.setItem = (key, value) => {
    if (falhar && key === keys.history) {
      const error = new Error("cheio");
      error.name = "QuotaExceededError";
      throw error;
    }
    setItem(key, value);
  };

  const repo = createRepository({ storage, scheduler, onFailure: () => {} });
  repo.saveDay("2026-07-24", { soup: "Canja", dishes: [], desserts: [] });
  scheduler.run();
  assert.equal(backend.getItem(keys.history), null, "primeira tentativa falhou");

  falhar = false;
  repo.saveDay("2026-07-25", { soup: "Sopa de peixe", dishes: [], desserts: [] });
  scheduler.run();

  const guardado = JSON.parse(backend.getItem(keys.history)).days;
  assert.equal(guardado["2026-07-24"].soup, "Canja", "o dia da tentativa falhada não se perdeu");
  assert.equal(guardado["2026-07-25"].soup, "Sopa de peixe");
});

/* ---------------- Dias ---------------- */

test("gravar um dia vazio remove-o do histórico", () => {
  const { repo } = setup();

  repo.saveDay("2026-07-24", { soup: "Canja", dishes: [], desserts: [] });
  assert.notEqual(repo.getDay("2026-07-24"), null);

  repo.saveDay("2026-07-24", { soup: "", dishes: [], desserts: [] });
  assert.equal(repo.getDay("2026-07-24"), null);
});

test("gravar um dia carimba a hora da alteração", () => {
  const { repo } = setup();
  repo.saveDay("2026-07-24", { soup: "Canja", dishes: [], desserts: [] });
  assert.equal(repo.getDay("2026-07-24").updatedAt, "2026-07-24T12:00:00.000Z");
});

test("getDay devolve cópias, não referências ao estado interno", () => {
  const { repo } = setup();
  repo.saveDay("2026-07-24", { soup: "Canja", dishes: ["Cozido"], desserts: [] });

  const day = repo.getDay("2026-07-24");
  day.soup = "Alterado";

  assert.equal(repo.getDay("2026-07-24").soup, "Canja");
});

/* ---------------- Importação ---------------- */

test("replaceAll troca tudo e grava de imediato", () => {
  const { repo, backend } = setup();

  repo.replaceAll(
    { restaurant: "Nova Tasca" },
    { "2026-07-24": { soup: "Canja", dishes: ["Cozido"], desserts: [] } }
  );

  assert.equal(repo.getSettings().restaurant, "Nova Tasca");
  assert.equal(JSON.parse(backend.getItem(keys.settings)).restaurant, "Nova Tasca");
  assert.equal(JSON.parse(backend.getItem(keys.history)).days["2026-07-24"].soup, "Canja");
});

test("snapshot permite anular uma importação", () => {
  const { repo } = setup();
  repo.replaceAll({ restaurant: "Original" }, { "2026-07-20": { soup: "Canja" } });

  const antes = repo.snapshot();
  repo.replaceAll({ restaurant: "Importado" }, { "2026-07-24": { soup: "Outra" } });
  repo.replaceAll(antes.settings, antes.days);

  assert.equal(repo.getSettings().restaurant, "Original");
  assert.equal(repo.getDay("2026-07-20").soup, "Canja");
  assert.equal(repo.getDay("2026-07-24"), null);
});

test("o snapshot não muda quando o repositório muda a seguir", () => {
  const { repo } = setup();
  repo.saveDay("2026-07-24", { soup: "Canja", dishes: [], desserts: [] });

  const antes = repo.snapshot();
  repo.saveDay("2026-07-25", { soup: "Outra", dishes: [], desserts: [] });

  assert.equal("2026-07-25" in antes.days, false);
});

/* ============================================================
   Migração ao arrancar.

   Quando os dados vêm de outra versão do esquema, gravam-se já na forma nova
   em vez de se esperar por uma alteração do utilizador — quem abre a app e a
   fecha logo a seguir não pode ficar com a migração por concluir.
   ============================================================ */
test("dados de outro esquema são gravados na forma atual logo no arranque", () => {
  const backend = createMemoryBackend({
    [GLOBAL_KEYS.meta]: JSON.stringify({ schemaVersion: SCHEMA_VERSION + 1 }),
    [keys.settings]: JSON.stringify({ restaurant: "Tasca Antiga" }),
    [keys.history]: JSON.stringify({
      days: { "2026-07-20": { soup: "Canja", dishes: ["Cozido"], desserts: [] } },
    }),
  });
  const storage = createStorage(backend);
  const repo = createRepository({ storage, scheduler: fakeScheduler() });

  assert.equal(repo.migratedFrom, SCHEMA_VERSION + 1);
  assert.equal(JSON.parse(backend.getItem(keys.settings)).restaurant, "Tasca Antiga");
  assert.equal(JSON.parse(backend.getItem(GLOBAL_KEYS.meta)).schemaVersion, SCHEMA_VERSION);
});

/* ---------------- Sem armazenamento ---------------- */

test("a app funciona durante a sessão mesmo sem armazenamento", () => {
  const storage = createStorage(null);
  const failures = [];
  const repo = createRepository({
    storage,
    scheduler: fakeScheduler(),
    onFailure: (reason) => failures.push(reason),
  });

  repo.updateSettings({ restaurant: "Tasca" });
  repo.saveDay("2026-07-24", { soup: "Canja", dishes: ["Cozido"], desserts: [] });
  repo.flush();

  assert.equal(repo.getSettings().restaurant, "Tasca");
  assert.equal(repo.getDay("2026-07-24").soup, "Canja");
  assert.deepEqual(failures, [StorageFailure.UNAVAILABLE]);
});
