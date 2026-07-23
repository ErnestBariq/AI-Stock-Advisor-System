#!/usr/bin/env node
/**
 * Serveur minimal (zéro dépendance, http natif) pour l'app web de test des
 * workflows n8n "Invest Brain". Sert index.html et proxy les appels vers n8n
 * (évite le CORS -- le navigateur ne parle qu'à ce serveur local).
 *
 * Usage :
 *   $env:N8N_BASE_URL="http://192.168.100.200:5678"
 *   $env:N8N_TEST_MODE="false"   (une fois les 2 wf activés dans n8n)
 *   node server.js
 *   -> http://localhost:4747
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 4747;
const BASE_URL = process.env.N8N_BASE_URL || "http://192.168.100.200:5678";
const TEST_MODE = process.env.N8N_TEST_MODE !== "false";
const WEBHOOK_PREFIX = TEST_MODE ? "webhook-test" : "webhook";

// index.html vit dans le vault (source unique avec le prompt/l'analyse/les
// workflows n8n), pas dans ce dossier de code.
const VAULT_DOCS_DIR = process.env.VAULT_DOCS_DIR
  || "C:\\Users\\SURFACE\\Documents\\Claude\\1 PROJECTS\\Millionaire\\docs";

const ROUTES = {
  "/api/wf1": `${BASE_URL}/${WEBHOOK_PREFIX}/chasseur-test-evaluateur`,
  "/api/wf2": `${BASE_URL}/${WEBHOOK_PREFIX}/anti-ruine-gatekeeper`,
};

function send(res, status, body, contentType) {
  res.writeHead(status, { "Content-Type": contentType || "application/json; charset=utf-8" });
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    const html = fs.readFileSync(path.join(VAULT_DOCS_DIR, "index.html"), "utf8");
    return send(res, 200, html, "text/html; charset=utf-8");
  }

  if (req.method === "GET" && req.url === "/api/config") {
    return send(res, 200, JSON.stringify({ baseUrl: BASE_URL, testMode: TEST_MODE, webhookPrefix: WEBHOOK_PREFIX }));
  }

  if (req.method === "POST" && ROUTES[req.url]) {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const upstream = await fetch(ROUTES[req.url], {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        const text = await upstream.text();
        send(res, upstream.status, text || "{}");
      } catch (err) {
        send(res, 502, JSON.stringify({ error: err.message, hint: `Impossible de joindre ${ROUTES[req.url]}` }));
      }
    });
    return;
  }

  send(res, 404, JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`invest-brain-tester UI : http://localhost:${PORT}`);
  console.log(`n8n cible : ${BASE_URL} (mode ${TEST_MODE ? "test — /webhook-test/" : "actif — /webhook/"})`);
});
