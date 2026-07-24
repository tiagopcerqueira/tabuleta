/* ============================================================
   Repositório — a única fonte de verdade sobre dados guardados.

   Duas responsabilidades, ambas nascidas de defeitos concretos:

   1. O histórico vive EM MEMÓRIA. Antes, cada tecla escrita provocava dois
      parses completos do armazenamento e duas serializações completas, porque
      gravar e recolher sugestões liam ambos o histórico do disco. Aqui lê-se
      uma vez ao arrancar e escreve-se com atraso.

   2. As falhas de gravação são COMUNICADAS. Uma escrita que falha por falta de
      espaço chama `onFailure`, para a interface poder dizê-lo. Deixar de
      guardar em silêncio é a pior coisa que esta app pode fazer a um
      restaurante.

   As escritas são separadas por canal (definições / histórico / logótipo) para
   que gravar uma frase de rodapé não reescreva a imagem do logótipo.
   ============================================================ */

import { sanitizeSettings, extractSettings } from "../core/settings.js";
import { sanitizeDay } from "../core/day.js";
import { setDay as setDayIn, sanitizeHistory, HISTORY_MAX_DAYS } from "../core/history.js";
import { storeKeys, DEFAULT_STORE_ID } from "./keys.js";
import { loadMigrated, markMigrated } from "./migrations.js";

const SAVE_DELAY_MS = 400;

const CHANNELS = ["settings", "history", "logo"];

export function createRepository({
  storage,
  storeId = DEFAULT_STORE_ID,
  onFailure = () => {},
  now = () => new Date(),
  /**
   * Envolvido em funções próprias de propósito: passar `setTimeout` e
   * `clearTimeout` diretamente faz o navegador lançar "Illegal invocation",
   * porque são chamados com o objeto do agendador como `this` em vez de
   * `window`. Em Node não acontece — foi um defeito que só aparecia no
   * navegador, com os testes todos a passar.
   */
  scheduler = {
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
  },
  saveDelayMs = SAVE_DELAY_MS,
  maxDays = HISTORY_MAX_DAYS,
} = {}) {
  const keys = storeKeys(storeId);

  const loaded = loadMigrated(storage, storeId);
  let settings = loaded.settings;
  let days = loaded.days;

  const dirty = new Set();
  let timer = null;
  /** Evita repetir o mesmo aviso a cada tecla enquanto o problema persiste. */
  let lastReportedFailure = null;

  // Se veio de um esquema anterior, escreve já na forma nova: adiar isso
  // significaria perder a migração caso o utilizador feche a app de imediato.
  if (loaded.migratedFrom !== null) {
    CHANNELS.forEach((channel) => dirty.add(channel));
    flush();
  }

  /* ---------------- Escrita ---------------- */

  function scheduleSave(channel) {
    dirty.add(channel);
    if (timer !== null) scheduler.clearTimeout(timer);
    timer = scheduler.setTimeout(() => {
      timer = null;
      flush();
    }, saveDelayMs);
  }

  function report(result) {
    if (result.ok) return true;
    if (result.reason !== lastReportedFailure) {
      lastReportedFailure = result.reason;
      onFailure(result.reason, result.error);
    }
    return false;
  }

  /** Grava agora tudo o que está pendente. Devolve true se correu tudo bem. */
  function flush() {
    if (timer !== null) {
      scheduler.clearTimeout(timer);
      timer = null;
    }
    if (dirty.size === 0) return true;

    const pending = Array.from(dirty);
    dirty.clear();
    let allOk = true;

    for (const channel of pending) {
      let result;
      if (channel === "settings") {
        // O logótipo é gravado à parte; não vai dentro das definições.
        const withoutLogo = extractSettings(settings);
        delete withoutLogo.logo;
        result = storage.writeJSON(keys.settings, withoutLogo);
      } else if (channel === "history") {
        result = storage.writeJSON(keys.history, { days });
      } else {
        result = settings.logo ? storage.writeText(keys.logo, settings.logo) : storage.remove(keys.logo);
      }

      if (!report(result)) {
        allOk = false;
        // Continua pendente para a próxima tentativa — os dados em memória
        // continuam corretos, e uma gravação futura pode ter espaço.
        dirty.add(channel);
      }
    }

    if (allOk) {
      lastReportedFailure = null;
      markMigrated(storage, now());
    }
    return allOk;
  }

  /* ---------------- Leitura ---------------- */

  const getSettings = () => settings;
  const getDays = () => days;
  const getDay = (date) => (days[date] ? { ...days[date] } : null);

  /* ---------------- Mutação ---------------- */

  function updateSettings(patch) {
    settings = sanitizeSettings({ ...settings, ...patch });
    scheduleSave("settings");
    // Mudar o logótipo passa pelo seu próprio canal para não arrastar a imagem
    // em todas as gravações de definições.
    if ("logo" in patch) scheduleSave("logo");
    return settings;
  }

  function setLogo(dataUrl) {
    return updateSettings({ logo: dataUrl || "" });
  }

  /** Grava o conteúdo de um dia. Um dia que ficou vazio é removido. */
  function saveDay(date, day) {
    days = setDayIn(days, date, day, { max: maxDays, now: now() });
    scheduleSave("history");
    return days;
  }

  /** Substitui tudo — usado pela importação de uma cópia de segurança e pelo anular. */
  function replaceAll(nextSettings, nextDays) {
    settings = sanitizeSettings(nextSettings);
    days = sanitizeHistory({ days: nextDays }).days;
    CHANNELS.forEach((channel) => dirty.add(channel));
    return flush();
  }

  /** Fotografia do estado atual, para construir uma cópia de segurança ou um "anular". */
  function snapshot() {
    return { settings: extractSettings(settings), days: { ...days } };
  }

  return {
    storeId,
    migratedFrom: loaded.migratedFrom,
    getSettings,
    getDays,
    getDay,
    updateSettings,
    setLogo,
    saveDay,
    replaceAll,
    snapshot,
    flush,
    /** Exposto só para testes e para o caminho de importação. */
    sanitizeDay,
  };
}
