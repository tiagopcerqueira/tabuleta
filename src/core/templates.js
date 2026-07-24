/* ============================================================
   Catálogo de formatos e templates.

   Fonte única: acrescentar um formato ou um template é acrescentar uma entrada
   aqui — nada mais no código precisa de saber quantos existem.
   ============================================================ */

/** Dimensões nativas do canvas de cada formato, em píxeis CSS. */
export const FORMATS = {
  print: { id: "print", label: "Imprimir (A4)", width: 794, height: 1123 },
  story: { id: "story", label: "Story (9:16)", width: 1080, height: 1920 },
};

export const DEFAULT_FORMAT = "print";

export const TEMPLATES = {
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

export const DEFAULT_TEMPLATE = {
  print: "classico",
  story: "ardosia",
};

export function isFormatId(value) {
  return Object.prototype.hasOwnProperty.call(FORMATS, value);
}

export function sanitizeFormat(value) {
  return isFormatId(value) ? value : DEFAULT_FORMAT;
}

export function isTemplateId(format, value) {
  const list = TEMPLATES[format];
  return Array.isArray(list) && list.some((t) => t.id === value);
}

export function sanitizeTemplate(format, value) {
  return isTemplateId(format, value) ? value : DEFAULT_TEMPLATE[format];
}

/** Dimensões nativas do formato pedido, com recurso ao formato por omissão. */
export function formatSize(format) {
  const entry = FORMATS[format] || FORMATS[DEFAULT_FORMAT];
  return { width: entry.width, height: entry.height };
}

/** O template ativo depende do formato ativo — cada formato lembra o seu. */
export function activeTemplate(settings) {
  return settings.format === "story" ? settings.templateStory : settings.templatePrint;
}
