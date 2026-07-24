import test from "node:test";
import assert from "node:assert/strict";

import { renderMenuHtml, countVisibleItems } from "../src/core/menu-html.js";

function model(overrides = {}) {
  return {
    kind: "prato",
    restaurant: "Tasca do Manel",
    tagline: "",
    logo: "",
    date: "2026-07-24",
    includes: "Sopa · Pão · Bebida",
    soup: "Caldo verde",
    dishes: ["Bacalhau à Brás"],
    desserts: [],
    price: "9,50 €",
    footer: "Bom apetite!",
    ...overrides,
  };
}

test("o menu do dia mostra restaurante, data, sopa, pratos e preço", () => {
  const html = renderMenuHtml(model());

  assert.match(html, /Tasca do Manel/);
  assert.match(html, /Sexta-feira, 24 de julho de 2026/);
  assert.match(html, /Caldo verde/);
  assert.match(html, /Bacalhau à Brás/);
  assert.match(html, /9,50 €/);
  assert.match(html, /Bom apetite!/);
  assert.match(html, /Prato do Dia/);
});

test("o menu de sobremesas mostra cada sobremesa com o seu preço", () => {
  const html = renderMenuHtml(
    model({
      kind: "sobremesas",
      desserts: [
        { name: "Arroz doce", price: "3,50 €" },
        { name: "Mousse", price: "3 €" },
      ],
    })
  );

  assert.match(html, /Arroz doce/);
  assert.match(html, /3,50 €/);
  assert.match(html, /Mousse/);
  assert.match(html, /Sobremesas do dia/);
});

test("o modo sobremesas não mostra sopa, pratos nem o bloco do menu completo", () => {
  const html = renderMenuHtml(model({ kind: "sobremesas", desserts: [{ name: "Pudim", price: "3 €" }] }));

  assert.doesNotMatch(html, /Caldo verde/);
  assert.doesNotMatch(html, /Bacalhau/);
  assert.doesNotMatch(html, /O menu inclui/);
  assert.doesNotMatch(html, /Menu completo/);
});

test("campos opcionais vazios não deixam blocos vazios na marcação", () => {
  const html = renderMenuHtml(model({ tagline: "", logo: "", price: "", footer: "", soup: "" }));

  assert.doesNotMatch(html, /menu__tagline/);
  assert.doesNotMatch(html, /menu__logo/);
  assert.doesNotMatch(html, /menu__price-box/);
  assert.doesNotMatch(html, /menu__footer/);
  assert.doesNotMatch(html, /menu__soup/);
});

test("sem pratos mostra a sugestão em vez de uma lista vazia", () => {
  const html = renderMenuHtml(model({ dishes: [] }));
  assert.match(html, /menu__empty/);
  assert.match(html, /Escreve os pratos/);
});

test("sem sobremesas mostra a sugestão do modo certo", () => {
  const html = renderMenuHtml(model({ kind: "sobremesas", desserts: [] }));
  assert.match(html, /Escreve as sobremesas/);
});

test("pratos em branco não aparecem no menu", () => {
  const html = renderMenuHtml(model({ dishes: ["Bacalhau", "", "   ", "Bife"] }));
  const contagem = (html.match(/class="menu__dish"/g) || []).length;
  assert.equal(contagem, 2);
});

test("uma data inválida não produz uma linha de data com lixo", () => {
  const html = renderMenuHtml(model({ date: "não-é-data" }));
  assert.doesNotMatch(html, /menu__date/);
});

test("sem nome de restaurante usa um nome de exemplo", () => {
  assert.match(renderMenuHtml(model({ restaurant: "" })), /O Seu Restaurante/);
  assert.match(renderMenuHtml(model({ restaurant: "   " })), /O Seu Restaurante/);
});

test("sem 'o menu inclui' usa o texto por omissão", () => {
  assert.match(renderMenuHtml(model({ includes: "" })), /Prato à escolha/);
});

/* ============================================================
   O nome de um prato é texto escrito por uma pessoa e vai direto
   para innerHTML. Tudo o que venha do utilizador tem de sair
   escapado — incluindo aquilo que tenta fechar um atributo.
   ============================================================ */
test("texto hostil sai escapado em todos os campos", () => {
  const hostil = '<img src=x onerror="alert(1)">';
  const html = renderMenuHtml(
    model({
      restaurant: hostil,
      tagline: hostil,
      soup: hostil,
      includes: hostil,
      dishes: [hostil],
      price: hostil,
      footer: hostil,
    })
  );

  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /&lt;img src=x/);
});

test("texto hostil nas sobremesas sai escapado, no nome e no preço", () => {
  const html = renderMenuHtml(
    model({
      kind: "sobremesas",
      desserts: [{ name: '"><script>alert(1)</script>', price: '"><b>x</b>' }],
    })
  );

  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /<b>x<\/b>/);
});

test("countVisibleItems conta só o que aparece no modo ativo", () => {
  assert.equal(countVisibleItems(model({ dishes: ["A", "B", "", "  "] })), 2);
  assert.equal(
    countVisibleItems(model({ kind: "sobremesas", desserts: [{ name: "A" }, { name: "" }, { name: "B" }] })),
    2
  );
});
