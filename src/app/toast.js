/* ============================================================
   Avisos passageiros.

   A região fica sempre no documento e apenas o texto muda. Antes era escondida
   com `hidden` e só revelada depois de preenchida — e uma região aria-live que
   está oculta no momento em que o conteúdo muda muitas vezes não é anunciada
   de todo por um leitor de ecrã.
   ============================================================ */

const DURATION_PLAIN = 6000;
const DURATION_WITH_ACTION = 8000;

export function createToast(node) {
  let timer = null;

  function hide() {
    node.classList.remove("is-visible");
    node.textContent = "";
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  /**
   * `action` opcional: { label, onClick }. Com ação, o aviso dura mais tempo,
   * porque é preciso lê-lo e decidir.
   */
  function show(message, action) {
    if (timer) clearTimeout(timer);
    node.textContent = "";

    const text = document.createElement("span");
    text.textContent = message;
    node.appendChild(text);

    if (action && action.label) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "pd-toast__action";
      button.textContent = action.label;
      button.addEventListener("click", () => {
        hide();
        if (typeof action.onClick === "function") action.onClick();
      });
      node.appendChild(button);
    }

    node.classList.add("is-visible");
    timer = setTimeout(hide, action ? DURATION_WITH_ACTION : DURATION_PLAIN);
  }

  return { show, hide };
}
