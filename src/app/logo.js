/* ============================================================
   Logótipo — ler, reduzir e comprimir.

   O logótipo é o maior valor que esta app guarda, e o armazenamento do
   navegador é pequeno. Guardá-lo sempre como PNG, como antes, chegava a
   ocupar várias centenas de kilobytes para uma fotografia — o suficiente
   para, com o histórico, encher o armazenamento e fazer falhar gravações.

   WebP com qualidade dá tipicamente cinco a dez vezes menos, mantém a
   transparência de que os logótipos precisam, e é suportado por todos os
   navegadores que conseguem instalar esta app. Onde não existir, o
   navegador devolve PNG e o resultado é o de antes.
   ============================================================ */

export const MAX_LOGO_SIDE = 480;
const WEBP_QUALITY = 0.85;

/** Um navegador sem WebP devolve PNG em silêncio; é assim que se deteta. */
function encode(canvas) {
  const webp = canvas.toDataURL("image/webp", WEBP_QUALITY);
  if (webp.startsWith("data:image/webp")) {
    const png = canvas.toDataURL("image/png");
    // Para logótipos muito simples (poucas cores, linhas nítidas) o PNG chega a
    // ser menor. Escolhe-se sempre o mais pequeno dos dois.
    return webp.length <= png.length ? webp : png;
  }
  return canvas.toDataURL("image/png");
}

function drawScaled(image, maxSide) {
  let width = image.naturalWidth || image.width;
  let height = image.naturalHeight || image.height;
  if (!width || !height) return null;

  const scale = Math.min(1, maxSide / Math.max(width, height));
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, width, height);
  return canvas;
}

/**
 * Lê um ficheiro de imagem e devolve uma imagem embebida, já reduzida.
 * Rejeita com uma mensagem pronta a mostrar.
 */
export function loadLogoFromFile(file, { maxSide = MAX_LOGO_SIDE } = {}) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("Nenhum ficheiro escolhido."));
      return;
    }
    if (file.type && !file.type.startsWith("image/")) {
      reject(new Error("Esse ficheiro não é uma imagem."));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = drawScaled(image, maxSide);
        if (!canvas) {
          reject(new Error("Não foi possível ler essa imagem."));
          return;
        }
        try {
          resolve(encode(canvas));
        } catch {
          reject(new Error("Não foi possível processar essa imagem."));
        }
      };
      image.onerror = () => reject(new Error("Não foi possível ler essa imagem."));
      image.src = String(reader.result || "");
    };

    reader.onerror = () => reject(new Error("Não foi possível ler esse ficheiro."));
    reader.readAsDataURL(file);
  });
}
