/* ============================================================
   Histórico de menus — operações PURAS sobre { days: { "YYYY-MM-DD": dia } }.

   Nada aqui toca em armazenamento; recebe e devolve estruturas. É o que torna
   possível testar a poda, as sugestões e o "copiar de ontem" sem browser.

   As datas são chaves ISO, que ordenam corretamente por ordem lexicográfica —
   é por isso que `.sort()` simples é suficiente em todo o ficheiro.
   ============================================================ */

import { sanitizeDay, isEmptyDay, hasDishes, hasDesserts } from "./day.js";
import { isValidISO } from "./date.js";
import { trimmed } from "./text.js";

export const HISTORY_MAX_DAYS = 60;
export const MAX_DISH_SUGGESTIONS = 80;
export const MAX_SOUP_SUGGESTIONS = 30;

export function emptyHistory() {
  return { days: {} };
}

/**
 * Normaliza um histórico vindo de qualquer origem, descartando chaves que não
 * sejam datas válidas e dias que tenham ficado vazios depois de normalizados.
 */
export function sanitizeHistory(raw) {
  if (!raw || typeof raw !== "object" || !raw.days || typeof raw.days !== "object") {
    return emptyHistory();
  }
  const days = {};
  for (const date of Object.keys(raw.days)) {
    if (!isValidISO(date)) continue;
    const day = sanitizeDay(raw.days[date]);
    if (!isEmptyDay(day)) days[date] = day;
  }
  return { days };
}

/** Datas presentes, da mais antiga para a mais recente. */
export function sortedDates(days) {
  return Object.keys(days).sort();
}

/**
 * Corta o histórico às `max` datas mais recentes.
 * Devolve sempre um objeto novo — o chamador nunca perde o original por engano.
 */
export function pruneHistory(days, max = HISTORY_MAX_DAYS) {
  const dates = sortedDates(days);
  if (dates.length <= max) return { ...days };
  const keep = dates.slice(dates.length - max);
  const out = {};
  for (const date of keep) out[date] = days[date];
  return out;
}

/**
 * Grava (ou remove) o dia `date`. Um dia que ficou vazio é removido em vez de
 * guardado — de outro modo o histórico encheria de registos sem conteúdo e a
 * poda expulsaria dias reais.
 */
export function setDay(days, date, day, { max = HISTORY_MAX_DAYS, now = new Date() } = {}) {
  if (!isValidISO(date)) return { ...days };
  const clean = sanitizeDay(day);
  const next = { ...days };
  if (isEmptyDay(clean)) {
    delete next[date];
    return next;
  }
  next[date] = { ...clean, updatedAt: now.toISOString() };
  return pruneHistory(next, max);
}

/**
 * Data guardada mais recente anterior a `beforeDate` que satisfaça `predicate`.
 * Devolve null se não houver nenhuma.
 */
export function findPreviousDate(days, beforeDate, predicate = () => true) {
  const candidates = sortedDates(days).filter((date) => date < beforeDate && predicate(days[date], date));
  return candidates.length > 0 ? candidates[candidates.length - 1] : null;
}

/** Dia anterior mais recente que tenha pratos (não basta existir o registo). */
export function findPreviousDishesDate(days, beforeDate) {
  return findPreviousDate(days, beforeDate, hasDishes);
}

/** Dia anterior mais recente que tenha sobremesas. */
export function findPreviousDessertsDate(days, beforeDate) {
  return findPreviousDate(days, beforeDate, hasDesserts);
}

/**
 * Reúne as sugestões dos datalists a partir do histórico, dos dias mais
 * recentes para os mais antigos, sem repetir (ignorando maiúsculas).
 *
 * Termina assim que os três limites estiverem preenchidos, em vez de percorrer
 * o histórico inteiro — o que mantém o custo constante mesmo quando o histórico
 * deixar de estar limitado a 60 dias.
 */
export function collectSuggestions(days, { excludeDate = null, limits = {} } = {}) {
  const maxDishes = limits.dishes ?? MAX_DISH_SUGGESTIONS;
  const maxSoups = limits.soups ?? MAX_SOUP_SUGGESTIONS;
  const maxDesserts = limits.desserts ?? MAX_DISH_SUGGESTIONS;

  const dishes = [];
  const soups = [];
  const desserts = [];
  const seen = { dishes: new Set(), soups: new Set(), desserts: new Set() };

  const push = (bucket, list, value, max) => {
    if (list.length >= max) return;
    const name = trimmed(value);
    if (!name) return;
    const key = name.toLowerCase();
    if (seen[bucket].has(key)) return;
    seen[bucket].add(key);
    list.push(name);
  };

  const dates = sortedDates(days).reverse();
  for (const date of dates) {
    if (date === excludeDate) continue;
    if (dishes.length >= maxDishes && soups.length >= maxSoups && desserts.length >= maxDesserts) break;
    const day = days[date];
    if (!day) continue;
    push("soups", soups, day.soup, maxSoups);
    for (const dish of day.dishes || []) push("dishes", dishes, dish, maxDishes);
    for (const dessert of day.desserts || []) push("desserts", desserts, dessert?.name, maxDesserts);
  }

  return { dishes, soups, desserts };
}
