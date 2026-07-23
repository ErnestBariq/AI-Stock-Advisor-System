#!/usr/bin/env node
/**
 * Harnais de test minimal pour les 2 workflows n8n "Invest Brain"
 * (1. Le Chasseur Asymétrique, 2. Pare-Feu Anti-Ruine & Kelly).
 * Zéro dépendance (Node 18+, fetch natif). Pas de sandbox/framework.
 *
 * Usage :
 *   N8N_BASE_URL=http://192.168.100.200:5678 node test.js   (LAN maison)
 *   N8N_BASE_URL=http://thor:5678 node test.js              (Tailscale, ailleurs)
 *
 * Pré-requis : les 2 workflows corrigés doivent être importés dans n8n
 * (voir 1 PROJECTS/Millionaire/docs/wf1-chasseur-asymetrique.json et
 * wf2-parefeu-anti-ruine.json dans le vault).
 * Ils restent inactive par défaut -- les webhooks de test fonctionnent quand
 * même en mode "test" tant que le workflow est ouvert dans l'éditeur n8n
 * (bouton "Listen for test event"), ou en permanence une fois activé.
 */

const BASE_URL = process.env.N8N_BASE_URL || "http://192.168.100.200:5678";

// Tant que les workflows sont "inactive" (par défaut après import), n8n
// n'écoute les webhooks qu'en chemin /webhook-test/... ET seulement pendant
// que l'éditeur du workflow est ouvert avec "Listen for test event" cliqué.
// Une fois le workflow activé (toggle en haut à droite de l'éditeur), passer
// N8N_TEST_MODE=false pour taper sur /webhook/... en continu.
const TEST_MODE = process.env.N8N_TEST_MODE !== "false";
const WEBHOOK_PREFIX = TEST_MODE ? "webhook-test" : "webhook";

const CHASSEUR_URL = `${BASE_URL}/${WEBHOOK_PREFIX}/chasseur-test-evaluateur`;
const PAREFEU_URL = `${BASE_URL}/${WEBHOOK_PREFIX}/anti-ruine-gatekeeper`;

const evaluatorCases = [
  {
    label: "Signal fort (devrait passer le filtre d'asymétrie)",
    payload: {
      title: "Nouveau protocole open-source de compression neuronale réduit les coûts d'inférence LLM de 90%",
      description:
        "Un papier arXiv montre une rupture technique majeure dans la quantification, adoption immédiate par plusieurs labs. Brevet en cours, aucun acteur ne domine encore ce segment.",
    },
  },
  {
    label: "Signal faible (devrait être rejeté)",
    payload: {
      title: "Une PME SaaS RH lève 2M€ en série A",
      description:
        "Croissance linéaire de 20% par trimestre, marché mature et déjà concurrentiel (Workday, BambooHR, etc.).",
    },
  },
];

const parefeuCases = [
  {
    label: "Thèse à fort edge déclaré (b=50)",
    payload: {
      source: "Test manuel — edge fort",
      score_opportunite: 50,
      rationnel:
        "Rupture technologique dans la quantification LLM, adoption large en 48h, aucun concurrent établi.",
    },
  },
  {
    label: "Thèse à edge faible (b=3)",
    payload: {
      source: "Test manuel — edge faible",
      score_opportunite: 3,
      rationnel: "Levée de fonds classique sur un marché mature et concurrentiel.",
    },
  },
];

async function post(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed };
}

async function runSuite(title, url, cases) {
  console.log(`\n=== ${title} ===`);
  console.log(`POST ${url}`);
  for (const c of cases) {
    console.log(`\n--- ${c.label} ---`);
    try {
      const { status, body } = await post(url, c.payload);
      console.log(`HTTP ${status}`);
      console.log(JSON.stringify(body, null, 2));
    } catch (err) {
      console.error(`ÉCHEC RÉSEAU : ${err.message}`);
      console.error(
        "Vérifie N8N_BASE_URL, que le workflow est bien importé, et (si inactive) que l'éditeur n8n est ouvert sur ce workflow en mode 'Listen for test event'."
      );
    }
  }
}

async function run() {
  await runSuite("WF1 — Chasseur Asymétrique (évaluateur isolé)", CHASSEUR_URL, evaluatorCases);
  await runSuite("WF2 — Pare-Feu Anti-Ruine & Kelly", PAREFEU_URL, parefeuCases);
  console.log("\nTerminé.");
}

run();
