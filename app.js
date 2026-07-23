/* ============================================================
   Prato do Dia — lógica da aplicação
   App estática, sem dependências (exceto html2canvas p/ imagem).
   Guarda no navegador (localStorage). Funciona offline.
   ============================================================ */

(function () {
  "use strict";

  const STORAGE_KEY = "prato-do-dia:v3";
  const STORAGE_KEY_V2 = "prato-do-dia:v2"; // versão anterior — só para migração (não é apagada)
  const UI_THEME_KEY = "prato-do-dia:ui-theme";
  const HISTORY_KEY = "prato-do-dia:history:v1";
  const DEFAULT_INCLUDES = "Sopa · Pão · Bebida · Café · Prato à escolha";
  const HISTORY_MAX_DAYS = 60; // poda o histórico às 60 datas mais recentes
  const MAX_DISH_SUGGESTIONS = 80;
  const MAX_SOUP_SUGGESTIONS = 30;
  const MAX_PHRASE_SUGGESTIONS = 20;
  const MAX_LOGO_SIDE = 480; // px — maior lado do logótipo depois de reduzido

  const TEMPLATES = {
    print: [
      { id: "classico", label: "Clássico", color: "#1c5b86" },
      { id: "moderno", label: "Moderno", color: "#c0392b" },
      { id: "bistro", label: "Bistrô", color: "#2f6b43" },
      { id: "tabuleta", label: "Tabuleta", color: "#7c2438" },
    ],
    story: [
      { id: "ardosia", label: "Ardósia", color: "#232a2d" },
      { id: "vibrante", label: "Vibrante", color: "#d1502e" },
      { id: "fresco", label: "Fresco", color: "#f2a65a" },
      { id: "editorial", label: "Editorial", color: "#14425f" },
    ],
  };

  function activeTemplate() {
    return state.format === "story" ? state.templateStory : state.templatePrint;
  }

  // Definições globais por omissão (sem soup/dishes/desserts/date — isso vive no histórico)
  function defaultSettings() {
    return {
      kind: "prato",
      restaurant: "",
      tagline: "",
      price: "",
      includes: DEFAULT_INCLUDES,
      footer: "Bom apetite!",
      format: "print",
      templatePrint: "classico",
      templateStory: "ardosia",
      logo: "",
      restaurantHistory: [],
      taglineHistory: [],
      footerHistory: [],
    };
  }

  // Garante que as definições têm sempre os campos esperados e tipos corretos
  function sanitizeSettings(s) {
    const d = defaultSettings();
    if (!s || typeof s !== "object") return d;
    return {
      kind: s.kind === "sobremesas" ? "sobremesas" : "prato",
      restaurant: typeof s.restaurant === "string" ? s.restaurant : d.restaurant,
      tagline: typeof s.tagline === "string" ? s.tagline : d.tagline,
      price: typeof s.price === "string" ? s.price : d.price,
      includes: typeof s.includes === "string" && s.includes ? s.includes : d.includes,
      footer: typeof s.footer === "string" ? s.footer : d.footer,
      format: s.format === "story" ? "story" : "print",
      templatePrint: TEMPLATES.print.some((t) => t.id === s.templatePrint) ? s.templatePrint : d.templatePrint,
      templateStory: TEMPLATES.story.some((t) => t.id === s.templateStory) ? s.templateStory : d.templateStory,
      logo: typeof s.logo === "string" ? s.logo : d.logo,
      restaurantHistory: Array.isArray(s.restaurantHistory) ? s.restaurantHistory.filter((x) => typeof x === "string") : d.restaurantHistory,
      taglineHistory: Array.isArray(s.taglineHistory) ? s.taglineHistory.filter((x) => typeof x === "string") : d.taglineHistory,
      footerHistory: Array.isArray(s.footerHistory) ? s.footerHistory.filter((x) => typeof x === "string") : d.footerHistory,
    };
  }

  function extractSettings(s) {
    return {
      kind: s.kind,
      restaurant: s.restaurant,
      tagline: s.tagline,
      price: s.price,
      includes: s.includes,
      footer: s.footer,
      format: s.format,
      templatePrint: s.templatePrint,
      templateStory: s.templateStory,
      logo: s.logo,
      restaurantHistory: s.restaurantHistory,
      taglineHistory: s.taglineHistory,
      footerHistory: s.footerHistory,
    };
  }

  // Carrega as definições v3; se não existirem, migra a partir de v2 (uma vez)
  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : null;
      if (data && data.settings && typeof data.settings === "object") {
        return sanitizeSettings(data.settings);
      }
    } catch (e) {
      /* ignora e tenta migração */
    }

    // Migração de v2 → v3 (só quando v3 ainda não existe)
    try {
      const rawV2 = localStorage.getItem(STORAGE_KEY_V2);
      const v2 = rawV2 ? JSON.parse(rawV2) : null;
      if (v2) {
        const settings = sanitizeSettings({
          restaurant: v2.restaurant,
          tagline: v2.tagline,
          price: v2.price,
          includes: v2.includes,
          footer: v2.footer,
          theme: v2.theme,
        });
        // Garante que o conteúdo do dia do v2 fica no histórico (sem sobrepor um dia já existente)
        if (v2.date) {
          const history = loadHistory();
          if (!history.days[v2.date]) {
            const soup = String(v2.soup || "").trim();
            const dishes = Array.isArray(v2.dishes) ? v2.dishes.map((d) => String(d || "").trim()).filter((d) => d) : [];
            if (soup || dishes.length > 0) {
              history.days[v2.date] = { soup: soup, dishes: dishes, desserts: [] };
              localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
            }
          }
        }
        return settings;
      }
    } catch (e) {
      /* ignora e usa omissões */
    }

    return defaultSettings();
  }

  // Sobremesas são itens {name, price} — cada sobremesa tem o seu preço.
  function emptyDesserts() {
    return [{ name: "", price: "" }, { name: "", price: "" }, { name: "", price: "" }];
  }
  function copyDesserts(arr) {
    return (Array.isArray(arr) ? arr : []).map((d) => ({ name: (d && d.name) || "", price: (d && d.price) || "" }));
  }

  // Monta o estado inicial: definições (v3, com migração de v2 se necessário) + dia de hoje do histórico
  function buildInitialState() {
    const settings = loadSettings();
    const date = todayISO();
    const history = loadHistory();
    const day = history.days[date];
    return Object.assign({}, settings, {
      date: date,
      soup: day ? day.soup || "" : "",
      dishes: day && Array.isArray(day.dishes) && day.dishes.length ? day.dishes.slice() : ["", "", ""],
      desserts: day && Array.isArray(day.desserts) && day.desserts.length ? copyDesserts(day.desserts) : emptyDesserts(),
    });
  }

  let state = buildInitialState();

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

  // Grava as definições globais (v3) e o conteúdo do dia atual (histórico).
  // O histórico de nome/frase/rodapé é atualizado no "change" (blur) dos campos,
  // não aqui — assim não guarda versões parciais escritas tecla a tecla.
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings: extractSettings(state) }));
    } catch (e) {
      /* localStorage indisponível — ignora */
    }
    saveHistory();
    rebuildSuggestions();
    rebuildPhraseSuggestions();
  }

  /* ---------------- Histórico de menus (p/ "copiar de ontem" e sugestões) ---------------- */
  // Normaliza o registo de um dia: soup (string) + dishes (string[]) + desserts
  // ({name, price}[], cada sobremesa tem o seu preço). Migração: sobremesas antigas
  // guardadas como texto viram {name, price:""}; dias sem "desserts" ficam com [].
  function sanitizeDay(day) {
    if (!day || typeof day !== "object") return { soup: "", dishes: [], desserts: [] };
    return {
      soup: typeof day.soup === "string" ? day.soup.trim() : "",
      dishes: Array.isArray(day.dishes) ? day.dishes.map((d) => String(d || "").trim()).filter((d) => d) : [],
      desserts: Array.isArray(day.desserts)
        ? day.desserts
            .map((d) => (typeof d === "string"
              ? { name: d.trim(), price: "" }
              : { name: String((d && d.name) || "").trim(), price: String((d && d.price) || "").trim() }))
            .filter((d) => d.name)
        : [],
    };
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const data = raw ? JSON.parse(raw) : null;
      if (!data || typeof data !== "object" || !data.days || typeof data.days !== "object") {
        return { days: {} };
      }
      const days = {};
      Object.keys(data.days).forEach((date) => {
        days[date] = sanitizeDay(data.days[date]);
      });
      return { days: days };
    } catch (e) {
      return { days: {} };
    }
  }

  // Grava o dia atual no histórico (poda o dia só quando sopa, pratos E sobremesas
  // ficam todos vazios) e limita a 60 datas
  function saveHistory() {
    try {
      const history = loadHistory();
      const soup = (state.soup || "").trim();
      const dishes = state.dishes.map((d) => d.trim()).filter((d) => d);
      const desserts = state.desserts
        .map((d) => ({ name: (d.name || "").trim(), price: (d.price || "").trim() }))
        .filter((d) => d.name);
      if (!soup && dishes.length === 0 && desserts.length === 0) {
        delete history.days[state.date];
      } else {
        history.days[state.date] = { soup: soup, dishes: dishes, desserts: desserts };
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
    editor: document.querySelector(".editor"),
    kindToggle: document.getElementById("kind-toggle"),
    restaurant: document.getElementById("in-restaurant"),
    tagline: document.getElementById("in-tagline"),
    date: document.getElementById("in-date"),
    btnDatePrev: document.getElementById("btn-date-prev"),
    btnDateNext: document.getElementById("btn-date-next"),
    btnDateToday: document.getElementById("btn-date-today"),
    soup: document.getElementById("in-soup"),
    price: document.getElementById("in-price"),
    includes: document.getElementById("in-includes"),
    footer: document.getElementById("in-footer"),
    dishes: document.getElementById("dishes"),
    dishCount: document.getElementById("dish-count"),
    dishSuggestions: document.getElementById("dish-suggestions"),
    dessertsList: document.getElementById("desserts-list"),
    dessertCount: document.getElementById("dessert-count"),
    dessertSuggestions: document.getElementById("dessert-suggestions"),
    soupSuggestions: document.getElementById("soup-suggestions"),
    restaurantSuggestions: document.getElementById("restaurant-suggestions"),
    taglineSuggestions: document.getElementById("tagline-suggestions"),
    footerSuggestions: document.getElementById("footer-suggestions"),
    btnCopyPrev: document.getElementById("btn-copy-prev"),
    btnCopyPrevDesserts: document.getElementById("btn-copy-prev-desserts"),
    logoPreview: document.getElementById("logo-preview"),
    btnLogo: document.getElementById("btn-logo"),
    btnLogoRemove: document.getElementById("btn-logo-remove"),
    inLogo: document.getElementById("in-logo"),
    formatToggle: document.getElementById("format-toggle"),
    templates: document.getElementById("templates"),
    menuWrap: document.getElementById("menu-wrap"),
    menuScale: document.getElementById("menu-scale"),
    menu: document.getElementById("menu"),
    addDish: document.getElementById("btn-add-dish"),
    addDessert: document.getElementById("btn-add-dessert"),
    previewHint: document.getElementById("preview-hint"),
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
    btnExport: document.getElementById("btn-export"),
    btnImport: document.getElementById("btn-import"),
    inImport: document.getElementById("in-import"),
  };

  // Mapa que generaliza a lista de itens do editor (pratos ou sobremesas):
  // cada modo tem o seu array em `state`, o seu contentor no DOM e o seu datalist.
  const LIST_CONFIG = {
    prato: {
      arrKey: "dishes",
      container: el.dishes,
      datalist: "dish-suggestions",
      placeholder: "Nome do prato",
      countEl: el.dishCount,
      aria: "Prato",
    },
    sobremesas: {
      arrKey: "desserts",
      container: el.dessertsList,
      datalist: "dessert-suggestions",
      placeholder: "Nome da sobremesa",
      countEl: el.dessertCount,
      aria: "Sobremesa",
      priced: true, // cada sobremesa tem nome + preço próprio
    },
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
    el.editor.setAttribute("data-kind", state.kind);
    renderKindToggle();
    renderList("prato");
    renderList("sobremesas");
    renderLogoControl();
    renderTemplates();
  }

  // Lista genérica de itens (pratos OU sobremesas, consoante `kind`) — mantém o
  // foco no mesmo item enquanto se escreve (não recria a lista toda).
  function renderList(kind, focusIndex) {
    const cfg = LIST_CONFIG[kind];
    const arr = state[cfg.arrKey];
    const emptyItem = () => (cfg.priced ? { name: "", price: "" } : "");
    cfg.container.innerHTML = "";
    arr.forEach((item, i) => {
      const name = cfg.priced ? item.name || "" : item;
      const row = document.createElement("div");
      row.className = "dish-row" + (cfg.priced ? " dish-row--priced" : "");
      const priceField = cfg.priced
        ? `<input type="text" class="dish-price" value="${esc(item.price || "")}" placeholder="€" aria-label="Preço da sobremesa ${i + 1}" />`
        : "";
      row.innerHTML = `
        <span class="dish-row__num">${i + 1}.</span>
        <input type="text" class="dish-name" list="${cfg.datalist}" value="${esc(name)}" placeholder="${esc(cfg.placeholder)}" aria-label="${esc(cfg.aria)} ${i + 1}" />
        ${priceField}
        <button class="dish-move" type="button" data-dir="-1" title="Mover para cima" aria-label="Mover ${esc(cfg.aria.toLowerCase())} para cima">▲</button>
        <button class="dish-move" type="button" data-dir="1" title="Mover para baixo" aria-label="Mover ${esc(cfg.aria.toLowerCase())} para baixo">▼</button>
        <button class="dish-remove" type="button" title="Remover ${esc(cfg.aria.toLowerCase())}">✕</button>
      `;
      const input = row.querySelector(".dish-name");
      input.addEventListener("input", (e) => {
        if (cfg.priced) arr[i].name = e.target.value; else arr[i] = e.target.value;
        onChange(false);
      });
      if (cfg.priced) {
        row.querySelector(".dish-price").addEventListener("input", (e) => {
          arr[i].price = e.target.value;
          onChange(false);
        });
      }
      // Enter cria um novo item a seguir
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          arr.splice(i + 1, 0, emptyItem());
          renderList(kind, i + 1);
          onChange(false);
        }
      });
      // Botões de reordenar
      row.querySelectorAll(".dish-move").forEach((btn) => {
        const dir = parseInt(btn.getAttribute("data-dir"), 10);
        const isFirst = i === 0;
        const isLast = i === arr.length - 1;
        if ((dir === -1 && isFirst) || (dir === 1 && isLast)) {
          btn.disabled = true;
        }
        btn.addEventListener("click", () => {
          const newIndex = i + dir;
          const temp = arr[i];
          arr[i] = arr[newIndex];
          arr[newIndex] = temp;
          renderList(kind, newIndex);
          onChange(false);
        });
      });
      row.querySelector(".dish-remove").addEventListener("click", () => {
        arr.splice(i, 1);
        if (arr.length === 0) arr.push(emptyItem());
        renderList(kind);
        onChange(false);
      });
      cfg.container.appendChild(row);
    });
    updateListCount(kind);

    if (focusIndex != null) {
      const inputs = cfg.container.querySelectorAll(".dish-name");
      if (inputs[focusIndex]) inputs[focusIndex].focus();
    }
  }

  // Pinta o botão ativo do interruptor de modo (Prato do dia / Sobremesas)
  function renderKindToggle() {
    if (!el.kindToggle) return;
    el.kindToggle.querySelectorAll(".kind-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-kind") === state.kind);
    });
  }

  // Muda o modo ativo: não recarrega dados (soup/dishes/desserts já vivem todos
  // em `state`) — só muda o que se mostra no editor e o que renderMenu() desenha.
  function switchKind(kind) {
    if (kind !== "prato" && kind !== "sobremesas") return;
    if (kind === state.kind) return;
    state.kind = kind;
    el.editor.setAttribute("data-kind", kind);
    renderKindToggle();
    renderList(kind);
    renderMenu();
    updateDishCount();
    updatePreviewChrome();
    onChange(false);
  }

  // Pinta o estado ativo do seletor de formato e gera os chips de template do formato ativo
  function renderTemplates() {
    if (el.formatToggle) {
      el.formatToggle.querySelectorAll(".format-btn").forEach((btn) => {
        btn.classList.toggle("is-active", btn.getAttribute("data-format") === state.format);
      });
    }
    if (!el.templates) return;
    el.templates.innerHTML = "";
    const active = activeTemplate();
    TEMPLATES[state.format].forEach((t) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "template-chip" + (active === t.id ? " is-active" : "");
      chip.innerHTML = `<span class="theme-swatch" style="background:${t.color}"></span>${esc(t.label)}`;
      chip.addEventListener("click", () => {
        if (state.format === "story") state.templateStory = t.id;
        else state.templatePrint = t.id;
        renderTemplates();
        onChange(false);
      });
      el.templates.appendChild(chip);
    });
  }

  /* ---------------- Logótipo ---------------- */
  // Mostra o logótipo atual em #logo-preview e alterna o botão "Remover"
  function renderLogoControl() {
    if (!el.logoPreview) return;
    if (state.logo) {
      el.logoPreview.innerHTML = `<img src="${esc(state.logo)}" alt="" />`;
      if (el.btnLogoRemove) el.btnLogoRemove.hidden = false;
    } else {
      el.logoPreview.innerHTML = `<span>Sem logótipo</span>`;
      if (el.btnLogoRemove) el.btnLogoRemove.hidden = true;
    }
  }

  // Reduz a imagem escolhida para um PNG com o maior lado até MAX_LOGO_SIDE
  function loadLogoFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (!w || !h) return;
        const scale = Math.min(1, MAX_LOGO_SIDE / Math.max(w, h));
        w = Math.max(1, Math.round(w * scale));
        h = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        state.logo = canvas.toDataURL("image/png");
        renderLogoControl();
        onChange(false);
      };
      img.onerror = () => toast("Não foi possível ler essa imagem.");
      img.src = String(reader.result || "");
    };
    reader.onerror = () => toast("Não foi possível ler essa imagem.");
    reader.readAsDataURL(file);
  }

  if (el.btnLogo && el.inLogo) {
    el.btnLogo.addEventListener("click", () => el.inLogo.click());
    el.inLogo.addEventListener("change", () => {
      const file = el.inLogo.files && el.inLogo.files[0];
      loadLogoFile(file);
      el.inLogo.value = "";
    });
  }
  if (el.btnLogoRemove) {
    el.btnLogoRemove.addEventListener("click", () => {
      state.logo = "";
      renderLogoControl();
      onChange(false);
    });
  }

  /* ---------------- Sugestões de frases (tagline / rodapé) ---------------- */
  // Preenche os datalists de tagline/rodapé a partir do histórico guardado nas definições (mais recentes primeiro)
  function rebuildPhraseSuggestions() {
    if (el.restaurantSuggestions) {
      el.restaurantSuggestions.innerHTML = state.restaurantHistory.map((s) => `<option value="${esc(s)}"></option>`).join("");
    }
    if (el.taglineSuggestions) {
      el.taglineSuggestions.innerHTML = state.taglineHistory.map((s) => `<option value="${esc(s)}"></option>`).join("");
    }
    if (el.footerSuggestions) {
      el.footerSuggestions.innerHTML = state.footerHistory.map((s) => `<option value="${esc(s)}"></option>`).join("");
    }
  }

  // Insere uma frase no topo do respetivo histórico (dedupe case-insensitive, cap MAX_PHRASE_SUGGESTIONS)
  function rememberPhrase(list, value) {
    const trimmed = (value || "").trim();
    if (!trimmed) return list;
    const key = trimmed.toLowerCase();
    const next = list.filter((s) => s.toLowerCase() !== key);
    next.unshift(trimmed);
    return next.slice(0, MAX_PHRASE_SUGGESTIONS);
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
    const dessertSeen = new Set();
    const dessertList = [];

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
      (Array.isArray(day.desserts) ? day.desserts : []).forEach((dessert) => {
        if (dessertList.length >= MAX_DISH_SUGGESTIONS) return;
        const name = String((dessert && dessert.name) || "").trim();
        if (!name) return;
        const key = name.toLowerCase();
        if (!dessertSeen.has(key)) {
          dessertSeen.add(key);
          dessertList.push(name);
        }
      });
    });

    el.dishSuggestions.innerHTML = dishList.map((d) => `<option value="${esc(d)}"></option>`).join("");
    el.soupSuggestions.innerHTML = soupList.map((s) => `<option value="${esc(s)}"></option>`).join("");
    if (el.dessertSuggestions) {
      el.dessertSuggestions.innerHTML = dessertList.map((d) => `<option value="${esc(d)}"></option>`).join("");
    }
  }

  /* ---------------- Render do menu (pré-visualização) ---------------- */
  // Ramifica por state.kind: os dois modos partilham cabeçalho/marca, divisória,
  // data, templates e formatos — só o corpo do menu (eyebrow, itens, preço) muda.
  function renderMenu() {
    const m = state;
    el.menu.setAttribute("data-format", m.format);
    el.menu.setAttribute("data-template", activeTemplate());

    const restaurant = m.restaurant.trim() || "O Seu Restaurante";
    let html = `<header class="menu__header">
      ${m.logo ? `<img class="menu__logo" src="${esc(m.logo)}" alt="" />` : ""}
      <h1 class="menu__restaurant">${esc(restaurant)}</h1>
      ${m.tagline.trim() ? `<p class="menu__tagline">${esc(m.tagline)}</p>` : ""}
    </header>`;

    html += `<div class="menu__rule"><i></i></div>`;

    if (m.kind === "sobremesas") {
      html += `<p class="menu__eyebrow">Sobremesas</p>`;
      if (m.date) html += `<p class="menu__date">${esc(formatDatePT(m.date))}</p>`;

      // Sobremesas do dia (cada uma com o seu preço; sem "o menu inclui" nem sopa)
      const desserts = m.desserts.filter((d) => (d.name || "").trim());
      if (desserts.length > 0) {
        html += `<div class="menu__dishes-block">
          <p class="menu__dishes-title">Sobremesas do dia</p>
          <div class="menu__dishes">
            ${desserts.map((d) => {
              const price = (d.price || "").trim();
              return `<div class="menu__dish menu__dish--priced"><span class="menu__dish-name">${esc(d.name)}</span>${price ? `<span class="menu__dish-price">${esc(price)}</span>` : ""}</div>`;
            }).join("")}
          </div>
        </div>`;
      } else {
        html += `<p class="menu__empty">Escreve as sobremesas de hoje no editor à esquerda para veres o menu aparecer aqui.</p>`;
      }

      if (m.footer.trim()) {
        html += `<footer class="menu__footer">${esc(m.footer)}</footer>`;
      }
    } else {
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
    }

    el.menu.innerHTML = html;
    autoFit();
    updatePreviewScale();
  }

  /* ---------------- Auto-ajuste à folha/canvas ----------------
     Escolhe um fator inicial pelo nº de itens da lista do modo ativo
     (poucos → maior, muitos → menor) e depois reduz até caber na
     folha (print) ou no canvas (story). */
  function autoFit() {
    const menu = el.menu;
    const count = state.kind === "sobremesas"
      ? state.desserts.filter((d) => (d.name || "").trim()).length
      : state.dishes.filter((d) => d.trim()).length;

    let fit;
    if (count <= 4) fit = 1.28;
    else if (count <= 6) fit = 1.12;
    else if (count <= 8) fit = 1.0;
    else if (count <= 10) fit = 0.9;
    else if (count <= 13) fit = 0.8;
    else fit = 0.7;

    menu.style.setProperty("--fit", fit.toFixed(3));

    // Reduz enquanto o conteúdo transbordar a folha/canvas (garante que cabe tudo)
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

  /* ---------------- Escala do preview (para caber os dois formatos na coluna) ----------------
     A transformação vive no ancestral #menu-scale. Como o html2canvas herda essa
     escala, a exportação (renderPng) repõe temporariamente --preview-scale:1 para
     captar sempre à resolução nativa (794x1123 / 1080x1920). */
  const NATIVE_W = { print: 794, story: 1080 };
  const NATIVE_H = { print: 1123, story: 1920 };
  function updatePreviewScale() {
    if (!el.menuWrap || !el.menuScale) return;
    const nativeW = NATIVE_W[state.format] || NATIVE_W.print;
    const nativeH = NATIVE_H[state.format] || NATIVE_H.print;
    const avail = el.menuWrap.clientWidth;
    const scale = avail > 0 ? Math.min(1, avail / nativeW) : 1;
    el.menuWrap.style.setProperty("--preview-scale", scale.toFixed(4));
    el.menuWrap.style.height = Math.round(nativeH * scale) + "px";
  }

  /* ---------------- Cabeçalho do preview e botões de ação por formato ---------------- */
  function updatePreviewChrome() {
    if (el.previewHint) {
      if (state.kind === "sobremesas") {
        el.previewHint.textContent =
          state.format === "story"
            ? "Pré-visualização das sobremesas — story 9:16 para Instagram/Facebook 👇"
            : "Pré-visualização das sobremesas — folha A4, pronta a imprimir 👇";
      } else {
        el.previewHint.textContent =
          state.format === "story"
            ? "Pré-visualização — story 9:16 para Instagram/Facebook 👇"
            : "Pré-visualização — folha A4, pronta a imprimir 👇";
      }
    }
    if (el.btnPrint) {
      el.btnPrint.textContent = state.format === "story" ? "📤 Partilhar" : "🖨️ Imprimir / PDF";
    }
  }

  /* ---------------- Fluxo de alterações ---------------- */
  // Atualiza a badge de contagem de cada lista (pratos e sobremesas) — mantém as
  // duas coerentes mesmo que só uma esteja visível no modo ativo.
  function updateListCount(kind) {
    const cfg = LIST_CONFIG[kind];
    const arr = state[cfg.arrKey];
    const n = cfg.priced
      ? arr.filter((d) => (d.name || "").trim()).length
      : arr.filter((d) => d.trim()).length;
    cfg.countEl.textContent = String(n);
  }
  function updateDishCount() {
    updateListCount("prato");
    updateListCount("sobremesas");
  }

  function onChange(rerenderLists = true) {
    save();
    updateDishCount();
    renderMenu();
    if (rerenderLists) {
      renderList("prato");
      renderList("sobremesas");
    }
  }

  function bindSimpleInputs() {
    const map = [
      ["restaurant", el.restaurant],
      ["tagline", el.tagline],
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

    // Guarda no histórico só quando o campo é confirmado (blur/Enter) — evita
    // guardar versões parciais escritas tecla a tecla. Alimenta os datalists.
    [
      ["restaurant", "restaurantHistory"],
      ["tagline", "taglineHistory"],
      ["footer", "footerHistory"],
    ].forEach(([key, hist]) => {
      el[key].addEventListener("change", () => {
        state[hist] = rememberPhrase(state[hist], state[key]);
        save();
      });
    });
  }

  /* ---------------- Navegação entre dias ---------------- */
  // Soma (ou subtrai) dias a uma data ISO, respeitando o fuso horário local
  function addDays(iso, delta) {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + delta);
    const off = dt.getTimezoneOffset();
    return new Date(dt.getTime() - off * 60000).toISOString().slice(0, 10);
  }

  // Muda o dia selecionado: o conteúdo do dia anterior já ficou persistido
  // (o save() corre a cada alteração), por isso basta carregar o novo dia.
  // soup, dishes E desserts vêm todos do registo do dia — os dois modos ficam
  // sempre com os seus dados prontos, mesmo que só um esteja visível agora.
  function switchDay(newDate) {
    if (!newDate || newDate === state.date) return;
    state.date = newDate;
    const history = loadHistory();
    const day = history.days[state.date];
    state.soup = day ? day.soup || "" : "";
    state.dishes = day && Array.isArray(day.dishes) && day.dishes.length ? day.dishes.slice() : ["", "", ""];
    state.desserts = day && Array.isArray(day.desserts) && day.desserts.length ? copyDesserts(day.desserts) : emptyDesserts();
    el.date.value = state.date;
    el.soup.value = state.soup;
    renderList("prato");
    renderList("sobremesas");
    onChange(false);
  }

  /* ---------------- Ações ---------------- */
  el.addDish.addEventListener("click", () => {
    state.dishes.push("");
    renderList("prato", state.dishes.length - 1);
    onChange(false);
  });

  if (el.addDessert) {
    el.addDessert.addEventListener("click", () => {
      state.desserts.push({ name: "", price: "" });
      renderList("sobremesas", state.desserts.length - 1);
      onChange(false);
    });
  }

  el.btnPrint.addEventListener("click", printMenu);

  // A data usa "change" (não "input") para não disparar com datas parciais escritas à mão
  el.date.addEventListener("change", () => {
    if (!el.date.value) {
      el.date.value = state.date;
      return;
    }
    switchDay(el.date.value);
  });
  el.btnDatePrev.addEventListener("click", () => switchDay(addDays(state.date, -1)));
  el.btnDateNext.addEventListener("click", () => switchDay(addDays(state.date, 1)));
  el.btnDateToday.addEventListener("click", () => switchDay(todayISO()));

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
    renderList("prato");
    onChange(false);
    toast(`Copiado o menu de ${formatDatePT(prevDate)}.`);
  });

  // Copia as sobremesas do dia guardado mais recente anterior à data atual COM sobremesas
  if (el.btnCopyPrevDesserts) {
    el.btnCopyPrevDesserts.addEventListener("click", () => {
      const history = loadHistory();
      const prevDate = Object.keys(history.days)
        .filter((d) => d < state.date && Array.isArray(history.days[d].desserts) && history.days[d].desserts.length > 0)
        .sort()
        .pop();
      if (!prevDate) {
        toast("Ainda não há nenhuma sobremesa anterior guardada.");
        return;
      }
      const day = history.days[prevDate];
      state.desserts = Array.isArray(day.desserts) && day.desserts.length ? copyDesserts(day.desserts) : emptyDesserts();
      renderList("sobremesas");
      onChange(false);
      toast(`Copiadas as sobremesas de ${formatDatePT(prevDate)}.`);
    });
  }

  // "Limpar dia" limpa só a lista do modo ativo — em prato limpa sopa+pratos,
  // em sobremesas limpa as sobremesas. Anular repõe o snapshot do modo em que foi limpo.
  el.btnClear.addEventListener("click", () => {
    if (state.kind === "sobremesas") {
      const snapshot = { desserts: copyDesserts(state.desserts) };
      state.desserts = emptyDesserts();
      fillEditor();
      onChange(false);
      toast("Dia limpo.", {
        label: "Anular",
        onClick: function () {
          state.desserts = snapshot.desserts;
          fillEditor();
          onChange(false);
        },
      });
    } else {
      const snapshot = { soup: state.soup, dishes: state.dishes.slice() };
      state.soup = "";
      state.dishes = ["", "", ""];
      fillEditor();
      onChange(false);
      toast("Dia limpo.", {
        label: "Anular",
        onClick: function () {
          state.soup = snapshot.soup;
          state.dishes = snapshot.dishes;
          fillEditor();
          onChange(false);
        },
      });
    }
  });

  el.btnImage.addEventListener("click", exportImage);

  // Interruptor de modo (Prato do dia / Sobremesas)
  if (el.kindToggle) {
    el.kindToggle.querySelectorAll(".kind-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        switchKind(btn.getAttribute("data-kind"));
      });
    });
  }

  // Seletor de formato (Imprimir A4 / Story 9:16)
  if (el.formatToggle) {
    el.formatToggle.querySelectorAll(".format-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const format = btn.getAttribute("data-format") === "story" ? "story" : "print";
        if (format === state.format) return;
        state.format = format;
        renderTemplates();
        updatePreviewChrome();
        onChange(false);
      });
    });
  }

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

  // Renderiza o menu para um dataURL PNG (fundo branco no print; no story é o
  // próprio template que pinta o fundo, por isso não se força cor nenhuma).
  // Importante: o html2canvas herda a escala de pré-visualização do ancestral
  // (#menu-scale), por isso força-se --preview-scale:1 durante a captura para
  // exportar sempre à resolução nativa (A4 / 1080×1920) e evitar que o texto
  // perca os espaços quando o preview está reduzido.
  function renderPng(btn) {
    if (typeof window.html2canvas !== "function") {
      return Promise.reject(new Error("html2canvas indisponível"));
    }
    var prev;
    if (btn) { prev = btn.textContent; btn.textContent = "⏳ A gerar…"; btn.disabled = true; }
    var bg = state.format === "story" ? null : "#ffffff";
    var prevScale = el.menuWrap.style.getPropertyValue("--preview-scale");
    el.menuWrap.style.setProperty("--preview-scale", "1");
    void el.menu.offsetWidth; // força reflow para a captura sair à escala nativa
    function restore() {
      if (prevScale) el.menuWrap.style.setProperty("--preview-scale", prevScale);
      else updatePreviewScale();
    }
    return window
      .html2canvas(el.menu, { scale: 2, backgroundColor: bg, useCORS: true, logging: false })
      .then(function (canvas) { return canvas.toDataURL("image/png"); })
      .then(
        function (url) { restore(); if (btn) { btn.textContent = prev; btn.disabled = false; } return url; },
        function (err) { restore(); if (btn) { btn.textContent = prev; btn.disabled = false; } throw err; }
      );
  }

  // Botão "Guardar imagem" → mostra a pré-visualização com opção de guardar
  function exportImage() {
    renderPng(el.btnImage)
      .then(function (url) { openModal(url); })
      .catch(function () { toast(RESTRICTED_MSG); });
  }

  // Botão "Imprimir / PDF" (print) ou "Partilhar" (story)
  function printMenu() {
    if (state.format === "story") { shareImage(el.btnPrint); return; }
    // Página normal (alojada ou ficheiro): impressão nativa, texto nítido
    if (!inIframe()) { window.print(); return; }
    // Dentro da iframe do artefacto: imprimir a partir da imagem
    renderPng(el.btnPrint)
      .then(function (url) { printFromImage(url); })
      .catch(function () { toast(RESTRICTED_MSG); });
  }

  // Botão "Partilhar" (story) — usa a Web Share API com ficheiro quando disponível;
  // sem suporte, cai na modal de guardar (mesmo caminho de recurso do print).
  function shareImage(btn) {
    var dataUrl;
    renderPng(btn)
      .then(function (url) {
        dataUrl = url;
        return fetch(url).then(function (res) { return res.blob(); });
      })
      .then(function (blob) {
        var file = new File([blob], fileName(), { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          return navigator.share({ files: [file], title: "Prato do Dia" });
        }
        openModal(dataUrl);
      })
      .catch(function (err) {
        if (err && err.name === "AbortError") return; // utilizador cancelou a partilha
        toast(RESTRICTED_MSG);
      });
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
    const suffix = state.format === "story" ? "story" : "a4";
    const kindPart = state.kind === "sobremesas" ? "-sobremesas" : "";
    return `${base}${kindPart}-${state.date || todayISO()}-${suffix}.png`;
  }

  /* ============================================================
     Cópia de segurança — exportar / importar JSON
     ============================================================ */

  // Aplica um conjunto de definições + histórico completo ao estado atual
  // e ao localStorage (usado tanto na importação como no "Anular" dela).
  function applyBackup(settings, days) {
    Object.assign(state, settings);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify({ days: days }));
    } catch (e) {
      /* localStorage indisponível — ignora */
    }
    const day = days[state.date];
    state.soup = day ? day.soup || "" : "";
    state.dishes = day && Array.isArray(day.dishes) && day.dishes.length ? day.dishes.slice() : ["", "", ""];
    state.desserts = day && Array.isArray(day.desserts) && day.desserts.length ? copyDesserts(day.desserts) : emptyDesserts();
    fillEditor();
    updatePreviewChrome();
    onChange(false);
  }

  el.btnExport.addEventListener("click", () => {
    try {
      const history = loadHistory();
      const data = {
        app: "prato-do-dia",
        version: 3,
        exportedAt: new Date().toISOString(),
        settings: extractSettings(state),
        days: history.days,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prato-do-dia-backup-${todayISO()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast(RESTRICTED_MSG);
    }
  });

  el.btnImport.addEventListener("click", () => {
    el.inImport.click();
  });

  el.inImport.addEventListener("change", () => {
    const file = el.inImport.files && el.inImport.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      importBackup(String(reader.result || ""));
      el.inImport.value = ""; // permite reimportar o mesmo ficheiro
    };
    reader.onerror = () => {
      toast("Ficheiro inválido — exporta primeiro uma cópia a partir da app.");
      el.inImport.value = "";
    };
    reader.readAsText(file);
  });

  function importBackup(text) {
    let obj;
    try {
      obj = JSON.parse(text);
    } catch (e) {
      toast("Ficheiro inválido — exporta primeiro uma cópia a partir da app.");
      return;
    }
    if (!obj || obj.app !== "prato-do-dia" || !obj.days || typeof obj.days !== "object" || !obj.settings || typeof obj.settings !== "object") {
      toast("Ficheiro inválido — exporta primeiro uma cópia a partir da app.");
      return;
    }

    const previousHistory = loadHistory();
    const snapshot = { settings: extractSettings(state), days: previousHistory.days };

    const newSettings = sanitizeSettings(obj.settings);
    const newDays = {};
    Object.keys(obj.days).forEach((date) => {
      const day = obj.days[date];
      if (!day) return;
      const soup = typeof day.soup === "string" ? day.soup.trim() : "";
      const dishes = Array.isArray(day.dishes) ? day.dishes.map((d) => String(d || "").trim()).filter((d) => d) : [];
      const desserts = Array.isArray(day.desserts) ? day.desserts.map((d) => String(d || "").trim()).filter((d) => d) : [];
      if (soup || dishes.length > 0 || desserts.length > 0) {
        newDays[date] = { soup: soup, dishes: dishes, desserts: desserts };
      }
    });

    applyBackup(newSettings, newDays);
    toast("Dados importados.", {
      label: "Anular",
      onClick: function () {
        applyBackup(snapshot.settings, snapshot.days);
      },
    });
  }

  /* ---------------- Arranque ---------------- */
  (function initUiTheme() {
    let saved = null;
    try { saved = localStorage.getItem(UI_THEME_KEY); } catch (e) {}
    applyUiTheme(saved);
  })();
  fillEditor();
  bindSimpleInputs();
  // Semeia o histórico com os valores já guardados (nome/frase/rodapé), para
  // ficarem logo disponíveis como sugestão sem ser preciso reescrevê-los.
  state.restaurantHistory = rememberPhrase(state.restaurantHistory, state.restaurant);
  state.taglineHistory = rememberPhrase(state.taglineHistory, state.tagline);
  state.footerHistory = rememberPhrase(state.footerHistory, state.footer);
  rebuildSuggestions();
  rebuildPhraseSuggestions();
  updatePreviewChrome();
  renderMenu();
  // Reajusta se a janela mudar de tamanho (o preview é escalado para caber a coluna)
  window.addEventListener("resize", function () {
    autoFit();
    updatePreviewScale();
  });

  // PWA: funciona offline e pode ser instalada no ecrã inicial.
  // Só é possível em https:// ou localhost — em file:// o registo falha e ignora-se.
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();
