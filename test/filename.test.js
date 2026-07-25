import test from "node:test";
import assert from "node:assert/strict";

import { buildFileName, buildBackupFileName } from "../src/core/filename.js";

test("o nome do ficheiro junta restaurante, modo, data e formato", () => {
  assert.equal(
    buildFileName({ restaurant: "Tasca do Manel", kind: "prato", date: "2026-07-24", format: "print" }),
    "tasca-do-manel-2026-07-24-a4.png"
  );
  assert.equal(
    buildFileName({ restaurant: "Tasca do Manel", kind: "sobremesas", date: "2026-07-24", format: "story" }),
    "tasca-do-manel-sobremesas-2026-07-24-story.png"
  );
});

test("sem nome de restaurante usa um nome genérico", () => {
  assert.equal(
    buildFileName({ restaurant: "", kind: "prato", date: "2026-07-24", format: "print" }),
    "prato-do-dia-2026-07-24-a4.png"
  );
});

test("um nome só com símbolos não produz um ficheiro começado por hífen", () => {
  const nome = buildFileName({ restaurant: "!!!", kind: "prato", date: "2026-07-24", format: "print" });
  assert.equal(nome, "prato-do-dia-2026-07-24-a4.png");
  assert.equal(nome.startsWith("-"), false);
});

test("sem data usa a data de hoje", () => {
  const nome = buildFileName(
    { restaurant: "Tasca", kind: "prato", date: "", format: "print" },
    new Date(2026, 6, 24)
  );
  assert.equal(nome, "tasca-2026-07-24-a4.png");
});

test("o nome do ficheiro nunca contém caracteres problemáticos", () => {
  const nome = buildFileName({
    restaurant: 'O "Melhor" / Café \\ São João',
    kind: "prato",
    date: "2026-07-24",
    format: "print",
  });
  assert.match(nome, /^[a-z0-9-]+\.png$/);
});

/* ============================================================
   Dois nomes diferentes, de propósito: o cartaz é do restaurante e vai para a
   pasta de transferências, por isso descreve-se pelo conteúdo; a cópia de
   segurança é da aplicação, e é essa que leva o nome dela.
   ============================================================ */
test("a cópia de segurança leva o nome da aplicação e a data de hoje", () => {
  assert.equal(buildBackupFileName(new Date(2026, 6, 24)), "tabuleta-backup-2026-07-24.json");
});

test("o cartaz sem nome de restaurante descreve-se pelo conteúdo, não pela app", () => {
  const nome = buildFileName({ restaurant: "", kind: "prato", date: "2026-07-24", format: "print" });
  assert.equal(nome, "prato-do-dia-2026-07-24-a4.png");
  assert.equal(nome.includes("tabuleta"), false);
});
