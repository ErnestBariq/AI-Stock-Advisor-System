# invest-brain-tester

App minimale (zéro dépendance, Node 18+, pas de framework, pas de build) pour
tester les 2 workflows n8n issus de l'idée "AI Investment Brain".

Source unique des documents (prompt, analyse critique, workflows n8n, page
web) : `1 PROJECTS/Millionaire/docs/` dans le vault — plus de copies locales
dans ce dossier de code, désormais projet actif (`1 PROJECTS/Millionaire/`) :

- `wf1-chasseur-asymetrique.json` — sourcing + filtre d'asymétrie (LLM)
- `wf2-parefeu-anti-ruine.json` — pre-mortem adversarial + Kelly
- `index.html` — page web servie par `server.js`
- `millionaire.txt` / `millionaire-analyse.md` — prompt source + analyse critique

## Pré-requis

1. Importer les 2 fichiers `.json` de `1 PROJECTS/Millionaire/docs/` dans n8n
   (Thor) : menu n8n → **Import from File**. **Ré-importer à chaque mise à
   jour** de ces fichiers dans le vault.
2. Les workflows restent `inactive` par défaut. Deux façons de tester :
   - **Mode test** (par défaut) : ouvrir le workflow dans l'éditeur n8n,
     cliquer **"Listen for test event"**, puis lancer un test depuis l'app.
     Un seul appel fonctionne par clic. Chemin `/webhook-test/...`.
   - **Mode actif** (recommandé pour tester plusieurs cas d'affilée) :
     activer le toggle en haut à droite de l'éditeur pour les 2 workflows,
     puis démarrer l'app avec `N8N_TEST_MODE=false`. Chemin `/webhook/...`.

## App web (recommandé)

```powershell
$env:N8N_BASE_URL = "http://192.168.100.200:5678"   # LAN maison
# ou : $env:N8N_BASE_URL = "http://thor:5678"        # Tailscale, ailleurs
$env:N8N_TEST_MODE = "false"                          # une fois les 2 wf activés
node server.js
```

Puis ouvrir **http://localhost:4747** — formulaires pour les 2 workflows,
presets "signal fort/faible" et "edge fort/faible", résultat affiché en JSON
avec un badge de statut (ASYMÉTRIQUE / REJETÉ / ALLOUER / ATTENTE).

Le serveur Node fait proxy vers n8n (évite le CORS — le navigateur ne parle
qu'à `localhost:4747`).

## CLI (alternative)

```powershell
$env:N8N_BASE_URL = "http://192.168.100.200:5678"
$env:N8N_TEST_MODE = "false"
node test.js
```

Lance automatiquement les 4 cas de test (2 par workflow) en séquence, sortie
texte dans le terminal.

## Ce que ça teste

- **WF1 isolé** : POST `{title, description}` sur le webhook de test de
  l'évaluateur (bypass RSS/XML/boucle, direct sur l'agent LLM).
- **WF2 isolé** : POST `{source, score_opportunite, rationnel}` sur le webhook
  du Pare-Feu.

Ne teste **pas** le pipeline bout-en-bout RSS→24h (dépend du scheduler et de
hnrss.org, non déterministe) — voir l'analyse critique pour les limites de
fond du sourcing HN.

## Gotcha rencontré (05/07)

`Agent Évaluateur`/`Agent Pre-Mortem` peuvent produire une sortie qui ne
respecte pas le schéma JSON attendu ("Model output doesn't fit required
format") — ça arrivait sur les cas ambigus (signal faible). Sans `onError`
configuré sur le node Agent, ça arrête l'exécution net (webhook répond 200
avec un corps vide, ou l'exécution reste bloquée). Fix : `onError:
continueRegularOutput` sur les deux Agents + chaînage optionnel (`$json.output?.xxx`)
et valeurs de repli (`?? 0`, `?? "message par défaut"`) sur tous les champs
dérivés — en cas d'échec de parsing, le système rejette/attend par défaut
plutôt que de planter (cohérent avec la philosophie "anti-ruine, sois
impitoyable en cas de doute").

## Statut du projet

Idée non décidée ("on verra plus tard", 2026-07-05) — cet outil sert à
vérifier que les workflows *fonctionnent techniquement* après correction, pas
à valider que le concept d'investissement lui-même est solide (il ne l'est
pas en l'état, cf analyse critique).
