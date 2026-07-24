/* ============================================================
   O registo de um dia — a unidade de conteúdo da app.

   Forma canónica:
     { soup: string, dishes: string[], desserts: {name,price}[], updatedAt: string|null }

   `sanitizeDay` é o ÚNICO sítio autorizado a normalizar um dia, venha ele do
   localStorage, de um ficheiro de backup importado ou de uma migração. Existirem
   duas normalizações diferentes foi a causa exata do defeito que transformava
   todas as sobremesas importadas em "[object Object]".
   ============================================================ */

import { trimmed } from "./text.js";

/** Marca deixada pela normalização defeituosa anterior (String() sobre um objeto). */
const CORRUPTED_MARKER = "[object Object]";

export function emptyDay() {
  return { soup: "", dishes: [], desserts: [], updatedAt: null };
}

/** Três linhas em branco — o estado inicial de uma lista no editor. */
export function emptyDishes() {
  return ["", "", ""];
}

export function emptyDesserts() {
  return [
    { name: "", price: "" },
    { name: "", price: "" },
    { name: "", price: "" },
  ];
}

/**
 * Normaliza uma sobremesa qualquer para {name, price}.
 * Aceita as duas formas históricas: texto simples (esquema antigo) e objeto.
 */
function sanitizeDessert(value) {
  if (typeof value === "string") return { name: trimmed(value), price: "" };
  if (value && typeof value === "object") {
    return { name: trimmed(value.name), price: trimmed(value.price) };
  }
  return { name: "", price: "" };
}

/**
 * Uma sobremesa só conta se tiver nome — e se esse nome não for o resto de uma
 * importação corrompida. "[object Object]" nunca é um nome legítimo, por isso
 * descartá-lo repara silenciosamente os dados de quem já importou um backup
 * antes da correção, em vez de os arrastar para sempre.
 */
function isUsableDessert(dessert) {
  return dessert.name !== "" && dessert.name !== CORRUPTED_MARKER;
}

export function copyDesserts(list) {
  return (Array.isArray(list) ? list : []).map(sanitizeDessert);
}

/** Normaliza um registo de dia vindo de qualquer origem. Nunca devolve null. */
export function sanitizeDay(day) {
  if (!day || typeof day !== "object") return emptyDay();
  return {
    soup: trimmed(day.soup),
    dishes: Array.isArray(day.dishes) ? day.dishes.map(trimmed).filter((d) => d !== "") : [],
    desserts: Array.isArray(day.desserts) ? day.desserts.map(sanitizeDessert).filter(isUsableDessert) : [],
    updatedAt: typeof day.updatedAt === "string" && day.updatedAt ? day.updatedAt : null,
  };
}

/** Um dia sem sopa, sem pratos e sem sobremesas não merece ser guardado. */
export function isEmptyDay(day) {
  const clean = sanitizeDay(day);
  return clean.soup === "" && clean.dishes.length === 0 && clean.desserts.length === 0;
}

export function hasDishes(day) {
  return sanitizeDay(day).dishes.length > 0;
}

export function hasDesserts(day) {
  return sanitizeDay(day).desserts.length > 0;
}
