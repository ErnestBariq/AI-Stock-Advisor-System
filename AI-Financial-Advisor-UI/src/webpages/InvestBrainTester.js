// InvestBrainTester.js
// Ported from 1 PROJECTS/Millionaire/docs/index.html: manual tester for the two
// n8n workflows behind the Advisor's investment logic (Chasseur Asymetrique +
// Pare-Feu Anti-Ruine & Kelly). Calls the backend proxy (/api/config, /api/wf1,
// /api/wf2) which forwards to n8n so the browser never needs the n8n URL.
import React, { useEffect, useState } from 'react';
import './InvestBrainTester.css';

const BASE_URL = 'http://localhost:5000';

const PRESETS = {
  wf1: {
    fort: {
      title: "Nouveau protocole open-source de compression neuronale réduit les coûts d'inférence LLM de 90%",
      desc: "Un papier arXiv montre une rupture technique majeure dans la quantification, adoption immédiate par plusieurs labs. Brevet en cours, aucun acteur ne domine encore ce segment.",
    },
    faible: {
      title: "Une PME SaaS RH lève 2M€ en série A",
      desc: "Croissance linéaire de 20% par trimestre, marché mature et déjà concurrentiel (Workday, BambooHR, etc.).",
    },
  },
  wf2: {
    fort: {
      source: "Test manuel — edge fort",
      score: 50,
      rationnel: "Rupture technologique dans la quantification LLM, adoption large en 48h, aucun concurrent établi.",
    },
    faible: {
      source: "Test manuel — edge faible",
      score: 3,
      rationnel: "Levée de fonds classique sur un marché mature et concurrentiel.",
    },
  },
};

// Renders known wf1 ({est_asymetrique, rationnel_asymetrique, score_opportunite}) and
// wf2 ({recommandation, source, f_star_pct, p, b, rapport_pre_mortem} -- cf
// wf2-parefeu-anti-ruine.json "3. Décision & Réponse" node) output shapes as readable
// cards instead of raw JSON. Falls back to <pre> JSON for errors / unknown shapes.
function ResultBadge({ status, body }) {
  const payload = Array.isArray(body) && body[0] ? body[0] : body;
  const out = payload && payload.output ? payload.output : payload;
  const isSuccess = status >= 200 && status < 300;

  if (isSuccess && out && typeof out.est_asymetrique === 'boolean') {
    const badgeClass = out.est_asymetrique ? 'ok' : 'hold';
    return (
      <div className="result-card">
        <span className={`badge ${badgeClass}`}>
          {out.est_asymetrique ? 'ASYMÉTRIQUE ✓' : 'REJETÉ'}
        </span>
        {typeof out.score_opportunite === 'number' && (
          <div className="result-stats">
            <div>
              Score d'opportunité : <strong>{out.score_opportunite}/100</strong>
            </div>
          </div>
        )}
        {out.rationnel_asymetrique && <p className="result-text">{out.rationnel_asymetrique}</p>}
      </div>
    );
  }

  if (isSuccess && out && out.recommandation) {
    const badgeClass = out.recommandation === 'ALLOUER' ? 'ok' : 'hold';
    return (
      <div className="result-card">
        <span className={`badge ${badgeClass}`}>{out.recommandation}</span>
        <div className="result-stats">
          {out.f_star_pct !== undefined && (
            <div>
              Kelly (f*) : <strong>{out.f_star_pct}%</strong>
            </div>
          )}
          {out.p !== undefined && (
            <div>
              p : <strong>{out.p}</strong>
            </div>
          )}
          {out.b !== undefined && (
            <div>
              b : <strong>{out.b}</strong>
            </div>
          )}
        </div>
        {out.rapport_pre_mortem && <p className="result-text">{out.rapport_pre_mortem}</p>}
      </div>
    );
  }

  return (
    <>
      <span className={`badge ${isSuccess ? 'hold' : 'err'}`}>HTTP {status}</span>
      <pre>{JSON.stringify(body, null, 2)}</pre>
    </>
  );
}

function InvestBrainTester() {
  const [statusText, setStatusText] = useState('Chargement config...');

  const [wf1Title, setWf1Title] = useState(PRESETS.wf1.fort.title);
  const [wf1Desc, setWf1Desc] = useState(PRESETS.wf1.fort.desc);
  const [wf1Result, setWf1Result] = useState(null);
  const [wf1Running, setWf1Running] = useState(false);

  const [wf2Source, setWf2Source] = useState('Test manuel — edge fort');
  const [wf2Score, setWf2Score] = useState(50);
  const [wf2Rationnel, setWf2Rationnel] = useState(PRESETS.wf2.fort.rationnel);
  const [wf2Result, setWf2Result] = useState(null);
  const [wf2Running, setWf2Running] = useState(false);

  useEffect(() => {
    fetch(`${BASE_URL}/api/config`)
      .then((res) => res.json())
      .then((cfg) => {
        setStatusText(
          `n8n : ${cfg.baseUrl} — mode : ${
            cfg.testMode
              ? "TEST (/webhook-test/, 1 appel après 'Listen for test event')"
              : 'ACTIF (/webhook/, en continu)'
          }`
        );
      })
      .catch(() => setStatusText('Impossible de charger la config du serveur.'));
  }, []);

  const loadPresetWf1 = (key) => {
    setWf1Title(PRESETS.wf1[key].title);
    setWf1Desc(PRESETS.wf1[key].desc);
  };

  const loadPresetWf2 = (key) => {
    setWf2Source(PRESETS.wf2[key].source);
    setWf2Score(PRESETS.wf2[key].score);
    setWf2Rationnel(PRESETS.wf2[key].rationnel);
  };

  const callApi = async (route, payload, setResult, setRunning) => {
    setRunning(true);
    setResult(null);
    try {
      const response = await fetch(`${BASE_URL}${route}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
      setResult({ status: response.status, body });
    } catch (error) {
      setResult({ status: 0, body: { networkError: error.message } });
    } finally {
      setRunning(false);
    }
  };

  const runWf1 = () =>
    callApi('/api/wf1', { title: wf1Title, description: wf1Desc }, setWf1Result, setWf1Running);

  const runWf2 = () =>
    callApi(
      '/api/wf2',
      { source: wf2Source, score_opportunite: Number(wf2Score), rationnel: wf2Rationnel },
      setWf2Result,
      setWf2Running
    );

  return (
    <div className="invest-brain-tester">
      <h1>🎯 Invest Brain — Tester</h1>
      <div className="subtitle">
        App minimale pour tester les 2 workflows n8n corrigés (Chasseur Asymétrique + Pare-Feu
        Anti-Ruine &amp; Kelly).
      </div>

      <div className="status-bar">{statusText}</div>

      <div className="grid">
        <div className="card">
          <h2>1. Chasseur Asymétrique</h2>
          <div className="desc">
            Teste l'évaluateur seul (bypass RSS/24h). POST direct sur l'agent LLM.
          </div>

          <label>Titre</label>
          <input value={wf1Title} onChange={(e) => setWf1Title(e.target.value)} />

          <label>Description</label>
          <textarea value={wf1Desc} onChange={(e) => setWf1Desc(e.target.value)} />

          <div className="presets">
            <button onClick={() => loadPresetWf1('fort')}>Preset : signal fort</button>
            <button onClick={() => loadPresetWf1('faible')}>Preset : signal faible</button>
          </div>

          <button className="run" onClick={runWf1} disabled={wf1Running}>
            {wf1Running ? 'En cours (LLM, peut prendre 10-60s)...' : 'Tester ▸'}
          </button>

          <div className="result">
            {wf1Result && <ResultBadge status={wf1Result.status} body={wf1Result.body} />}
          </div>
        </div>

        <div className="card">
          <h2>2. Pare-Feu Anti-Ruine &amp; Kelly</h2>
          <div className="desc">
            Teste le Pre-Mortem + calcul de Kelly (plafonné à 5%). POST direct, sans passer par le
            wf1.
          </div>

          <label>Source</label>
          <input value={wf2Source} onChange={(e) => setWf2Source(e.target.value)} />

          <label>Score d'opportunité (b, multiple potentiel)</label>
          <input type="number" value={wf2Score} onChange={(e) => setWf2Score(e.target.value)} />

          <label>Rationnel</label>
          <textarea value={wf2Rationnel} onChange={(e) => setWf2Rationnel(e.target.value)} />

          <div className="presets">
            <button onClick={() => loadPresetWf2('fort')}>Preset : edge fort (b=50)</button>
            <button onClick={() => loadPresetWf2('faible')}>Preset : edge faible (b=3)</button>
          </div>

          <button className="run" onClick={runWf2} disabled={wf2Running}>
            {wf2Running ? 'En cours (LLM, peut prendre 10-60s)...' : 'Tester ▸'}
          </button>

          <div className="result">
            {wf2Result && <ResultBadge status={wf2Result.status} body={wf2Result.body} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvestBrainTester;
