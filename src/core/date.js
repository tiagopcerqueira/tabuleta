/* ============================================================
   Datas — puras, sempre em hora LOCAL.
   Todas as datas da app são strings ISO "YYYY-MM-DD" sem hora,
   porque um menu pertence a um dia de calendário, não a um instante.
   ============================================================ */

const DIAS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Formata um Date como "YYYY-MM-DD" nos componentes LOCAIS.
 *
 * Lê-se os componentes diretamente em vez de passar por `toISOString()` com
 * compensação de fuso: essa via calcula o offset do instante errado quando o dia
 * resultante cai do outro lado de uma mudança de hora, e devolve o dia anterior.
 */
function toISODate(dt) {
  const y = String(dt.getFullYear()).padStart(4, "0");
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Data de hoje em hora local. `now` é injetável para testes. */
export function todayISO(now = new Date()) {
  return toISODate(now);
}

/** Decompõe uma data ISO válida em {y, m, d}, ou devolve null. */
export function parseISO(iso) {
  const match = ISO_RE.exec(typeof iso === "string" ? iso : "");
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  // Rejeita datas que não existem (31 de fevereiro, 30 de fevereiro em ano bissexto…)
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return { y, m, d };
}

export function isValidISO(iso) {
  return parseISO(iso) !== null;
}

/** Soma (ou subtrai) dias a uma data ISO, em hora local. Devolve "" se a entrada for inválida. */
export function addDays(iso, delta) {
  const parts = parseISO(iso);
  if (!parts) return "";
  const dt = new Date(parts.y, parts.m - 1, parts.d);
  dt.setDate(dt.getDate() + delta);
  return toISODate(dt);
}

/** "2026-07-24" → "Sexta-feira, 24 de julho de 2026". Devolve "" se inválida. */
export function formatDatePT(iso) {
  const parts = parseISO(iso);
  if (!parts) return "";
  const dt = new Date(parts.y, parts.m - 1, parts.d);
  return `${DIAS[dt.getDay()]}, ${parts.d} de ${MESES[parts.m - 1]} de ${parts.y}`;
}
