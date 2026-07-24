/* ============================================================
   Editor — listas de pratos e sobremesas, campos, chips e sugestões.

   As listas são recriadas por inteiro a cada render, mas o render agora
   acontece uma vez por frame em vez de a cada tecla, e escrever num campo já
   não recria a lista (o valor está no estado, o campo já o mostra).
   ============================================================ */

import { esc } from "../core/text.js";
import { TEMPLATES, FORMATS } from "../core/templates.js";

/** O que distingue as duas listas do editor. Tudo o resto é partilhado. */
export const LIST_CONFIG = {
  prato: {
    field: "dishes",
    datalist: "dish-suggestions",
    placeholder: "Nome do prato",
    label: "Prato",
    priced: false,
  },
  sobremesas: {
    field: "desserts",
    datalist: "dessert-suggestions",
    placeholder: "Nome da sobremesa",
    label: "Sobremesa",
    priced: true,
  },
};

export function createEditorView({ elements, actions }) {
  const el = elements;

  function containerFor(kind) {
    return kind === "sobremesas" ? el.dessertsList : el.dishes;
  }

  function countNodeFor(kind) {
    return kind === "sobremesas" ? el.dessertCount : el.dishCount;
  }

  /* ---------------- Listas ---------------- */

  function buildRow(kind, item, index, total) {
    const cfg = LIST_CONFIG[kind];
    const name = cfg.priced ? item.name || "" : item;

    const row = document.createElement("div");
    row.className = "dish-row" + (cfg.priced ? " dish-row--priced" : "");

    // inputmode="decimal" faz aparecer o teclado numérico no telemóvel. Escrever
    // "3,50 €" com teclado alfabético, todos os dias, é atrito a sério.
    const priceField = cfg.priced
      ? `<input type="text" class="dish-price" inputmode="decimal" value="${esc(item.price || "")}" placeholder="€" aria-label="Preço da sobremesa ${index + 1}" />`
      : "";

    row.innerHTML = `
      <span class="dish-row__num">${index + 1}.</span>
      <input type="text" class="dish-name" list="${cfg.datalist}" value="${esc(name)}"
             placeholder="${esc(cfg.placeholder)}" aria-label="${esc(cfg.label)} ${index + 1}"
             autocapitalize="sentences" autocomplete="off" spellcheck="false" />
      ${priceField}
      <button class="dish-move" type="button" data-dir="-1" ${index === 0 ? "disabled" : ""}
              title="Mover para cima" aria-label="Mover ${esc(cfg.label.toLowerCase())} ${index + 1} para cima">▲</button>
      <button class="dish-move" type="button" data-dir="1" ${index === total - 1 ? "disabled" : ""}
              title="Mover para baixo" aria-label="Mover ${esc(cfg.label.toLowerCase())} ${index + 1} para baixo">▼</button>
      <button class="dish-remove" type="button"
              title="Remover ${esc(cfg.label.toLowerCase())}" aria-label="Remover ${esc(cfg.label.toLowerCase())} ${index + 1}">✕</button>
    `;

    const nameInput = row.querySelector(".dish-name");
    nameInput.addEventListener("input", (event) => actions.setItemName(kind, index, event.target.value));
    nameInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        actions.insertItemAfter(kind, index);
      }
    });

    if (cfg.priced) {
      row
        .querySelector(".dish-price")
        .addEventListener("input", (event) => actions.setItemPrice(kind, index, event.target.value));
    }

    row.querySelectorAll(".dish-move").forEach((button) => {
      const dir = Number(button.getAttribute("data-dir"));
      button.addEventListener("click", () => actions.moveItem(kind, index, dir));
    });

    row.querySelector(".dish-remove").addEventListener("click", () => actions.removeItem(kind, index));

    return row;
  }

  /**
   * `focusIndex` devolve o cursor ao campo certo depois de a lista ser
   * recriada — sem isto, criar uma linha com Enter perdia o foco.
   */
  function renderList(state, kind, focusIndex = null) {
    const cfg = LIST_CONFIG[kind];
    const container = containerFor(kind);
    if (!container) return;

    const items = state[cfg.field] || [];
    const fragment = document.createDocumentFragment();
    items.forEach((item, index) => fragment.appendChild(buildRow(kind, item, index, items.length)));

    container.innerHTML = "";
    container.appendChild(fragment);

    const countNode = countNodeFor(kind);
    if (countNode) {
      const filled = cfg.priced
        ? items.filter((item) => (item.name || "").trim()).length
        : items.filter((item) => (item || "").trim()).length;
      countNode.textContent = String(filled);
    }

    if (focusIndex !== null) {
      const inputs = container.querySelectorAll(".dish-name");
      inputs[focusIndex]?.focus();
    }
  }

  function renderLists(state, focus = null) {
    renderList(state, "prato", focus?.kind === "prato" ? focus.index : null);
    renderList(state, "sobremesas", focus?.kind === "sobremesas" ? focus.index : null);
  }

  /**
   * Atualiza só as contagens.
   *
   * Escrever o nome de um prato muda a contagem mas não a estrutura da lista.
   * Recriar as linhas nesse caso faria o cursor saltar para fora do campo a
   * cada tecla e fecharia o menu de sugestões — por isso a contagem tem um
   * caminho próprio, que não toca nos campos.
   */
  function updateCounts(state) {
    for (const kind of Object.keys(LIST_CONFIG)) {
      const cfg = LIST_CONFIG[kind];
      const node = countNodeFor(kind);
      if (!node) continue;
      const items = state[cfg.field] || [];
      const filled = cfg.priced
        ? items.filter((item) => (item.name || "").trim()).length
        : items.filter((item) => (item || "").trim()).length;
      node.textContent = String(filled);
    }
  }

  /* ---------------- Campos simples ---------------- */

  function fillFields(state) {
    el.restaurant.value = state.restaurant;
    el.tagline.value = state.tagline;
    el.date.value = state.date;
    el.soup.value = state.soup;
    el.price.value = state.price;
    el.includes.value = state.includes;
    el.footer.value = state.footer;
    el.editor.setAttribute("data-kind", state.kind);
  }

  /* ---------------- Interruptores ---------------- */

  function renderKindToggle(state) {
    el.kindToggle?.querySelectorAll(".kind-btn").forEach((button) => {
      const active = button.getAttribute("data-kind") === state.kind;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    el.editor.setAttribute("data-kind", state.kind);
  }

  function renderFormatToggle(state) {
    el.formatToggle?.querySelectorAll(".format-btn").forEach((button) => {
      const active = button.getAttribute("data-format") === state.format;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function renderTemplates(state) {
    if (!el.templates) return;
    const active = state.format === "story" ? state.templateStory : state.templatePrint;
    const fragment = document.createDocumentFragment();

    (TEMPLATES[state.format] || TEMPLATES.print).forEach((template) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "template-chip" + (active === template.id ? " is-active" : "");
      chip.setAttribute("aria-pressed", String(active === template.id));
      chip.innerHTML = `<span class="theme-swatch" style="background:${esc(template.color)}"></span>${esc(template.label)}`;
      chip.addEventListener("click", () => actions.selectTemplate(template.id));
      fragment.appendChild(chip);
    });

    el.templates.innerHTML = "";
    el.templates.appendChild(fragment);
  }

  /* ---------------- Logótipo ---------------- */

  function renderLogo(state) {
    if (!el.logoPreview) return;
    if (state.logo) {
      el.logoPreview.innerHTML = `<img src="${esc(state.logo)}" alt="" />`;
      if (el.btnLogoRemove) el.btnLogoRemove.hidden = false;
    } else {
      el.logoPreview.innerHTML = `<span>Sem logótipo</span>`;
      if (el.btnLogoRemove) el.btnLogoRemove.hidden = true;
    }
  }

  /* ---------------- Sugestões ---------------- */

  function fillDatalist(node, values) {
    if (!node) return;
    node.innerHTML = values.map((value) => `<option value="${esc(value)}"></option>`).join("");
  }

  function renderSuggestions({ dishes, soups, desserts }) {
    fillDatalist(el.dishSuggestions, dishes);
    fillDatalist(el.soupSuggestions, soups);
    fillDatalist(el.dessertSuggestions, desserts);
  }

  function renderPhraseSuggestions(state) {
    fillDatalist(el.restaurantSuggestions, state.restaurantHistory);
    fillDatalist(el.taglineSuggestions, state.taglineHistory);
    fillDatalist(el.footerSuggestions, state.footerHistory);
  }

  return {
    fillFields,
    renderList,
    renderLists,
    updateCounts,
    renderKindToggle,
    renderFormatToggle,
    renderTemplates,
    renderLogo,
    renderSuggestions,
    renderPhraseSuggestions,
    FORMATS,
  };
}
