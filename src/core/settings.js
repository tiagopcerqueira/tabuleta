/* ============================================================
   Definições globais (tudo o que NÃO pertence a um dia específico).

   Descritas UMA vez em SETTINGS_FIELDS. Os valores por omissão, a sanitização
   e a extração são todos derivados desse descritor — acrescentar um campo é
   acrescentar uma linha, e é impossível um caminho de código ficar para trás.

   Antes disto, os mesmos treze campos estavam escritos por extenso em três
   funções diferentes (mais uma quarta na importação). Foi essa duplicação que
   permitiu que a importação continuasse a tratar sobremesas como texto simples
   muito depois de elas terem passado a ter preço próprio.
   ============================================================ */

import { sanitizeFormat, sanitizeTemplate } from "./templates.js";

export const DEFAULT_INCLUDES = "Sopa · Pão · Bebida · Café · Prato à escolha";
export const MAX_PHRASE_SUGGESTIONS = 20;

/* ---------------- Sanitizadores reutilizáveis ---------------- */

const asString = (fallback) => (value) => (typeof value === "string" ? value : fallback);

/** Como asString, mas uma string vazia também cai no valor por omissão. */
const asNonEmptyString = (fallback) => (value) =>
  typeof value === "string" && value.trim() !== "" ? value : fallback;

const asStringList = () => (value) =>
  Array.isArray(value) ? value.filter((s) => typeof s === "string").slice(0, MAX_PHRASE_SUGGESTIONS) : [];

const asOneOf = (allowed, fallback) => (value) => (allowed.includes(value) ? value : fallback);

/**
 * O logótipo só pode ser uma imagem embebida no próprio dispositivo.
 *
 * Sem esta verificação, um ficheiro de backup manipulado podia pôr um URL
 * arbitrário num `<img src>` e fazer a app contactar a rede — numa app cuja
 * promessa central é que nada sai do dispositivo.
 */
const asEmbeddedImage = () => (value) =>
  typeof value === "string" && /^data:image\/(png|jpeg|webp|gif|svg\+xml);/i.test(value) ? value : "";

/* ---------------- O descritor ---------------- */

export const SETTINGS_FIELDS = {
  kind: { default: "prato", sanitize: asOneOf(["prato", "sobremesas"], "prato") },
  restaurant: { default: "", sanitize: asString("") },
  tagline: { default: "", sanitize: asString("") },
  price: { default: "", sanitize: asString("") },
  includes: { default: DEFAULT_INCLUDES, sanitize: asNonEmptyString(DEFAULT_INCLUDES) },
  footer: { default: "Bom apetite!", sanitize: asString("Bom apetite!") },
  format: { default: "print", sanitize: sanitizeFormat },
  templatePrint: { default: "classico", sanitize: (value) => sanitizeTemplate("print", value) },
  templateStory: { default: "ardosia", sanitize: (value) => sanitizeTemplate("story", value) },
  logo: { default: "", sanitize: asEmbeddedImage() },
  restaurantHistory: { default: [], sanitize: asStringList() },
  taglineHistory: { default: [], sanitize: asStringList() },
  footerHistory: { default: [], sanitize: asStringList() },
};

export const SETTINGS_KEYS = Object.keys(SETTINGS_FIELDS);

/* ---------------- Derivados ---------------- */

export function defaultSettings() {
  const out = {};
  for (const key of SETTINGS_KEYS) {
    const value = SETTINGS_FIELDS[key].default;
    out[key] = Array.isArray(value) ? value.slice() : value;
  }
  return out;
}

/** Normaliza definições vindas de qualquer origem. Nunca devolve null. */
export function sanitizeSettings(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const out = {};
  for (const key of SETTINGS_KEYS) {
    out[key] = SETTINGS_FIELDS[key].sanitize(source[key]);
  }
  return out;
}

/** Retira de um objeto maior (o estado da app) só os campos de definições. */
export function extractSettings(state) {
  const out = {};
  for (const key of SETTINGS_KEYS) {
    const value = state[key];
    out[key] = Array.isArray(value) ? value.slice() : value;
  }
  return out;
}
