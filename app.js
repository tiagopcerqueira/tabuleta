/* ============================================================
   Prato do Dia — lógica da aplicação
   App estática, sem dependências. Guarda no navegador (localStorage).
   ============================================================ */

(function () {
  "use strict";

  const STORAGE_KEY = "prato-do-dia:v1";

  const THEMES = [
    { id: "taberna", label: "Taberna", color: "#7a1f1f" },
    { id: "moderno", label: "Moderno", color: "#b8860b" },
    { id: "mar", label: "Mar", color: "#0e5c73" },
    { id: "rustico", label: "Rústico", color: "#e0a458" },
  ];

  // Estado inicial por omissão (estrutura clássica de tasca)
  function defaultState() {
    return {
      restaurant: "",
      tagline: "",
      date: todayISO(),
      soup: "",
      sections: [
        { icon: "🥩", title: "Carne", dishes: [{ name: "", price: "" }] },
        { icon: "🐟", title: "Peixe", dishes: [{ name: "", price: "" }] },
      ],
      dessert: "",
      price: "",
      includes: "",
      footer: "Bom apetite!",
      theme: "taberna",
    };
  }

  let state = load() || defaultState();

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

  /* ---------------- Referências ao DOM ---------------- */
  const el = {
    restaurant: document.getElementById("in-restaurant"),
    tagline: document.getElementById("in-tagline"),
    date: document.getElementById("in-date"),
    soup: document.getElementById("in-soup"),
    dessert: document.getElementById("in-dessert"),
    price: document.getElementById("in-price"),
    includes: document.getElementById("in-includes"),
    footer: document.getElementById("in-footer"),
    sections: document.getElementById("sections"),
    themes: document.getElementById("themes"),
    menu: document.getElementById("menu"),
    addSection: document.getElementById("btn-add-section"),
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
    el.dessert.value = state.dessert;
    el.price.value = state.price;
    el.includes.value = state.includes;
    el.footer.value = state.footer;
    renderSections();
    renderThemes();
  }

  function renderSections() {
    el.sections.innerHTML = "";
    state.sections.forEach((section, si) => {
      const wrap = document.createElement("div");
      wrap.className = "section";

      const head = document.createElement("div");
      head.className = "section__head";
      head.innerHTML = `
        <span class="section__icon">${esc(section.icon || "🍽️")}</span>
        <input class="section__title-input" type="text" value="${esc(section.title)}" placeholder="Nome da categoria" aria-label="Nome da categoria" />
        <button class="section__remove" type="button" title="Remover categoria">✕</button>
      `;
      head.querySelector(".section__title-input").addEventListener("input", (e) => {
        state.sections[si].title = e.target.value;
        onChange(false);
      });
      head.querySelector(".section__icon").addEventListener("click", () => {
        const next = prompt("Emoji / ícone da categoria:", section.icon || "🍽️");
        if (next !== null) { state.sections[si].icon = next.trim() || "🍽️"; onChange(); }
      });
      head.querySelector(".section__remove").addEventListener("click", () => {
        state.sections.splice(si, 1);
        onChange();
      });
      wrap.appendChild(head);

      section.dishes.forEach((dish, di) => {
        const row = document.createElement("div");
        row.className = "dish-row";
        row.innerHTML = `
          <input type="text" class="dish-name" value="${esc(dish.name)}" placeholder="Nome do prato" aria-label="Nome do prato" />
          <input type="text" class="price-input dish-price" value="${esc(dish.price)}" placeholder="Preço" aria-label="Preço" />
          <button class="dish-remove" type="button" title="Remover prato">✕</button>
        `;
        row.querySelector(".dish-name").addEventListener("input", (e) => {
          state.sections[si].dishes[di].name = e.target.value;
          onChange(false);
        });
        row.querySelector(".dish-price").addEventListener("input", (e) => {
          state.sections[si].dishes[di].price = e.target.value;
          onChange(false);
        });
        row.querySelector(".dish-remove").addEventListener("click", () => {
          state.sections[si].dishes.splice(di, 1);
          if (state.sections[si].dishes.length === 0) state.sections[si].dishes.push({ name: "", price: "" });
          onChange();
        });
        wrap.appendChild(row);
      });

      const addDish = document.createElement("button");
      addDish.className = "btn btn--dashed btn--add-dish";
      addDish.type = "button";
      addDish.textContent = "＋ Adicionar prato";
      addDish.addEventListener("click", () => {
        state.sections[si].dishes.push({ name: "", price: "" });
        onChange();
      });
      wrap.appendChild(addDish);

      el.sections.appendChild(wrap);
    });
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
        onChange();
      });
      el.themes.appendChild(chip);
    });
  }

  /* ---------------- Render do menu (pré-visualização) ---------------- */
  function dishLine(name, price) {
    const priceHtml = price ? `<span class="menu__dish-price">${esc(price)}</span>` : "";
    return `
      <div class="menu__dish">
        <span class="menu__dish-name">${esc(name)}</span>
        <span class="menu__dish-dots"></span>
        ${priceHtml}
      </div>`;
  }

  function renderMenu() {
    const m = state;
    el.menu.setAttribute("data-theme", m.theme || "taberna");

    let html = "";

    // Cabeçalho
    const restaurant = m.restaurant.trim() || "O Seu Restaurante";
    html += `<header class="menu__header">
      <h1 class="menu__restaurant">${esc(restaurant)}</h1>
      ${m.tagline.trim() ? `<p class="menu__tagline">${esc(m.tagline)}</p>` : ""}
    </header>`;

    html += `<div class="menu__daytitle"><h2>Prato do Dia</h2></div>`;
    if (m.date) html += `<p class="menu__date">${esc(formatDatePT(m.date))}</p>`;

    let hasContent = false;

    // Sopa
    if (m.soup.trim()) {
      hasContent = true;
      html += `<section class="menu__section">
        <h3 class="menu__section-title">🥣 Sopa</h3>
        ${dishLine(m.soup, "")}
      </section>`;
    }

    // Secções de pratos
    m.sections.forEach((s) => {
      const dishes = s.dishes.filter((d) => d.name.trim());
      if (dishes.length === 0) return;
      hasContent = true;
      html += `<section class="menu__section">
        <h3 class="menu__section-title">${esc(s.icon || "🍽️")} ${esc(s.title || "Pratos")}</h3>
        ${dishes.map((d) => dishLine(d.name, d.price)).join("")}
      </section>`;
    });

    // Sobremesa
    if (m.dessert.trim()) {
      hasContent = true;
      html += `<section class="menu__section">
        <h3 class="menu__section-title">🍮 Sobremesa</h3>
        ${dishLine(m.dessert, "")}
      </section>`;
    }

    // Caixa de preço
    if (m.price.trim()) {
      html += `<div class="menu__price-box">
        <p class="menu__price-label">Menu do Dia</p>
        <p class="menu__price-value">${esc(m.price)}</p>
        ${m.includes.trim() ? `<p class="menu__price-includes">${esc(m.includes)}</p>` : ""}
      </div>`;
    }

    if (!hasContent) {
      html += `<p class="menu__empty">Escreve os pratos do dia no editor à esquerda para veres o menu aparecer aqui.</p>`;
    }

    // Rodapé
    if (m.footer.trim()) {
      html += `<footer class="menu__footer">${esc(m.footer)}</footer>`;
    }

    el.menu.innerHTML = html;
  }

  /* ---------------- Fluxo de alterações ---------------- */
  // rerenderEditor=false evita perder o foco enquanto se escreve num input
  function onChange(rerenderEditor = true) {
    save();
    renderMenu();
    if (rerenderEditor) renderSections();
  }

  function bindSimpleInputs() {
    const map = [
      ["restaurant", el.restaurant],
      ["tagline", el.tagline],
      ["date", el.date],
      ["soup", el.soup],
      ["dessert", el.dessert],
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
  el.addSection.addEventListener("click", () => {
    state.sections.push({ icon: "🍽️", title: "Nova categoria", dishes: [{ name: "", price: "" }] });
    onChange();
  });

  el.btnPrint.addEventListener("click", () => window.print());

  el.btnClear.addEventListener("click", () => {
    if (!confirm("Limpar os pratos deste dia? O nome do restaurante e o tema são mantidos.")) return;
    const keep = { restaurant: state.restaurant, tagline: state.tagline, theme: state.theme };
    state = Object.assign(defaultState(), keep, { footer: state.footer });
    fillEditor();
    onChange();
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
      .html2canvas(el.menu, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      })
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
})();
