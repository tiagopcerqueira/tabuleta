/* ============================================================
   Migrações de esquema.

   Regras que valem para todas as versões futuras:

   1. As chaves antigas NÃO são apagadas. Se uma versão nova tiver um defeito,
      o utilizador pode voltar atrás com os dados intactos. O custo é alguns
      quilobytes; o benefício é nunca destruir o histórico de um restaurante.
   2. Uma migração nunca inventa dados: normaliza o que existe e descarta o que
      não é recuperável.
   3. Migrar é idempotente — correr duas vezes dá o mesmo resultado.
   4. Toda a normalização passa por sanitizeSettings/sanitizeDay. Nenhuma
      migração tem interpretação própria da forma dos dados.
   ============================================================ */

import { sanitizeSettings } from "../core/settings.js";
import { sanitizeHistory } from "../core/history.js";
import { sanitizeDay, isEmptyDay } from "../core/day.js";
import { isValidISO } from "../core/date.js";
import { SCHEMA_VERSION, GLOBAL_KEYS, LEGACY_KEYS, storeKeys } from "./keys.js";

/**
 * Lê o estado guardado, migrando-o para o esquema atual se necessário.
 * Devolve sempre um estado utilizável, mesmo que não haja nada guardado.
 */
export function loadMigrated(storage, storeId) {
  const keys = storeKeys(storeId);

  const meta = storage.readJSON(GLOBAL_KEYS.meta);
  const storedVersion = meta.ok && meta.value ? Number(meta.value.schemaVersion) || 0 : 0;

  // Caminho normal: já está na versão atual.
  if (storedVersion === SCHEMA_VERSION) {
    return {
      settings: readCurrentSettings(storage, keys),
      days: readCurrentHistory(storage, keys),
      migratedFrom: null,
    };
  }

  // Instalação nova ou vinda de um esquema anterior.
  const legacy = readLegacy(storage);
  if (legacy) {
    return { settings: legacy.settings, days: legacy.days, migratedFrom: legacy.from };
  }

  // Sem nada guardado: pode ainda assim haver dados na versão atual sem `meta`
  // (por exemplo, se a gravação do meta falhou por falta de espaço).
  return {
    settings: readCurrentSettings(storage, keys),
    days: readCurrentHistory(storage, keys),
    migratedFrom: null,
  };
}

function readCurrentSettings(storage, keys) {
  const stored = storage.readJSON(keys.settings);
  const settings = sanitizeSettings(stored.ok ? stored.value : null);
  const logo = storage.readText(keys.logo);
  // O logótipo vive à parte, mas para o resto da app faz parte das definições.
  settings.logo = sanitizeSettings({ logo: logo.ok ? logo.value : "" }).logo;
  return settings;
}

function readCurrentHistory(storage, keys) {
  const stored = storage.readJSON(keys.history);
  return sanitizeHistory(stored.ok ? stored.value : null).days;
}

/**
 * Lê os esquemas anteriores, do mais recente para o mais antigo.
 * Devolve null quando não há nada de anterior.
 */
function readLegacy(storage) {
  const v3 = readV3(storage);
  if (v3) return v3;
  return readV2(storage);
}

/** v3: definições em `:v3` e dias em `:history:v1`. */
function readV3(storage) {
  const stored = storage.readJSON(LEGACY_KEYS.v3);
  if (!stored.ok || !stored.value || typeof stored.value !== "object") return null;

  const settings = sanitizeSettings(stored.value.settings);
  const history = storage.readJSON(LEGACY_KEYS.historyV1);
  const days = sanitizeHistory(history.ok ? history.value : null).days;

  return { settings, days, from: 3 };
}

/**
 * v2: um único objeto plano, com o menu do próprio dia lá dentro em vez de num
 * histórico. Esse dia é recuperado para o histórico para não se perder.
 */
function readV2(storage) {
  const stored = storage.readJSON(LEGACY_KEYS.v2);
  if (!stored.ok || !stored.value || typeof stored.value !== "object") return null;

  const raw = stored.value;
  const settings = sanitizeSettings(raw);
  const days = {};

  if (isValidISO(raw.date)) {
    const day = sanitizeDay({ soup: raw.soup, dishes: raw.dishes, desserts: raw.desserts });
    if (!isEmptyDay(day)) days[raw.date] = day;
  }

  return { settings, days, from: 2 };
}

/** Regista que os dados já estão no esquema atual. */
export function markMigrated(storage, now = new Date()) {
  return storage.writeJSON(GLOBAL_KEYS.meta, {
    schemaVersion: SCHEMA_VERSION,
    migratedAt: now.toISOString(),
  });
}
