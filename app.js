/* ============================================================
   Prato do Dia — lógica da aplicação
   App estática, sem dependências (exceto html2canvas p/ imagem).
   Guarda no navegador (localStorage). Funciona offline.
   ============================================================ */

(function () {
  "use strict";

  const STORAGE_KEY = "prato-do-dia:v2";
  const DEFAULT_INCLUDES = "Sopa · Pão · Bebida · Café · Prato à escolha";

  const THEMES = [
    { id: "taberna", label: "Taberna", color: "#7a1f1f" },
    { id: "moderno", label: "Moderno", color: "#b8860b" },
    { id: "mar", label: "Mar", color: "#0e5c73" },
    { id: "rustico", label: "Rústico", color: "#e0a458" },
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
      theme: "taberna",
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
      .replace(/>/g, "&gt;");
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* localStorage indisponível — ignora */
    }
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
    return s;
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
    themes: document.getElementById("themes"),
    menu: document.getElementById("menu"),
    addDish: document.getElementById("btn-add-dish"),
    btnPrint: document.getElementById("btn-print"),
    btnImage: document.getElementById("btn-image"),
    btnClear: document.getElementById("btn-clear"),
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
        <input type="text" class="dish-name" value="${esc(name)}" placeholder="Nome do prato" aria-label="Prato ${i + 1}" />
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
      row.querySelector(".dish-remove").addEventListener("click", () => {
        state.dishes.splice(i, 1);
        if (state.dishes.length === 0) state.dishes.push("");
        renderDishes();
        onChange(false);
      });
      el.dishes.appendChild(row);
    });
    el.dishCount.textContent = String(state.dishes.filter((d) => d.trim()).length);

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

  /* ---------------- Render do menu (pré-visualização) ---------------- */
  function renderMenu() {
    const m = state;
    el.menu.setAttribute("data-theme", m.theme || "taberna");

    const restaurant = m.restaurant.trim() || "O Seu Restaurante";
    let html = `<header class="menu__header">
      <h1 class="menu__restaurant">${esc(restaurant)}</h1>
      ${m.tagline.trim() ? `<p class="menu__tagline">${esc(m.tagline)}</p>` : ""}
    </header>`;

    html += `<div class="menu__daytitle"><h2>Prato do Dia</h2></div>`;
    if (m.date) html += `<p class="menu__date">${esc(formatDatePT(m.date))}</p>`;

    // Bloco "o menu inclui" + sopa
    const includes = m.includes.trim() || DEFAULT_INCLUDES;
    html += `<div class="menu__includes">
      <p class="menu__includes-label">O menu inclui</p>
      <p class="menu__includes-value">${esc(includes)}</p>
      ${m.soup.trim() ? `<p class="menu__soup"><strong>Sopa:</strong> ${esc(m.soup)}</p>` : ""}
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
  }

  /* ---------------- Fluxo de alterações ---------------- */
  function onChange(rerenderDishes = true) {
    save();
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

  el.btnPrint.addEventListener("click", () => window.print());

  el.btnClear.addEventListener("click", () => {
    if (!confirm("Limpar a sopa e os pratos deste dia? O nome do restaurante e o tema são mantidos.")) return;
    state.soup = "";
    state.dishes = ["", "", ""];
    state.date = todayISO();
    fillEditor();
    onChange(false);
  });

  el.btnImage.addEventListener("click", exportImage);

  /* ---------------- Exportar imagem PNG (via html2canvas) ---------------- */
  function exportImage() {
    if (typeof window.html2canvas !== "function") {
      alert("Componente de imagem indisponível. Usa antes 'Imprimir / PDF'.");
      return;
    }
    const prev = el.btnImage.textContent;
    el.btnImage.textContent = "⏳ A gerar…";
    el.btnImage.disabled = true;

    window
      .html2canvas(el.menu, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false })
      .then(function (canvas) {
        canvas.toBlob(function (blob) {
          if (!blob) throw new Error("blob nulo");
          const a = document.createElement("a");
          a.download = fileName();
          a.href = URL.createObjectURL(blob);
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        }, "image/png");
      })
      .catch(function () {
        alert("Não foi possível gerar a imagem neste navegador. Usa antes 'Imprimir / PDF'.");
      })
      .then(function () {
        el.btnImage.textContent = prev;
        el.btnImage.disabled = false;
      });
  }

  function fileName() {
    const base = (state.restaurant.trim() || "prato-do-dia")
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return `${base}-${state.date || todayISO()}.png`;
  }

  /* ---------------- Arranque ---------------- */
  fillEditor();
  bindSimpleInputs();
  renderMenu();
  // Reajusta se a janela mudar de tamanho (o A4 pode ser escalado no ecrã)
  window.addEventListener("resize", autoFit);
})();
