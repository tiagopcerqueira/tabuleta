/* ============================================================
   Cópia de segurança — construção e leitura do ficheiro JSON.

   Puro: não lê nem escreve ficheiros, só transforma estruturas em texto e
   texto em estruturas. É o que permite testar a viagem completa
   exportar → importar sem browser.

   REGRA: a leitura delega toda a normalização em sanitizeSettings/sanitizeDay.
   Não existe aqui nenhuma normalização própria. Foi precisamente uma
   normalização paralela, esquecida quando as sobremesas ganharam preço, que
   transformava todas as sobremesas importadas em "[object Object]".
   ============================================================ */

import { sanitizeSettings, extractSettings } from "./settings.js";
import { sanitizeDay, isEmptyDay } from "./day.js";
import { isValidISO } from "./date.js";

export const BACKUP_APP_ID = "prato-do-dia";
export const BACKUP_VERSION = 4;

/** Versões de ficheiro que ainda sabemos ler. */
const SUPPORTED_VERSIONS = [3, 4];

export function buildBackup(settings, days, now = new Date()) {
  return {
    app: BACKUP_APP_ID,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    settings: extractSettings(settings),
    days,
  };
}

export function serializeBackup(settings, days, now = new Date()) {
  return JSON.stringify(buildBackup(settings, days, now), null, 2);
}

/**
 * Lê um ficheiro de cópia de segurança.
 * Devolve { ok: true, settings, days } ou { ok: false, reason }.
 * Nunca lança — um ficheiro inválido é um resultado, não uma exceção.
 */
export function parseBackup(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: "json" };
  }

  if (!raw || typeof raw !== "object") return { ok: false, reason: "shape" };
  if (raw.app !== BACKUP_APP_ID) return { ok: false, reason: "app" };
  if (!raw.settings || typeof raw.settings !== "object") return { ok: false, reason: "shape" };
  if (!raw.days || typeof raw.days !== "object") return { ok: false, reason: "shape" };

  // Ficheiros anteriores à numeração explícita não trazem `version`; assumimos a
  // mais antiga que sabemos ler, porque a sanitização trata das duas formas.
  const version = typeof raw.version === "number" ? raw.version : 3;
  if (!SUPPORTED_VERSIONS.includes(version)) return { ok: false, reason: "version" };

  const days = {};
  for (const date of Object.keys(raw.days)) {
    if (!isValidISO(date)) continue;
    const day = sanitizeDay(raw.days[date]);
    if (!isEmptyDay(day)) days[date] = day;
  }

  return { ok: true, version, settings: sanitizeSettings(raw.settings), days };
}
