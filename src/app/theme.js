/* ============================================================
   Modo claro/escuro da interface (não do menu — o menu tem templates).
   Sem escolha guardada, segue o sistema.
   ============================================================ */

import { GLOBAL_KEYS } from "../data/keys.js";

export function createTheme({ storage, button }) {
  function prefersDark() {
    return (
      typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  }

  function currentIsDark() {
    const explicit = document.documentElement.getAttribute("data-theme");
    if (explicit === "dark") return true;
    if (explicit === "light") return false;
    return prefersDark();
  }

  function apply(mode) {
    if (mode === "light" || mode === "dark") {
      document.documentElement.setAttribute("data-theme", mode);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    if (button) {
      const dark = currentIsDark();
      // O botão diz em que modo está; qual dos dois ícones se vê é decisão do
      // CSS. Escrever o ícone daqui obrigava a saber, no JavaScript, como ele
      // é desenhado — e apagava a marcação do próprio ícone.
      button.dataset.mode = dark ? "dark" : "light";
      button.title = dark ? "Mudar para modo claro" : "Mudar para modo escuro";
      button.setAttribute("aria-pressed", String(dark));
    }
  }

  function toggle() {
    const next = currentIsDark() ? "light" : "dark";
    storage.writeText(GLOBAL_KEYS.uiTheme, next);
    apply(next);
  }

  function init() {
    const saved = storage.readText(GLOBAL_KEYS.uiTheme);
    apply(saved.ok ? saved.value : null);
    button?.addEventListener("click", toggle);
  }

  return { init, apply, toggle };
}
