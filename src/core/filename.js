/* ============================================================
   Nome do ficheiro exportado.
   ============================================================ */

import { slugify } from "./text.js";
import { todayISO } from "./date.js";

/**
 * Nome de recurso para o cartaz, quando o restaurante ainda não tem nome.
 *
 * Descreve o CONTEÚDO, não a aplicação: o ficheiro vai parar à pasta de
 * transferências do utilizador, onde "prato-do-dia-2026-07-25-a4.png" diz o
 * que é e "tabuleta-2026-07-25-a4.png" não diz nada.
 */
const FALLBACK_BASE = "prato-do-dia";

/** A cópia de segurança é da aplicação, por isso essa leva mesmo o nome dela. */
const BACKUP_BASE = "tabuleta";

/**
 * "Tasca do Manel" + sobremesas + 2026-07-24 + story
 *   → "tasca-do-manel-sobremesas-2026-07-24-story.png"
 *
 * O nome do restaurante pode conter só símbolos (ou nada), caso em que o slug
 * sai vazio e é preciso recuar para um nome genérico — sem isto o ficheiro
 * começaria por "-" e alguns sistemas recusam-no.
 */
export function buildFileName({ restaurant, kind, date, format }, now = new Date()) {
  const base = slugify(restaurant) || FALLBACK_BASE;
  const kindPart = kind === "sobremesas" ? "-sobremesas" : "";
  const day = date || todayISO(now);
  const suffix = format === "story" ? "story" : "a4";
  return `${base}${kindPart}-${day}-${suffix}.png`;
}

/** Nome do ficheiro de cópia de segurança. */
export function buildBackupFileName(now = new Date()) {
  return `${BACKUP_BASE}-backup-${todayISO(now)}.json`;
}
