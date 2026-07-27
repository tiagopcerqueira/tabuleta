/* ============================================================
   Marcação do menu.

   Função pura: recebe o conteúdo, devolve HTML. Não toca no documento, o que
   permite verificar em teste que o nome do restaurante aparece, que os preços
   das sobremesas não se perdem e que texto hostil sai escapado — sem browser.

   A peça tem sempre a mesma anatomia — marca, título, corpo, preço, frase —
   e é a mesma nos dois modos (prato do dia / sobremesas). O que muda com o
   formato é QUANTO se mostra:

   - na folha A4 o cliente está parado à frente do menu e pode ler tudo:
     data, sopa, pratos, preço e o que o preço inclui;
   - no story tem um segundo e o polegar a andar, por isso fica só o
     essencial — marca, título, sopa, pratos, preços — e uma frase discreta
     no fim. A data sai (um story dura um dia) e o "menu inclui" também.
   ============================================================ */

import { esc } from "./text.js";
import { formatDatePT } from "./date.js";
import { DEFAULT_INCLUDES } from "./settings.js";

const EMPTY_HINT = {
  prato: "Escreve os pratos disponíveis no editor à esquerda para veres o menu aparecer aqui.",
  sobremesas: "Escreve as sobremesas de hoje no editor à esquerda para veres o menu aparecer aqui.",
};

const TITLE = { prato: "Prato do Dia", sobremesas: "Sobremesas" };

/** A marca: logótipo, nome e (só no papel) a frase de assinatura. */
function header(model, story) {
  const restaurant = (model.restaurant || "").trim() || "O Seu Restaurante";
  const tagline = story ? "" : (model.tagline || "").trim();
  return `<header class="menu__header">
      ${model.logo ? `<img class="menu__logo" src="${esc(model.logo)}" alt="" />` : ""}
      <h1 class="menu__restaurant">${esc(restaurant)}</h1>
      ${tagline ? `<p class="menu__tagline">${esc(tagline)}</p>` : ""}
    </header>`;
}

/** O que é a peça e de que dia é — duas linhas curtas, coladas uma à outra. */
function title(model, story) {
  const date = story ? "" : formatDatePT(model.date);
  return `<div class="menu__title">
      <p class="menu__eyebrow">${TITLE[model.kind] || TITLE.prato}</p>
      ${date ? `<p class="menu__date">${esc(date)}</p>` : ""}
    </div>`;
}

function emptyBlock(kind) {
  return `<p class="menu__empty">${esc(EMPTY_HINT[kind])}</p>`;
}

function soupBlock(model) {
  const soup = (model.soup || "").trim();
  if (!soup) return "";
  return `<section class="menu__soup">
      <p class="menu__label">Sopa do dia</p>
      <p class="menu__soup-name">${esc(soup)}</p>
    </section>`;
}

function dishesBlock(model) {
  const dishes = (model.dishes || []).filter((d) => (d || "").trim());
  if (dishes.length === 0) return emptyBlock("prato");

  const items = dishes.map((dish) => `<div class="menu__dish">${esc(dish)}</div>`).join("");
  return `<section class="menu__dishes-block">
      <p class="menu__label">Pratos à escolha</p>
      <div class="menu__dishes">${items}</div>
    </section>`;
}

/**
 * Sobremesas: nome à esquerda, preço à direita, filete a ligar os dois.
 *
 * O filete é o que faz o olho chegar do nome ao preço certo quando há vários
 * — é a convenção de qualquer ementa impressa, e vale tanto no papel como no
 * telemóvel.
 */
function dessertsBlock(model) {
  const desserts = (model.desserts || []).filter((d) => (d.name || "").trim());
  if (desserts.length === 0) return emptyBlock("sobremesas");

  const items = desserts
    .map((dessert) => {
      const price = (dessert.price || "").trim();
      return `<div class="menu__dish menu__dish--priced"><span class="menu__dish-name">${esc(
        dessert.name
      )}</span><span class="menu__dish-leader"></span>${
        price ? `<span class="menu__dish-price">${esc(price)}</span>` : ""
      }</div>`;
    })
    .join("");

  // Sem rótulo: o título da peça, duas linhas acima, já diz "Sobremesas".
  // Repeti-lo aqui era pedir ao cliente que lesse duas vezes a mesma coisa.
  return `<section class="menu__dishes-block">
      <div class="menu__dishes">${items}</div>
    </section>`;
}

/**
 * O preço e, logo por baixo, aquilo que ele inclui.
 *
 * Estavam em pontas opostas da folha: o "menu inclui" no topo, como se fosse
 * um cabeçalho, e o preço lá em baixo. Mas a lista só existe para responder à
 * pergunta que o preço levanta — juntá-los é o que a torna legível de relance.
 */
function priceBlock(model, story) {
  const price = (model.price || "").trim();
  const includes = story ? "" : (model.includes || "").trim() || DEFAULT_INCLUDES;

  // Sem preço, o que o menu inclui continua a ser informação útil — fica
  // sozinho no lugar do bloco. Quando estava dentro do bloco do preço,
  // deixar o preço em branco fazia a linha desaparecer com ele.
  if (!price) return includes ? `<p class="menu__includes menu__includes--alone">${esc(includes)}</p>` : "";

  return `<section class="menu__price-box">
      <p class="menu__price-label">Menu completo</p>
      <p class="menu__price-value">${esc(price)}</p>
      ${includes ? `<p class="menu__includes">${esc(includes)}</p>` : ""}
    </section>`;
}

/**
 * A frase do fim. No story não há espaço para duas frases, por isso a nota de
 * rodapé fala pelas duas — e se não houver nota, é a assinatura da casa que
 * fica, em vez de a marca perder a voz.
 */
function footer(model, story) {
  const text = (model.footer || "").trim() || (story ? (model.tagline || "").trim() : "");
  return text ? `<footer class="menu__footer">${esc(text)}</footer>` : "";
}

/** HTML completo do menu para o modelo dado. */
export function renderMenuHtml(model) {
  const isDesserts = model.kind === "sobremesas";
  const story = model.format === "story";

  return [
    header(model, story),
    title(model, story),
    `<div class="menu__body">`,
    isDesserts ? dessertsBlock(model) : soupBlock(model) + dishesBlock(model),
    `</div>`,
    isDesserts ? "" : priceBlock(model, story),
    footer(model, story),
  ].join("");
}

/** Número de itens visíveis no modo ativo — determina o palpite inicial do encaixe. */
export function countVisibleItems(model) {
  if (model.kind === "sobremesas") {
    return (model.desserts || []).filter((d) => (d.name || "").trim()).length;
  }
  return (model.dishes || []).filter((d) => (d || "").trim()).length;
}
