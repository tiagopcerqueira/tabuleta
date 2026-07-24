#!/usr/bin/env node
/* ============================================================
   Servidor estático para desenvolvimento.

   Os módulos ES não carregam a partir de file:// (o navegador trata cada
   ficheiro como uma origem distinta e bloqueia os imports), por isso ver a app
   localmente exige servi-la por http. Sem dependências: só a biblioteca do
   Node.

     npm run serve      → http://localhost:8080
   ============================================================ */

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 8080);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    // normalize() impede que "../" saia da pasta do projeto
    const requested = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
    let path = join(ROOT, requested);

    const info = await stat(path).catch(() => null);
    if (!info) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Não encontrado");
      return;
    }
    if (info.isDirectory()) path = join(path, "index.html");

    const body = await readFile(path);
    res.writeHead(200, {
      "content-type": TYPES[extname(path)] || "application/octet-stream",
      // Sem cache: em desenvolvimento quer-se sempre o ficheiro acabado de gravar
      "cache-control": "no-store",
    });
    res.end(body);
  } catch (error) {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end(`Erro: ${error.message}`);
  }
});

server.listen(PORT, () => {
  console.log(`Prato do Dia em http://localhost:${PORT}`);
});
