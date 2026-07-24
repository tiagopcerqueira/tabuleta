#!/usr/bin/env node
/* ============================================================
   Versionamento a partir de uma fonte única.

   A versão do package.json é escrita no index.html, no sw.js e no manifest,
   e a lista de ficheiros que o service worker pré-carrega é gerada varrendo
   src/. Antes, a versão estava repetida em cinco sítios à mão e a lista era
   mantida manualmente — esquecer um deles servia ficheiros de versões
   diferentes ao mesmo utilizador, ou deixava um módulo de fora do offline.

   Uso:
     node tools/release.js            aplica a versão atual do package.json
     node tools/release.js --check    só verifica (é o que corre no CI)
     node tools/release.js --patch    sobe a versão e aplica
     node tools/release.js --minor
     node tools/release.js --major
   ============================================================ */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");
const bump = ["major", "minor", "patch"].find((level) => args.has(`--${level}`));

const problems = [];
const changes = [];

/* ---------------- Versão ---------------- */

const packagePath = join(ROOT, "package.json");
const pkg = JSON.parse(readFileSync(packagePath, "utf8"));

function nextVersion(current, level) {
  const [major, minor, patch] = current.split(".").map(Number);
  if (level === "major") return `${major + 1}.0.0`;
  if (level === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

const version = bump ? nextVersion(pkg.version, bump) : pkg.version;

if (bump) {
  pkg.version = version;
  writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + "\n");
  changes.push(`package.json → ${version}`);
}

/* ---------------- Ficheiros da app ---------------- */

/**
 * Ficheiros de um tipo dentro de uma pasta, em caminhos relativos à raiz.
 *
 * Varrer em vez de manter listas à mão é o que garante que um módulo ou uma
 * folha de estilo nova entra na cache offline sem ninguém se lembrar disso.
 */
function collectFiles(dir, extension) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectFiles(full, extension));
    else if (entry.endsWith(extension)) out.push(relative(ROOT, full).split(/[\\/]/).join("/"));
  }
  return out.sort();
}

const modules = collectFiles(join(ROOT, "src"), ".js");
const stylesheets = collectFiles(join(ROOT, "styles"), ".css");
const entryModule = "src/main.js";

const STATIC_ASSETS = ["./", "index.html", "manifest.json", `assets/html2canvas.min.js?v=${version}`];

const FONT_AND_ICON_ASSETS = [
  "assets/fonts/fraunces-roman.woff2",
  "assets/fonts/fraunces-italic.woff2",
  "assets/fonts/archivo.woff2",
  "assets/fonts/oswald.woff2",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/icon-512-maskable.png",
];

// As folhas de estilo e o ponto de entrada levam ?v=, porque é assim que o
// index.html os pede. Os restantes módulos são importados por caminho simples
// e têm de constar sem query, ou o service worker não os encontra.
const assets = [
  ...STATIC_ASSETS,
  ...stylesheets.map((sheet) => `${sheet}?v=${version}`),
  `${entryModule}?v=${version}`,
  ...modules.filter((module) => module !== entryModule),
  ...FONT_AND_ICON_ASSETS,
];

/* ---------------- Aplicar ---------------- */

function updateFile(relativePath, transform) {
  const path = join(ROOT, relativePath);
  const before = readFileSync(path, "utf8");
  const after = transform(before);
  if (before === after) return;

  if (checkOnly) problems.push(`${relativePath} está desatualizado`);
  else {
    writeFileSync(path, after);
    changes.push(relativePath);
  }
}

// index.html: todas as referências ?v=
updateFile("index.html", (text) => text.replace(/\?v=[\w.]+/g, `?v=${version}`));

// sw.js: a versão e a lista de ficheiros
updateFile("sw.js", (text) => {
  const list = assets.map((asset) => `  ${JSON.stringify(asset)},`).join("\n");
  return text
    .replace(/const VERSION = "[^"]*"; \/\* gerado \*\//, `const VERSION = "${version}"; /* gerado */`)
    .replace(/const ASSETS = \[[\s\S]*?\n\];/, `const ASSETS = [\n${list}\n];`);
});

// manifest.json: a versão, para se saber o que está instalado
updateFile("manifest.json", (text) => {
  const manifest = JSON.parse(text);
  manifest.version = version;
  return JSON.stringify(manifest, null, 2) + "\n";
});

/* ---------------- Resultado ---------------- */

if (checkOnly) {
  if (problems.length > 0) {
    console.error("Versionamento incoerente:");
    problems.forEach((problem) => console.error(`  - ${problem}`));
    console.error(`\nCorrige com: npm run release`);
    process.exit(1);
  }
  console.log(`Versionamento coerente (v${version}, ${assets.length} ficheiros em cache).`);
} else {
  console.log(`Versão ${version} aplicada (${assets.length} ficheiros em cache).`);
  changes.forEach((change) => console.log(`  - ${change}`));
  if (changes.length === 0) console.log("  (já estava atualizado)");
}
