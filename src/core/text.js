/* ============================================================
   Utilidades de texto — puras, sem DOM.
   ============================================================ */

const HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escapa texto para interpolação segura em HTML.
 *
 * Escapa também `'` — não é estritamente necessário enquanto todos os atributos
 * usarem aspas duplas, mas essa é uma invariante fácil de quebrar sem reparar,
 * e `&#39;` renderiza exatamente como `'`. Custo zero, uma classe de bug a menos.
 */
export function esc(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

/** Texto normalizado: sempre string, sempre sem espaços nas pontas. */
export function trimmed(value) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

/**
 * Converte texto livre num segmento de nome de ficheiro seguro:
 * sem acentos, minúsculas, só [a-z0-9-].
 */
export function slugify(value) {
  return trimmed(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Insere uma frase no topo de uma lista de sugestões.
 * Deduplica sem distinguir maiúsculas e corta ao limite. Nunca muta a entrada.
 */
export function rememberPhrase(list, value, max) {
  const phrase = trimmed(value);
  const safeList = Array.isArray(list) ? list.filter((s) => typeof s === "string") : [];
  if (!phrase) return safeList;
  const key = phrase.toLowerCase();
  const next = safeList.filter((s) => s.toLowerCase() !== key);
  next.unshift(phrase);
  return next.slice(0, max);
}
