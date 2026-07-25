/* ============================================================
   Migrações de esquema.

   Hoje só existe a versão 1, por isso não há nada para migrar e este ficheiro
   limita-se a ler. O mecanismo fica montado — a versão guardada é comparada
   com a atual, e é aqui que entra a primeira migração a sério.

   Regras que valem para todas as versões futuras, quando as houver:

   1. Uma migração nunca inventa dados: normaliza o que existe e descarta o que
      não é recuperável.
   2. Migrar é idempotente — correr duas vezes dá o mesmo resultado.
   3. Toda a normalização passa por sanitizeSettings/sanitizeDay. Nenhuma
      migração tem interpretação própria da forma dos dados; foi precisamente
      uma normalização paralela que, no protótipo anterior, transformava as
      sobremesas importadas em "[object Object]".
   4. Escrever no esquema novo sem apagar o antigo, para que uma versão com
      defeito possa ser revertida sem destruir o histórico de um restaurante.
   ============================================================ */

import { sanitizeSettings } from "../core/settings.js";
import { sanitizeHistory } from "../core/history.js";
import { SCHEMA_VERSION, GLOBAL_KEYS, storeKeys } from "./keys.js";

/**
 * Lê o estado guardado, migrando-o para o esquema atual se necessário.
 * Devolve sempre um estado utilizável, mesmo que não haja nada guardado.
 */
export function loadMigrated(storage, storeId) {
  const keys = storeKeys(storeId);

  const meta = storage.readJSON(GLOBAL_KEYS.meta);
  const storedVersion = meta.ok && meta.value ? Number(meta.value.schemaVersion) || 0 : 0;

  // Não há versões anteriores para converter. `migratedFrom` continua a fazer
  // parte do contrato porque é o que a app usa para saber que deve gravar já.
  const migratedFrom = storedVersion !== 0 && storedVersion !== SCHEMA_VERSION ? storedVersion : null;

  return {
    settings: readSettings(storage, keys),
    days: readHistory(storage, keys),
    migratedFrom,
  };
}

function readSettings(storage, keys) {
  const stored = storage.readJSON(keys.settings);
  const settings = sanitizeSettings(stored.ok ? stored.value : null);
  // O logótipo vive à parte, mas para o resto da app faz parte das definições.
  const logo = storage.readText(keys.logo);
  settings.logo = sanitizeSettings({ logo: logo.ok ? logo.value : "" }).logo;
  return settings;
}

function readHistory(storage, keys) {
  const stored = storage.readJSON(keys.history);
  return sanitizeHistory(stored.ok ? stored.value : null).days;
}

/** Regista que os dados estão no esquema atual. */
export function markMigrated(storage, now = new Date()) {
  return storage.writeJSON(GLOBAL_KEYS.meta, {
    schemaVersion: SCHEMA_VERSION,
    migratedAt: now.toISOString(),
  });
}
