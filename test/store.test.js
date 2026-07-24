import test from "node:test";
import assert from "node:assert/strict";

import { createStore } from "../src/app/store.js";

/** Frames manuais: o render só acontece quando o teste o mandar. */
function fakeFrames() {
  let seq = 0;
  const pending = new Map();
  return {
    scheduleFrame(fn) {
      pending.set(++seq, fn);
      return seq;
    },
    cancelFrame(id) {
      pending.delete(id);
    },
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

function setup(initial = { a: 1, b: 2 }) {
  const frames = fakeFrames();
  const store = createStore(initial, frames);
  const renders = [];
  store.subscribe((state, changed) => renders.push({ state: { ...state }, changed: [...changed].sort() }));
  return { store, frames, renders };
}

test("setState altera o estado de imediato", () => {
  const { store } = setup();
  store.setState({ a: 9 });
  assert.equal(store.getState().a, 9);
});

/* ============================================================
   A razão de ser do store: dez alterações seguidas produzem UM
   render, não dez. Antes, cada tecla escrita redesenhava o menu
   inteiro de forma síncrona.
   ============================================================ */
test("várias alterações no mesmo frame produzem um só render", () => {
  const { store, frames, renders } = setup();

  store.setState({ a: 2 });
  store.setState({ a: 3 });
  store.setState({ b: 4 });

  assert.equal(renders.length, 0, "nada deve ser desenhado antes do frame");
  frames.run();
  assert.equal(renders.length, 1);
  assert.deepEqual(renders[0].changed, ["a", "b"]);
  assert.equal(renders[0].state.a, 3);
});

test("gravar o mesmo valor não desencadeia render", () => {
  const { store, frames, renders } = setup();

  store.setState({ a: 1 });
  frames.run();

  assert.equal(renders.length, 0);
});

test("os campos alterados chegam ao listener", () => {
  const { store, frames, renders } = setup();
  store.setState({ b: 99 });
  frames.run();
  assert.deepEqual(renders[0].changed, ["b"]);
});

test("setState aceita uma função do estado atual", () => {
  const { store } = setup({ contador: 0 });
  store.setState((state) => ({ contador: state.contador + 1 }));
  store.setState((state) => ({ contador: state.contador + 1 }));
  assert.equal(store.getState().contador, 2);
});

test("immediate desenha sem esperar pelo frame", () => {
  const { store, renders } = setup();
  store.setState({ a: 5 }, { immediate: true });
  assert.equal(renders.length, 1);
});

test("um listener com chaves só corre quando essas chaves mudam", () => {
  const frames = fakeFrames();
  const store = createStore({ a: 1, b: 2 }, frames);
  const chamadas = [];
  store.subscribe(() => chamadas.push("a"), ["a"]);

  store.setState({ b: 9 });
  frames.run();
  assert.equal(chamadas.length, 0);

  store.setState({ a: 9 });
  frames.run();
  assert.equal(chamadas.length, 1);
});

test("invalidate desenha sem alterar o estado", () => {
  const { store, frames, renders } = setup();

  store.invalidate("historico");
  frames.run();

  assert.equal(renders.length, 1);
  assert.deepEqual(renders[0].changed, ["historico"]);
});

test("cancelar a subscrição pára os renders", () => {
  const frames = fakeFrames();
  const store = createStore({ a: 1 }, frames);
  const chamadas = [];
  const unsubscribe = store.subscribe(() => chamadas.push(1));

  store.setState({ a: 2 });
  frames.run();
  unsubscribe();
  store.setState({ a: 3 });
  frames.run();

  assert.equal(chamadas.length, 1);
});

test("alterações acumuladas entre frames não se perdem", () => {
  const { store, frames, renders } = setup();

  store.setState({ a: 2 });
  store.setState({ b: 3 });
  frames.run();

  assert.deepEqual(renders[0].changed, ["a", "b"]);
});

test("flush desenha o que estiver pendente e limpa a fila", () => {
  const { store, frames, renders } = setup();

  store.setState({ a: 2 });
  store.flush();
  assert.equal(renders.length, 1);

  frames.run();
  assert.equal(renders.length, 1, "o frame agendado não deve desenhar outra vez");
});

test("o estado é copiado, não partilhado", () => {
  const inicial = { a: 1 };
  const store = createStore(inicial, fakeFrames());
  store.setState({ a: 2 });
  assert.equal(inicial.a, 1);
});
