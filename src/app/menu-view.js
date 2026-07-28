/* ============================================================
   Vista do menu — escreve a marcação e resolve o encaixe.

   O encaixe é a parte cara: cada tentativa obriga o navegador a refazer o
   layout. A versão anterior fazia até sessenta tentativas em passos fixos, de
   forma síncrona, a cada tecla escrita. Aqui a bisseção resolve o mesmo em
   cerca de sete, e o trabalho todo acontece dentro de um frame.
   ============================================================ */

import { renderMenuHtml, countVisibleItems } from "../core/menu-html.js";
import { solveFit, shouldWarnAboutFit, initialFit } from "../core/fit.js";
import { activeTemplate, formatSize } from "../core/templates.js";

export function createMenuView({ elements }) {
  const { menu, menuWrap, fitWarning, previewHint, btnPrint } = elements;

  function applyFit(fit) {
    menu.style.setProperty("--fit", fit.toFixed(3));
  }

  /**
   * Mede se o conteúdo transborda com um dado fator.
   * Ler `scrollHeight` logo a seguir a escrever força o recálculo do layout —
   * é inevitável, e é por isso que interessa fazê-lo o menor número de vezes.
   */
  function overflowsAt(fit) {
    applyFit(fit);
    return menu.scrollHeight > menu.clientHeight + 1;
  }

  /**
   * O palpite por número de itens é o TETO, não apenas um ponto de partida.
   *
   * O conteúdo cabe na folha com fatores bem acima do que fica bonito: os
   * pratos distribuem-se pelo espaço disponível, por isso "não transborda" não
   * quer dizer "está bem composto". Deixar o fator subir até ao máximo enchia
   * a folha de texto enorme e espremido sempre que tecnicamente cabia. O
   * palpite é que traduz o juízo tipográfico; a medição só serve para reduzir
   * quando nem assim cabe.
   */
  function resolveFit(model) {
    const guess = initialFit(countVisibleItems(model), model.format);
    const { fit } = solveFit(overflowsAt, { max: guess });
    applyFit(fit);
    if (fitWarning) fitWarning.hidden = !shouldWarnAboutFit(fit);
    return fit;
  }

  /** Escala o preview para caber na coluna, sem tocar no tamanho nativo do menu. */
  function updateScale(format) {
    if (!menuWrap) return;
    const { width, height } = formatSize(format);
    const available = menuWrap.clientWidth;
    const scale = available > 0 ? Math.min(1, available / width) : 1;
    menuWrap.style.setProperty("--preview-scale", scale.toFixed(4));
    menuWrap.style.height = `${Math.round(height * scale)}px`;
  }

  function render(model) {
    menu.setAttribute("data-format", model.format);
    menu.setAttribute("data-template", activeTemplate(model));
    menu.innerHTML = renderMenuHtml(model);
    resolveFit(model);
    updateScale(model.format);
  }

  /** Texto de apoio e rótulo do botão principal, que mudam com formato e modo. */
  function updateChrome(model) {
    if (previewHint) {
      const what = model.kind === "sobremesas" ? "Pré-visualização das sobremesas" : "Pré-visualização";
      const where =
        model.format === "story" ? "story 9:16 para Instagram/Facebook" : "folha A4, pronta a imprimir";
      previewHint.textContent = `${what} — ${where}`;
    }
    if (btnPrint) {
      // O rótulo e o ícone mudam juntos, mas por vias diferentes: o texto
      // escreve-se, o ícone é o CSS que escolhe a partir de data-action. Assim
      // o botão pode trazer os dois ícones na marcação sem que trocar o rótulo
      // apague um deles.
      const story = model.format === "story";
      btnPrint.dataset.action = story ? "share" : "print";
      const label = btnPrint.querySelector(".btn__label");
      if (label) label.textContent = story ? "Partilhar" : "Imprimir / PDF";
    }
  }

  /** Recalcula sem voltar a escrever a marcação — usado ao redimensionar a janela. */
  function refit(model) {
    resolveFit(model);
    updateScale(model.format);
  }

  return { render, refit, updateChrome, updateScale };
}
