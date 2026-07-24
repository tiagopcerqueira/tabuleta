import test from "node:test";
import assert from "node:assert/strict";

import {
  defaultSettings,
  sanitizeSettings,
  extractSettings,
  SETTINGS_KEYS,
  DEFAULT_INCLUDES,
} from "../src/core/settings.js";

test("as definições por omissão cobrem todos os campos declarados", () => {
  const settings = defaultSettings();
  for (const key of SETTINGS_KEYS) {
    assert.ok(key in settings, `falta o campo ${key}`);
  }
});

/* ============================================================
   O invariante que impede o defeito de voltar: os três derivados
   têm de concordar sempre sobre que campos existem. Era a divergência
   entre eles que deixava a importação a tratar sobremesas como texto.
   ============================================================ */
test("omissões, sanitização e extração concordam sobre o conjunto de campos", () => {
  const chaves = (o) => Object.keys(o).sort();
  assert.deepEqual(chaves(sanitizeSettings({})), chaves(defaultSettings()));
  assert.deepEqual(chaves(extractSettings(defaultSettings())), chaves(defaultSettings()));
});

test("sanitizar as definições por omissão não as altera", () => {
  assert.deepEqual(sanitizeSettings(defaultSettings()), defaultSettings());
});

test("sanitizeSettings recupera de qualquer entrada", () => {
  for (const bad of [null, undefined, 42, "texto", []]) {
    assert.deepEqual(sanitizeSettings(bad), defaultSettings());
  }
});

test("campos com valores inválidos caem no valor por omissão", () => {
  const settings = sanitizeSettings({
    kind: "inexistente",
    format: "inexistente",
    templatePrint: "inexistente",
    templateStory: "inexistente",
    restaurant: 42,
    includes: "   ",
  });

  assert.equal(settings.kind, "prato");
  assert.equal(settings.format, "print");
  assert.equal(settings.templatePrint, "classico");
  assert.equal(settings.templateStory, "ardosia");
  assert.equal(settings.restaurant, "");
  assert.equal(settings.includes, DEFAULT_INCLUDES);
});

test("campos com valores válidos são preservados", () => {
  const settings = sanitizeSettings({
    kind: "sobremesas",
    format: "story",
    templatePrint: "bistro",
    templateStory: "vibrante",
    restaurant: "Tasca do Manel",
    includes: "Sopa e pão",
  });

  assert.equal(settings.kind, "sobremesas");
  assert.equal(settings.format, "story");
  assert.equal(settings.templatePrint, "bistro");
  assert.equal(settings.templateStory, "vibrante");
  assert.equal(settings.restaurant, "Tasca do Manel");
  assert.equal(settings.includes, "Sopa e pão");
});

/* ============================================================
   O logótipo acaba num <img src>. Numa app cuja promessa central é
   que nada sai do dispositivo, aceitar um URL arbitrário vindo de um
   ficheiro de backup significaria fazer um pedido de rede em silêncio.
   ============================================================ */
test("o logótipo só aceita imagens embebidas no próprio dispositivo", () => {
  const valido = "data:image/png;base64,iVBORw0KGgo=";
  assert.equal(sanitizeSettings({ logo: valido }).logo, valido);
  assert.equal(sanitizeSettings({ logo: "data:image/webp;base64,AAAA" }).logo, "data:image/webp;base64,AAAA");
});

test("o logótipo rejeita tudo o que possa contactar a rede", () => {
  const hostis = [
    "https://exemplo.com/rastreio.png",
    "http://exemplo.com/pixel.gif",
    "//exemplo.com/x.png",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "data:application/json,{}",
    42,
    null,
  ];
  for (const hostil of hostis) {
    assert.equal(sanitizeSettings({ logo: hostil }).logo, "", `logo: ${JSON.stringify(hostil)}`);
  }
});

test("as listas de sugestões descartam entradas que não sejam texto", () => {
  const settings = sanitizeSettings({ restaurantHistory: ["Bom", 42, null, "Outro"] });
  assert.deepEqual(settings.restaurantHistory, ["Bom", "Outro"]);
});

test("as listas de sugestões não crescem sem limite", () => {
  const enorme = Array.from({ length: 500 }, (_, i) => `Frase ${i}`);
  assert.equal(sanitizeSettings({ footerHistory: enorme }).footerHistory.length, 20);
});

test("extractSettings copia listas em vez de as partilhar", () => {
  const original = defaultSettings();
  original.restaurantHistory.push("Tasca");
  const copia = extractSettings(original);
  copia.restaurantHistory.push("Outra");
  assert.deepEqual(original.restaurantHistory, ["Tasca"]);
});

test("extractSettings ignora campos que não pertencem às definições", () => {
  const estado = { ...defaultSettings(), soup: "Canja", dishes: ["Cozido"], date: "2026-07-24" };
  const settings = extractSettings(estado);
  assert.equal("soup" in settings, false);
  assert.equal("dishes" in settings, false);
  assert.equal("date" in settings, false);
});
