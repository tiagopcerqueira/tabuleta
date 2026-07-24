import test from "node:test";
import assert from "node:assert/strict";

import { esc, slugify, rememberPhrase, trimmed } from "../src/core/text.js";

test("esc neutraliza todos os caracteres com significado em HTML", () => {
  assert.equal(esc("<script>alert(1)</script>"), "&lt;script&gt;alert(1)&lt;/script&gt;");
  assert.equal(esc("aspas \" e ' plicas"), "aspas &quot; e &#39; plicas");
  assert.equal(esc("Bacalhau & Companhia"), "Bacalhau &amp; Companhia");
  assert.equal(esc(null), "");
  assert.equal(esc(undefined), "");
});

test("esc não consegue ser usado para fechar um atributo", () => {
  const hostil = '" onerror="alert(1)';
  assert.equal(esc(hostil).includes('"'), false);
});

test("esc preserva acentos portugueses", () => {
  assert.equal(esc("Bacalhau à Brás com ovo"), "Bacalhau à Brás com ovo");
});

test("slugify produz nomes de ficheiro seguros", () => {
  assert.equal(slugify("Tasca do Manel"), "tasca-do-manel");
  assert.equal(slugify("Café  São  João"), "cafe-sao-joao");
  assert.equal(slugify("  Ó Balcão!  "), "o-balcao");
  assert.equal(slugify("Restaurante  ---  2"), "restaurante-2");
});

test("slugify devolve vazio quando não sobra nada utilizável", () => {
  assert.equal(slugify("!!!"), "");
  assert.equal(slugify("   "), "");
  assert.equal(slugify(null), "");
});

test("rememberPhrase põe a frase mais recente à cabeça", () => {
  const list = rememberPhrase(["Antiga"], "Nova", 20);
  assert.deepEqual(list, ["Nova", "Antiga"]);
});

test("rememberPhrase não duplica ignorando maiúsculas", () => {
  const list = rememberPhrase(["Bom apetite!", "Outra"], "BOM APETITE!", 20);
  assert.deepEqual(list, ["BOM APETITE!", "Outra"]);
});

test("rememberPhrase respeita o limite e ignora frases vazias", () => {
  assert.equal(rememberPhrase(["a", "b", "c"], "d", 3).length, 3);
  assert.deepEqual(rememberPhrase(["a"], "   ", 20), ["a"]);
  assert.deepEqual(rememberPhrase(["a"], null, 20), ["a"]);
});

test("rememberPhrase nunca muta a lista recebida", () => {
  const original = ["a", "b"];
  rememberPhrase(original, "c", 20);
  assert.deepEqual(original, ["a", "b"]);
});

test("trimmed normaliza qualquer entrada para texto sem espaços nas pontas", () => {
  assert.equal(trimmed("  Canja  "), "Canja");
  assert.equal(trimmed(null), "");
  assert.equal(trimmed(undefined), "");
  assert.equal(trimmed(42), "42");
});
