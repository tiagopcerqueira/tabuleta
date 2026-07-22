/* ============================================================
   Prato do Dia — lógica da aplicação
   App estática, sem dependências (exceto html2canvas p/ imagem).
   Guarda no navegador (localStorage). Funciona offline.
   ============================================================ */

(function () {
  "use strict";

  const STORAGE_KEY = "prato-do-dia:v2";
  const UI_THEME_KEY = "prato-do-dia:ui-theme";
  const HISTORY_KEY = "prato-do-dia:history:v1";
  const DEFAULT_INCLUDES = "Sopa · Pão · Bebida · Café · Prato à escolha";
  const HISTORY_MAX_DAYS = 60; // poda o histórico às 60 datas mais recentes
  const MAX_DISH_SUGGESTIONS = 80;
  const MAX_SOUP_SUGGESTIONS = 30;

  const THEMES = [
    { id: "azulejo", label: "Azulejo", color: "#1c5b86" },
    { id: "linho", label: "Linho", color: "#4a5a3c" },
    { id: "ardosia", label: "Ardósia", color: "#232a2d" },
    { id: "horta", label: "Horta", color: "#2f6b43" },
  ];

  function defaultState() {
    return {
      restaurant: "",
      tagline: "",
      date: todayISO(),
      soup: "",
      dishes: ["", "", ""], // pratos disponíveis (nº variável)
      price: "",
      includes: DEFAULT_INCLUDES,
      footer: "Bom apetite!",
      theme: "azulejo",
    };
  }

  let state = migrate(load()) || defaultState();

  /* ---------------- Utilidades ---------------- */
  function todayISO() {
    const d = new Date();
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
  }

  function formatDatePT(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return "";
    const dias = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const dt = new Date(y, m - 1, d);
    return `${dias[dt.getDay()]}, ${d} de ${meses[m - 1]} de ${y}`;
  }

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;"); // também usado em atributos (value="…")
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* localStorage indisponível — ignora */
    }
    saveHistory();
    rebuildSuggestions();
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  // Garante que dados guardados têm sempre os campos esperados
  function migrate(s) {
    if (!s) return null;
    if (!Array.isArray(s.dishes)) s.dishes = ["", "", ""];
    if (typeof s.includes !== "string" || !s.includes) s.includes = DEFAULT_INCLUDES;
    if (typeof s.soup !== "string") s.soup = "";
    // temas antigos → novos
    if (!THEMES.some((t) => t.id === s.theme)) s.theme = "azulejo";
    return s;
  }

  /* ---------------- Histórico de menus (p/ "copiar de ontem" e sugestões) ---------------- */
  function loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const data = raw ? JSON.parse(raw) : null;
      if (!data || typeof data !== "object" || !data.days || typeof data.days !== "object") {
        return { days: {} };
      }
      return data;
    } catch (e) {
      return { days: {} };
    }
  }

  // Grava o dia atual no histórico (poda o dia se ficar vazio) e limita a 60 datas
  function saveHistory() {
    try {
      const history = loadHistory();
      const soup = (state.soup || "").trim();
      const dishes = state.dishes.map((d) => d.trim()).filter((d) => d);
      if (!soup && dishes.length === 0) {
        delete history.days[state.date];
      } else {
        history.days[state.date] = { soup: soup, dishes: dishes };
      }
      const dates = Object.keys(history.days).sort(); // ISO ordena bem lexicograficamente
      while (dates.length > HISTORY_MAX_DAYS) {
        delete history.days[dates.shift()];
      }
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      /* localStorage indisponível — ignora */
    }
  }

  /* ---------------- Referências ao DOM ---------------- */
  const el = {
    restaurant: document.getElementById("in-restaurant"),
    tagline: document.getElementById("in-tagline"),
    date: document.getElementById("in-date"),
    soup: document.getElementById("in-soup"),
    price: document.getElementById("in-price"),
    includes: document.getElementById("in-includes"),
    footer: document.getElementById("in-footer"),
    dishes: document.getElementById("dishes"),
    dishCount: document.getElementById("dish-count"),
    dishSuggestions: document.getElementById("dish-suggestions"),
    soupSuggestions: document.getElementById("soup-suggestions"),
    btnCopyPrev: document.getElementById("btn-copy-prev"),
    themes: document.getElementById("themes"),
    menu: document.getElementById("menu"),
    addDish: document.getElementById("btn-add-dish"),
    btnPrint: document.getElementById("btn-print"),
    btnImage: document.getElementById("btn-image"),
    btnClear: document.getElementById("btn-clear"),
    btnTheme: document.getElementById("btn-theme"),
    modal: document.getElementById("pd-modal"),
    modalBackdrop: document.getElementById("pd-modal-backdrop"),
    modalClose: document.getElementById("pd-modal-close"),
    modalHint: document.getElementById("pd-modal-hint"),
    modalImg: document.getElementById("pd-modal-img"),
    modalDownload: document.getElementById("pd-modal-download"),
    modalPrint: document.getElementById("pd-modal-print"),
    fitWarning: document.getElementById("fit-warning"),
  };

  /* ---------------- Preencher o editor ---------------- */
  function fillEditor() {
    el.restaurant.value = state.restaurant;
    el.tagline.value = state.tagline;
    el.date.value = state.date;
    el.soup.value = state.soup;
    el.price.value = state.price;
    el.includes.value = state.includes;
    el.footer.value = state.footer;
    renderDishes();
    renderThemes();
  }

  // Mantém o foco no mesmo prato enquanto se escreve (não recria a lista toda)
  function renderDishes(focusIndex) {
    el.dishes.innerHTML = "";
    state.dishes.forEach((name, i) => {
      const row = document.createElement("div");
      row.className = "dish-row";
      row.innerHTML = `
        <span class="dish-row__num">${i + 1}.</span>
        <input type="text" class="dish-name" list="dish-suggestions" value="${esc(name)}" placeholder="Nome do prato" aria-label="Prato ${i + 1}" />
        <button class="dish-move" type="button" data-dir="-1" title="Mover para cima" aria-label="Mover prato para cima">▲</button>
        <button class="dish-move" type="button" data-dir="1" title="Mover para baixo" aria-label="Mover prato para baixo">▼</button>
        <button class="dish-remove" type="button" title="Remover prato">✕</button>
      `;
      const input = row.querySelector(".dish-name");
      input.addEventListener("input", (e) => {
        state.dishes[i] = e.target.value;
        onChange(false);
      });
      // Enter cria um novo prato a seguir
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          state.dishes.splice(i + 1, 0, "");
          renderDishes(i + 1);
          onChange(false);
        }
      });
      // Botões de reordenar
      row.querySelectorAll(".dish-move").forEach((btn) => {
        const dir = parseInt(btn.getAttribute("data-dir"), 10);
        const isFirst = i === 0;
        const isLast = i === state.dishes.length - 1;
        if ((dir === -1 && isFirst) || (dir === 1 && isLast)) {
          btn.disabled = true;
        }
        btn.addEventListener("click", () => {
          const newIndex = i + dir;
          const temp = state.dishes[i];
          state.dishes[i] = state.dishes[newIndex];
          state.dishes[newIndex] = temp;
          renderDishes(newIndex);
          onChange(false);
        });
      });
      row.querySelector(".dish-remove").addEventListener("click", () => {
        state.dishes.splice(i, 1);
        if (state.dishes.length === 0) state.dishes.push("");
        renderDishes();
        onChange(false);
      });
      el.dishes.appendChild(row);
    });
    updateDishCount();

    if (focusIndex != null) {
      const inputs = el.dishes.querySelectorAll(".dish-name");
      if (inputs[focusIndex]) inputs[focusIndex].focus();
    }
  }

  function renderThemes() {
    el.themes.innerHTML = "";
    THEMES.forEach((t) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "theme-chip" + (state.theme === t.id ? " is-active" : "");
      chip.innerHTML = `<span class="theme-swatch" style="background:${t.color}"></span>${t.label}`;
      chip.addEventListener("click", () => {
        state.theme = t.id;
        renderThemes();
        onChange(false);
      });
      el.themes.appendChild(chip);
    });
  }

  // Reconstrói os <datalist> de sugestões a partir do histórico (exclui o dia atual)
  function rebuildSuggestions() {
    if (!el.dishSuggestions || !el.soupSuggestions) return;
    const history = loadHistory();
    const dates = Object.keys(history.days)
      .filter((d) => d !== state.date)
      .sort()
      .reverse(); // mais recentes primeiro

    const dishSeen = new Set();
    const dishList = [];
    const soupSeen = new Set();
    const soupList = [];

    dates.forEach((date) => {
      const day = history.days[date];
      if (!day) return;
      const soup = String(day.soup || "").trim();
      if (soup && soupList.length < MAX_SOUP_SUGGESTIONS) {
        const key = soup.toLowerCase();
        if (!soupSeen.has(key)) {
          soupSeen.add(key);
          soupList.push(soup);
        }
      }
      (Array.isArray(day.dishes) ? day.dishes : []).forEach((dish) => {
        if (dishList.length >= MAX_DISH_SUGGESTIONS) return;
        const name = String(dish || "").trim();
        if (!name) return;
        const key = name.toLowerCase();
        if (!dishSeen.has(key)) {
          dishSeen.add(key);
          dishList.push(name);
        }
      });
    });

    el.dishSuggestions.innerHTML = dishList.map((d) => `<option value="${esc(d)}"></option>`).join("");
    el.soupSuggestions.innerHTML = soupList.map((s) => `<option value="${esc(s)}"></option>`).join("");
  }

  /* ---------------- Render do menu (pré-visualização) ---------------- */
  function renderMenu() {
    const m = state;
    el.menu.setAttribute("data-theme", m.theme || "taberna");

    const restaurant = m.restaurant.trim() || "O Seu Restaurante";
    let html = `<header class="menu__header">
      <h1 class="menu__restaurant">${esc(restaurant)}</h1>
      ${m.tagline.trim() ? `<p class="menu__tagline">${esc(m.tagline)}</p>` : ""}
    </header>`;

    html += `<div class="menu__rule"><i></i></div>`;
    html += `<p class="menu__eyebrow">Prato do Dia</p>`;
    if (m.date) html += `<p class="menu__date">${esc(formatDatePT(m.date))}</p>`;

    // Bloco "o menu inclui" + sopa
    const includes = m.includes.trim() || DEFAULT_INCLUDES;
    html += `<div class="menu__includes">
      <p class="menu__includes-label">O menu inclui</p>
      <p class="menu__includes-value">${esc(includes)}</p>
      ${m.soup.trim() ? `<p class="menu__soup"><span>Sopa do dia</span>${esc(m.soup)}</p>` : ""}
    </div>`;

    // Pratos disponíveis
    const dishes = m.dishes.filter((d) => d.trim());
    if (dishes.length > 0) {
      html += `<div class="menu__dishes-block">
        <p class="menu__dishes-title">Pratos à escolha</p>
        <div class="menu__dishes">
          ${dishes.map((d) => `<div class="menu__dish">${esc(d)}</div>`).join("")}
        </div>
      </div>`;
    } else {
      html += `<p class="menu__empty">Escreve os pratos disponíveis no editor à esquerda para veres o menu aparecer aqui.</p>`;
    }

    if (m.price.trim()) {
      html += `<div class="menu__price-box">
        <p class="menu__price-label">Menu completo</p>
        <p class="menu__price-value">${esc(m.price)}</p>
      </div>`;
    }

    if (m.footer.trim()) {
      html += `<footer class="menu__footer">${esc(m.footer)}</footer>`;
    }

    el.menu.innerHTML = html;
    autoFit();
  }

  /* ---------------- Auto-ajuste à folha A4 ----------------
     Escolhe um fator inicial pelo nº de pratos (poucos → maior,
     muitos → menor) e depois reduz até caber na página. */
  function autoFit() {
    const menu = el.menu;
    const count = state.dishes.filter((d) => d.trim()).length;

    let fit;
    if (count <= 4) fit = 1.28;
    else if (count <= 6) fit = 1.12;
    else if (count <= 8) fit = 1.0;
    else if (count <= 10) fit = 0.9;
    else if (count <= 13) fit = 0.8;
    else fit = 0.7;

    menu.style.setProperty("--fit", fit.toFixed(3));

    // Reduz enquanto o conteúdo transbordar a folha (garante 1 página)
    let guard = 0;
    while (menu.scrollHeight > menu.clientHeight + 1 && fit > 0.45 && guard < 60) {
      fit -= 0.02;
      menu.style.setProperty("--fit", fit.toFixed(3));
      guard++;
    }

    // Mostrar/esconder aviso de lotação
    if (el.fitWarning) {
      el.fitWarning.hidden = fit >= 0.62;
    }
  }

  /* ---------------- Fluxo de alterações ---------------- */
  function updateDishCount() {
    el.dishCount.textContent = String(state.dishes.filter((d) => d.trim()).length);
  }

  function onChange(rerenderDishes = true) {
    save();
    updateDishCount();
    renderMenu();
    if (rerenderDishes) renderDishes();
  }

  function bindSimpleInputs() {
    const map = [
      ["restaurant", el.restaurant],
      ["tagline", el.tagline],
      ["date", el.date],
      ["soup", el.soup],
      ["price", el.price],
      ["includes", el.includes],
      ["footer", el.footer],
    ];
    map.forEach(([key, node]) => {
      node.addEventListener("input", () => {
        state[key] = node.value;
        onChange(false);
      });
    });
  }

  /* ---------------- Ações ---------------- */
  el.addDish.addEventListener("click", () => {
    state.dishes.push("");
    renderDishes(state.dishes.length - 1);
    onChange(false);
  });

  el.btnPrint.addEventListener("click", printMenu);

  // Copia a sopa e os pratos do menu guardado mais recente anterior à data atual
  el.btnCopyPrev.addEventListener("click", () => {
    const history = loadHistory();
    const prevDate = Object.keys(history.days)
      .filter((d) => d < state.date)
      .sort()
      .pop();
    if (!prevDate) {
      toast("Ainda não há nenhum menu anterior guardado.");
      return;
    }
    const day = history.days[prevDate];
    state.soup = day.soup || "";
    state.dishes = Array.isArray(day.dishes) && day.dishes.length ? day.dishes.slice() : [""];
    el.soup.value = state.soup;
    renderDishes();
    onChange(false);
    toast(`Copiado o menu de ${formatDatePT(prevDate)}.`);
  });

  el.btnClear.addEventListener("click", () => {
    const snapshot = { soup: state.soup, dishes: state.dishes.slice(), date: state.date };
    state.soup = "";
    state.dishes = ["", "", ""];
    state.date = todayISO();
    fillEditor();
    onChange(false);
    toast("Dia limpo.", {
      label: "Anular",
      onClick: function () {
        state.soup = snapshot.soup;
        state.dishes = snapshot.dishes;
        state.date = snapshot.date;
        fillEditor();
        onChange(false);
      },
    });
  });

  el.btnImage.addEventListener("click", exportImage);

  /* ---------------- Modo claro/escuro da app ---------------- */
  function applyUiTheme(mode) {
    // mode: "light" | "dark" | null (segue o sistema)
    if (mode === "light" || mode === "dark") {
      document.documentElement.setAttribute("data-theme", mode);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    const isDark =
      mode === "dark" ||
      (mode == null && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    el.btnTheme.textContent = isDark ? "☀️" : "🌙";
    el.btnTheme.title = isDark ? "Mudar para modo claro" : "Mudar para modo escuro";
  }

  el.btnTheme.addEventListener("click", () => {
    const isDarkNow =
      document.documentElement.getAttribute("data-theme") === "dark" ||
      (!document.documentElement.getAttribute("data-theme") &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    const next = isDarkNow ? "light" : "dark";
    try { localStorage.setItem(UI_THEME_KEY, next); } catch (e) {}
    applyUiTheme(next);
  });

  /* ============================================================
     Gerar imagem / imprimir — robusto em qualquer contexto
     (funciona também dentro da iframe do artefacto, onde as
     transferências e a impressão diretas do navegador estão limitadas)
     ============================================================ */

  var toastTimer = null;
  // action (opcional): { label, onClick } — mostra um botão no toast e prolonga a duração
  function toast(msg, action) {
    var t = document.getElementById("pd-toast");
    if (!t) return;
    t.textContent = "";
    var text = document.createElement("span");
    text.textContent = msg;
    t.appendChild(text);
    if (action && action.label) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pd-toast__action";
      btn.textContent = action.label;
      btn.addEventListener("click", function () {
        if (toastTimer) clearTimeout(toastTimer);
        t.hidden = true;
        if (typeof action.onClick === "function") action.onClick();
      });
      t.appendChild(btn);
    }
    t.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, action ? 8000 : 6000);
  }

  var RESTRICTED_MSG =
    "Aqui na pré-visualização não é possível guardar/imprimir. Abre a app publicada (link) ou o ficheiro em página inteira — aí funciona.";

  function inIframe() {
    try { return window.self !== window.top; } catch (e) { return true; }
  }
  function isTouch() {
    return "ontouchstart" in window || (navigator.maxTouchPoints || 0) > 0;
  }

  // Renderiza o menu para um dataURL PNG
  function renderPng(btn) {
    if (typeof window.html2canvas !== "function") {
      return Promise.reject(new Error("html2canvas indisponível"));
    }
    var prev;
    if (btn) { prev = btn.textContent; btn.textContent = "⏳ A gerar…"; btn.disabled = true; }
    return window
      .html2canvas(el.menu, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false })
      .then(function (canvas) { return canvas.toDataURL("image/png"); })
      .then(
        function (url) { if (btn) { btn.textContent = prev; btn.disabled = false; } return url; },
        function (err) { if (btn) { btn.textContent = prev; btn.disabled = false; } throw err; }
      );
  }

  // Botão "Guardar imagem" → mostra a pré-visualização com opção de guardar
  function exportImage() {
    renderPng(el.btnImage)
      .then(function (url) { openModal(url); })
      .catch(function () { toast(RESTRICTED_MSG); });
  }

  // Botão "Imprimir / PDF"
  function printMenu() {
    // Página normal (alojada ou ficheiro): impressão nativa, texto nítido
    if (!inIframe()) { window.print(); return; }
    // Dentro da iframe do artefacto: imprimir a partir da imagem
    renderPng(el.btnPrint)
      .then(function (url) { printFromImage(url); })
      .catch(function () { toast(RESTRICTED_MSG); });
  }

  // Abre a imagem numa janela A4 e manda imprimir; se falhar, mostra a modal
  function printFromImage(dataUrl) {
    var w = null;
    try { w = window.open("", "_blank"); } catch (e) { w = null; }
    if (w && w.document) {
      w.document.write(
        '<!doctype html><html><head><meta charset="utf-8"><title>Prato do Dia</title>' +
          "<style>@page{size:A4;margin:0}html,body{margin:0;padding:0}" +
          "img{width:100%;height:auto;display:block}</style></head><body>" +
          '<img src="' + dataUrl + '" onload="setTimeout(function(){window.focus();window.print();},80)">' +
          "</body></html>"
      );
      w.document.close();
    } else {
      // Popups bloqueados → mostra a modal para guardar/imprimir manualmente
      openModal(dataUrl, true);
    }
  }

  /* ---------------- Modal de pré-visualização ---------------- */
  function openModal(dataUrl, forPrint) {
    el.modalImg.src = dataUrl;
    el.modalDownload.href = dataUrl;
    el.modalDownload.download = fileName();
    el.modalHint.textContent = isTouch()
      ? "Para guardar: toca e mantém premido na imagem e escolhe “Guardar imagem”. Ou usa o botão Descarregar."
      : (forPrint
          ? "Clica em Imprimir, ou botão direito na imagem → “Guardar imagem”."
          : "Clica em Descarregar, ou botão direito na imagem → “Guardar imagem”.");
    el.modal.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    el.modal.hidden = true;
    document.body.style.overflow = "";
  }
  el.modalClose.addEventListener("click", closeModal);
  el.modalBackdrop.addEventListener("click", closeModal);
  el.modalPrint.addEventListener("click", function () {
    if (el.modalImg.src) printFromImage(el.modalImg.src);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !el.modal.hidden) closeModal();
  });

  function fileName() {
    const base = (state.restaurant.trim() || "prato-do-dia")
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return `${base}-${state.date || todayISO()}.png`;
  }

  /* ---------------- Arranque ---------------- */
  (function initUiTheme() {
    let saved = null;
    try { saved = localStorage.getItem(UI_THEME_KEY); } catch (e) {}
    applyUiTheme(saved);
  })();
  fillEditor();
  bindSimpleInputs();
  rebuildSuggestions();
  renderMenu();
  // Reajusta se a janela mudar de tamanho (o A4 pode ser escalado no ecrã)
  window.addEventListener("resize", autoFit);
})();
