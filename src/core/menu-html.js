/* ============================================================
   Marcação do menu.

   Função pura: recebe o conteúdo, devolve HTML. Não toca no documento, o que
   permite verificar em teste que o nome do restaurante aparece, que os preços
   das sobremesas não se perdem e que texto hostil sai escapado — sem browser.

   Os dois modos (prato do dia / sobremesas) partilham cabeçalho, divisória,
   data e rodapé; só o corpo muda.
   ============================================================ */

import { esc } from "./text.js";
import { formatDatePT } from "./date.js";
import { DEFAULT_INCLUDES } from "./settings.js";

const EMPTY_HINT = {
  prato: "Escreve os pratos disponíveis no editor à esquerda para veres o menu aparecer aqui.",
  sobremesas: "Escreve as sobremesas de hoje no editor à esquerda para veres o menu aparecer aqui.",
};

function header(model) {
  const restaurant = (model.restaurant || "").trim() || "O Seu Restaurante";
  const tagline = (model.tagline || "").trim();
  return `<header class="menu__header">
      ${model.logo ? `<img class="menu__logo" src="${esc(model.logo)}" alt="" />` : ""}
      <h1 class="menu__restaurant">${esc(restaurant)}</h1>
      ${tagline ? `<p class="menu__tagline">${esc(tagline)}</p>` : ""}
    </header>`;
}

function dateLine(model) {
  const formatted = formatDatePT(model.date);
  return formatted ? `<p class="menu__date">${esc(formatted)}</p>` : "";
}

function footer(model) {
  const text = (model.footer || "").trim();
  return text ? `<footer class="menu__footer">${esc(text)}</footer>` : "";
}

function emptyBlock(kind) {
  return `<p class="menu__empty">${esc(EMPTY_HINT[kind])}</p>`;
}

function dessertsBody(model) {
  const desserts = (model.desserts || []).filter((d) => (d.name || "").trim());
  if (desserts.length === 0) return emptyBlock("sobremesas");

  const items = desserts
    .map((dessert) => {
      const price = (dessert.price || "").trim();
      return `<div class="menu__dish menu__dish--priced"><span class="menu__dish-name">${esc(dessert.name)}</span>${
        price ? `<span class="menu__dish-price">${esc(price)}</span>` : ""
      }</div>`;
    })
    .join("");

  return `<div class="menu__dishes-block">
          <p class="menu__dishes-title">Sobremesas do dia</p>
          <div class="menu__dishes">${items}</div>
        </div>`;
}

function dishesBody(model) {
  const includes = (model.includes || "").trim() || DEFAULT_INCLUDES;
  const soup = (model.soup || "").trim();

  let html = `<div class="menu__includes">
        <p class="menu__includes-label">O menu inclui</p>
        <p class="menu__includes-value">${esc(includes)}</p>
        ${soup ? `<p class="menu__soup"><span>Sopa do dia</span>${esc(soup)}</p>` : ""}
      </div>`;

  const dishes = (model.dishes || []).filter((d) => (d || "").trim());
  if (dishes.length > 0) {
    const items = dishes.map((dish) => `<div class="menu__dish">${esc(dish)}</div>`).join("");
    html += `<div class="menu__dishes-block">
          <p class="menu__dishes-title">Pratos à escolha</p>
          <div class="menu__dishes">${items}</div>
        </div>`;
  } else {
    html += emptyBlock("prato");
  }

  const price = (model.price || "").trim();
  if (price) {
    html += `<div class="menu__price-box">
          <p class="menu__price-label">Menu completo</p>
          <p class="menu__price-value">${esc(price)}</p>
        </div>`;
  }

  return html;
}

/** HTML completo do menu para o modelo dado. */
export function renderMenuHtml(model) {
  const isDesserts = model.kind === "sobremesas";
  return [
    header(model),
    `<div class="menu__rule"><i></i></div>`,
    `<p class="menu__eyebrow">${isDesserts ? "Sobremesas" : "Prato do Dia"}</p>`,
    dateLine(model),
    isDesserts ? dessertsBody(model) : dishesBody(model),
    footer(model),
  ].join("");
}

/** Número de itens visíveis no modo ativo — determina o palpite inicial do encaixe. */
export function countVisibleItems(model) {
  if (model.kind === "sobremesas") {
    return (model.desserts || []).filter((d) => (d.name || "").trim()).length;
  }
  return (model.dishes || []).filter((d) => (d || "").trim()).length;
}
