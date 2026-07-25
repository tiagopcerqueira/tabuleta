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

export const BACKUP_APP_ID = "tabuleta";
export const BACKUP_VERSION = 1;

/**
 * Versões de ficheiro que sabemos ler.
 *
 * Quando o formato mudar, a versão antiga fica aqui e a leitura passa a
 * ramificar — nunca a recusar cópias que alguém já tenha em disco. Um ficheiro
 * de segurança que a app deixa de aceitar falha exatamente no momento em que
 * era preciso.
 */
const SUPPORTED_VERSIONS = [1];

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

  const version = typeof raw.version === "number" ? raw.version : BACKUP_VERSION;
  if (!SUPPORTED_VERSIONS.includes(version)) return { ok: false, reason: "version" };

  const days = {};
  for (const date of Object.keys(raw.days)) {
    if (!isValidISO(date)) continue;
    const day = sanitizeDay(raw.days[date]);
    if (!isEmptyDay(day)) days[date] = day;
  }

  return { ok: true, version, settings: sanitizeSettings(raw.settings), days };
}
