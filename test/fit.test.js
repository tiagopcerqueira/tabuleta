import test from "node:test";
import assert from "node:assert/strict";

import { solveFit, initialFit, shouldWarnAboutFit, FIT_MIN, FIT_MAX } from "../src/core/fit.js";

/** Simula um menu que cabe até um dado fator e transborda acima dele. */
function menuQueCabeAte(limite) {
  return (fit) => fit > limite;
}

test("quando tudo cabe, usa o fator máximo com uma só medição", () => {
  const { fit, steps } = solveFit(() => false);
  assert.equal(fit, FIT_MAX);
  assert.equal(steps, 1);
});

test("quando nada cabe, usa o fator mínimo com duas medições", () => {
  const { fit, steps } = solveFit(() => true);
  assert.equal(fit, FIT_MIN);
  assert.equal(steps, 2);
});

test("encontra o maior fator que ainda cabe", () => {
  for (const limite of [0.5, 0.63, 0.75, 0.9, 1.0, 1.2]) {
    const { fit } = solveFit(menuQueCabeAte(limite));
    assert.ok(fit <= limite, `fit ${fit} não devia exceder o limite ${limite}`);
    assert.ok(limite - fit < 0.02, `fit ${fit} está longe de mais do limite ${limite}`);
  }
});

/* ============================================================
   O motivo desta mudança: a descida linear em passos de 0.02
   fazia até 60 medições, e cada medição forçava o navegador a
   refazer o layout. Isto corria a cada tecla escrita.
   ============================================================ */
test("resolve em poucas medições, mesmo no pior caso", () => {
  for (const limite of [0.46, 0.5, 0.63, 0.75, 0.9, 1.0, 1.27]) {
    const { steps } = solveFit(menuQueCabeAte(limite));
    assert.ok(steps <= 9, `${steps} medições para o limite ${limite} — devia ser bem menos`);
  }
});

test("o resultado nunca sai do intervalo permitido", () => {
  for (const limite of [-1, 0.1, 0.45, 1.28, 5]) {
    const { fit } = solveFit(menuQueCabeAte(limite));
    assert.ok(fit >= FIT_MIN && fit <= FIT_MAX, `fit ${fit} fora do intervalo`);
  }
});

test("uma medição instável não faz o cálculo entrar em ciclo", () => {
  let chamadas = 0;
  const { steps } = solveFit(() => {
    chamadas++;
    return chamadas % 2 === 0;
  });
  assert.ok(steps < 20, "tem de terminar mesmo com medições contraditórias");
});

/* ============================================================
   O palpite por número de itens é o TETO, não um ponto de partida.

   O conteúdo cabe na folha com fatores muito acima do que fica bem composto,
   porque os pratos se distribuem pelo espaço disponível. Deixar a medição
   subir o fator até ao máximo sempre que "cabe" enchia a folha de texto
   enorme e espremido — tecnicamente dentro da página, visualmente pior.
   ============================================================ */
test("o fator nunca sobe acima do teto pedido, mesmo que tudo caiba", () => {
  const { fit } = solveFit(() => false, { max: 0.8 });
  assert.equal(fit, 0.8);
});

test("com o teto baixo, ainda reduz quando não cabe", () => {
  const { fit } = solveFit(menuQueCabeAte(0.6), { max: 0.8 });
  assert.ok(fit <= 0.6);
  assert.ok(fit > 0.55);
});

test("o palpite inicial desce à medida que há mais itens", () => {
  const valores = [1, 5, 7, 9, 12, 20].map(initialFit);
  for (let i = 1; i < valores.length; i++) {
    assert.ok(valores[i] <= valores[i - 1], "mais itens nunca deve dar um fator maior");
  }
  assert.equal(initialFit(0), FIT_MAX);
});

test("o aviso de texto pequeno aparece só abaixo do limiar", () => {
  assert.equal(shouldWarnAboutFit(0.5), true);
  assert.equal(shouldWarnAboutFit(0.61), true);
  assert.equal(shouldWarnAboutFit(0.62), false);
  assert.equal(shouldWarnAboutFit(1.0), false);
});
