/* ============================================================
   Exportação — imagem, impressão e partilha.

   Mantém-se o comportamento que já estava afinado e que é fácil de partir:

   - A escala de pré-visualização vive no ancestral #menu-scale, e o
     html2canvas herda-a. Durante a captura repõe-se a escala em 1 para
     exportar sempre à resolução nativa; sem isto, o texto capturado a partir
     de um preview reduzido perde os espaços.
   - Numa página normal imprime-se com o motor do navegador (texto nítido).
     Só dentro de uma iframe, onde imprimir está limitado, se recorre à imagem.
   ============================================================ */

import { buildFileName } from "../core/filename.js";

export const RESTRICTED_MESSAGE =
  "Aqui na pré-visualização não é possível guardar/imprimir. Abre a app publicada (link) ou o ficheiro em página inteira — aí funciona.";

function inIframe() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isTouch() {
  return "ontouchstart" in window || (navigator.maxTouchPoints || 0) > 0;
}

export function createExporter({ elements, getState, toast, modal }) {
  const el = elements;

  function fileNameNow() {
    const state = getState();
    return buildFileName({
      restaurant: state.restaurant,
      kind: state.kind,
      date: state.date,
      format: state.format,
    });
  }

  /**
   * Como identificar o menu fora da app — no diálogo de impressão e na partilha
   * do sistema.
   *
   * É o restaurante que se nomeia, não a ferramenta: quem imprime para PDF vê
   * este texto como nome sugerido do ficheiro, e "Tabuleta.pdf" na pasta de
   * transferências não diz nada a ninguém.
   */
  function documentTitle() {
    const state = getState();
    const restaurant = (state.restaurant || "").trim();
    const what = state.kind === "sobremesas" ? "Sobremesas" : "Prato do Dia";
    return restaurant ? `${restaurant} — ${what}` : what;
  }

  /** Captura o menu à resolução nativa do formato ativo. */
  async function renderPng(button) {
    if (typeof window.html2canvas !== "function") {
      throw new Error("html2canvas indisponível");
    }

    // Só o rótulo muda — se se escrevesse no botão inteiro, o ícone que vive
    // na marcação desaparecia à primeira exportação e não voltava.
    const label = button?.querySelector(".btn__label");
    const previousLabel = label?.textContent;
    if (button) {
      if (label) label.textContent = "A gerar…";
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
    }

    const previousScale = el.menuWrap.style.getPropertyValue("--preview-scale");
    el.menuWrap.style.setProperty("--preview-scale", "1");
    void el.menu.offsetWidth; // força o layout antes da captura

    const restore = () => {
      if (previousScale) el.menuWrap.style.setProperty("--preview-scale", previousScale);
      if (button) {
        if (label && previousLabel !== undefined) label.textContent = previousLabel;
        button.disabled = false;
        button.removeAttribute("aria-busy");
      }
    };

    try {
      // No story é o próprio template que pinta o fundo; no print força-se
      // branco para não sair transparente no PNG.
      const background = getState().format === "story" ? null : "#ffffff";
      const canvas = await window.html2canvas(el.menu, {
        scale: 2,
        backgroundColor: background,
        useCORS: true,
        logging: false,
      });
      return canvas.toDataURL("image/png");
    } finally {
      restore();
    }
  }

  function openPreview(dataUrl, forPrint = false) {
    el.modalImg.src = dataUrl;
    el.modalDownload.href = dataUrl;
    el.modalDownload.download = fileNameNow();
    el.modalHint.textContent = isTouch()
      ? "Para guardar: toca e mantém premido na imagem e escolhe “Guardar imagem”. Ou usa o botão Descarregar."
      : forPrint
        ? "Clica em Imprimir, ou botão direito na imagem → “Guardar imagem”."
        : "Clica em Descarregar, ou botão direito na imagem → “Guardar imagem”.";
    modal.open();
  }

  /**
   * Abre a imagem numa janela do tamanho de uma folha e manda imprimir.
   *
   * A imagem é criada e ligada por código, sem atributo `onload` na marcação:
   * a janela nova herda a política de segurança desta, que não permite código
   * embutido em atributos. Com o handler inline, a impressão ficava a olhar
   * para uma página que nunca chamava print().
   */
  function printFromImage(dataUrl) {
    let win = null;
    try {
      win = window.open("", "_blank");
    } catch {
      win = null;
    }

    if (!win || !win.document) {
      openPreview(dataUrl, true);
      return;
    }

    const doc = win.document;
    doc.open();
    doc.write(
      '<!doctype html><html><head><meta charset="utf-8"><title>' +
        documentTitle().replace(/[<&]/g, "") +
        "</title>" +
        "<style>@page{size:A4;margin:0}html,body{margin:0;padding:0}" +
        "img{width:100%;height:auto;display:block}</style></head><body></body></html>"
    );
    doc.close();

    const image = doc.createElement("img");
    image.alt = "";
    image.addEventListener("load", () => {
      // Uma pausa curta dá ao navegador tempo para compor antes do diálogo.
      setTimeout(() => {
        win.focus();
        win.print();
      }, 80);
    });
    image.src = dataUrl;
    doc.body.appendChild(image);
  }

  async function saveImage() {
    try {
      openPreview(await renderPng(el.btnImage));
    } catch {
      toast.show(RESTRICTED_MESSAGE);
    }
  }

  async function share() {
    let dataUrl;
    try {
      dataUrl = await renderPng(el.btnPrint);
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], fileNameNow(), { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: documentTitle() });
        return;
      }
      openPreview(dataUrl);
    } catch (error) {
      if (error && error.name === "AbortError") return; // o utilizador cancelou
      if (dataUrl) openPreview(dataUrl);
      else toast.show(RESTRICTED_MESSAGE);
    }
  }

  async function printOrShare() {
    if (getState().format === "story") {
      await share();
      return;
    }
    if (!inIframe()) {
      window.print();
      return;
    }
    try {
      printFromImage(await renderPng(el.btnPrint));
    } catch {
      toast.show(RESTRICTED_MESSAGE);
    }
  }

  function printCurrentPreview() {
    if (el.modalImg.src) printFromImage(el.modalImg.src);
  }

  return { saveImage, printOrShare, printCurrentPreview, fileNameNow };
}
