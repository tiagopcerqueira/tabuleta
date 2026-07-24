/* ============================================================
   Modal do menu gerado.

   Prende o foco enquanto está aberta e devolve-o a quem a abriu. Sem isto,
   quem navega por teclado carrega em Tab e sai da modal para trás da cortina,
   sem forma de perceber onde está — a modal declarava `aria-modal` sem
   cumprir nenhuma das obrigações que essa declaração implica.
   ============================================================ */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function createModal({ root, backdrop, closeButton, card }) {
  /** Elemento que tinha o foco antes de abrir — para lho devolver ao fechar. */
  let previouslyFocused = null;
  let isOpen = false;

  function focusableItems() {
    return Array.from((card || root).querySelectorAll(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement
    );
  }

  function onKeydown(event) {
    if (!isOpen) return;

    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }

    if (event.key !== "Tab") return;

    const items = focusableItems();
    if (items.length === 0) return;

    const first = items[0];
    const last = items[items.length - 1];

    // Tab no último elemento volta ao primeiro, e Shift+Tab no primeiro
    // salta para o último — é isto que mantém o foco dentro da modal.
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function open() {
    if (isOpen) return;
    previouslyFocused = document.activeElement;
    root.hidden = false;
    document.body.style.overflow = "hidden";
    isOpen = true;

    const items = focusableItems();
    (items[0] || closeButton)?.focus();
  }

  function close() {
    if (!isOpen) return;
    root.hidden = true;
    document.body.style.overflow = "";
    isOpen = false;

    if (previouslyFocused && typeof previouslyFocused.focus === "function") {
      previouslyFocused.focus();
    }
    previouslyFocused = null;
  }

  closeButton?.addEventListener("click", close);
  backdrop?.addEventListener("click", close);
  document.addEventListener("keydown", onKeydown);

  return {
    open,
    close,
    get isOpen() {
      return isOpen;
    },
  };
}
