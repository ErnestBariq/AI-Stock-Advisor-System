import React, { useState, useEffect, useCallback } from 'react';
import { Play, Sliders, Cpu, TrendingUp, DollarSign, Clock, Sparkles, AlertCircle } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import { runSimulation } from '../api/client';
import './Simulation.css';

const Simulation = () => {
  const [amount, setAmount] = useState(5000);
  const [durationMonths, setDurationMonths] = useState(3);
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [model, setModel] = useState('llama3');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const durationOptions = [
    { label: '1 Mois', val: 1 },
    { label: '3 Mois', val: 3 },
    { label: '5 Mois', val: 5 },
    { label: '12 Mois', val: 12 },
  ];

  const executeSimulation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await runSimulation({
        amount,
        durationMonths,
        ollamaUrl,
        model,
      });

      if (response.ok) {
        const resData = await response.json();
        setData(resData);
      } else {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Erreur lors du calcul de la simulation.');
      }
    } catch (err) {
      console.error('Simulation error:', err);
      setError(err.message || 'Impossible de se connecter au service de simulation.');
    } finally {
      setLoading(false);
    }
  }, [amount, durationMonths, ollamaUrl, model]);

  useEffect(() => {
    executeSimulation();
  }, []);

  const getDurationSliderIndex = () => {
    switch (durationMonths) {
      case 1: return 0;
      case 3: return 1;
      case 5: return 2;
      case 12: return 3;
      default: return 1;
    }
  };

  const handleSliderChange = (e) => {
    const idx = parseInt(e.target.value, 10);
    setDurationMonths(durationOptions[idx].val);
  };

  return (
    <div className="simulation-container">
      {/* Header */}
      <div className="simulation-header">
        <div>
          <h1>Simulateur d'Investissement IA</h1>
          <div className="simulation-subtitle">
            Analyse de marché par IA local (Ollama / Llama.cpp) & Backtesting Réel
          </div>
        </div>
        <div className="glass-pill active flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sky-400" />
          <span>RAG & IA Quant-Engine</span>
        </div>
      </div>

      {/* Control Glass Panel */}
      <div className="glass-container controls-glass-panel">
        {/* Budget Input */}
        <div className="input-group-glass">
          <label className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-sky-400" />
            <span>Montant à Investir (€)</span>
          </label>
          <input
            type="number"
            min="100"
            step="500"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="glass-input"
            placeholder="Ex: 5000"
          />
        </div>

        {/* Time Horizon Slider */}
        <div className="input-group-glass slider-container">
          <label className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            <span>Horizon Temporel : <strong className="text-sky-400">{durationMonths} Mois</strong></span>
          </label>
          <input
            type="range"
            min="0"
            max="3"
            step="1"
            value={getDurationSliderIndex()}
            onChange={handleSliderChange}
            className="glass-slider"
          />
          <div className="slider-labels">
            {durationOptions.map((opt, i) => (
              <span
                key={opt.val}
                onClick={() => setDurationMonths(opt.val)}
                className={`cursor-pointer transition-colors ${durationMonths === opt.val ? 'text-sky-400 font-bold' : 'hover:text-white'}`}
              >
                {opt.label}
              </span>
            ))}
          </div>
        </div>

        {/* Model Selector */}
        <div className="input-group-glass">
          <label className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-400" />
            <span>Modèle IA (Ollama / Llama.cpp)</span>
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="glass-input"
          >
            <option value="llama3">Ollama - Llama 3 (Recommandé)</option>
            <option value="mistral">Ollama - Mistral 7B</option>
            <option value="qwen">Ollama - Qwen 2.5</option>
            <option value="llama-cpp">Local - Llama.cpp Server</option>
          </select>
        </div>

        {/* Submit Button */}
        <button
          onClick={executeSimulation}
          disabled={loading || amount <= 0}
          className="btn-simulate-glass"
        >
          {loading ? (
            <>
              <span className="glass-loader"></span>
              <span>Analyse en cours...</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              <span>Simuler le Marché</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="glass-container p-4 border-red-500/40 bg-red-500/10 text-red-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Results Display */}
      {data && (
        <>
          {/* Comparison Cards & Interactive Chart */}
          <div className="comparison-hero-grid">
            {/* Left Metrics Summary */}
            <div className="glass-container comparison-card">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Synthèse Performance</span>
                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${data.ollama_used ? 'glass-pill active' : 'glass-pill'}`}>
                  {data.model_name}
                </span>
              </div>

              {/* Real Market Performance Box */}
              <div className="metric-sub-card">
                <div className="metric-label">Marché Réel (Backtest {durationMonths}M)</div>
                <div className="metric-value">{data.summary.real_market_value.toLocaleString('fr-FR')} €</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className={data.summary.real_return_eur >= 0 ? 'badge-gain' : 'badge-loss'}>
                    {data.summary.real_return_eur >= 0 ? '+' : ''}{data.summary.real_return_eur} € ({data.summary.real_return_percent}%)
                  </span>
                  <span className="text-xs text-slate-400">Période Réelle</span>
                </div>
              </div>

              {/* AI Projected Performance Box */}
              <div className="metric-sub-card border-sky-500/30">
                <div className="metric-label text-sky-300">Estimation IA Simulée</div>
                <div className="metric-value text-sky-400">{data.summary.ai_simulated_value.toLocaleString('fr-FR')} €</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="badge-gain badge-ai">
                    +{data.summary.ai_simulated_return_eur} € ({data.summary.ai_simulated_return_percent}%)
                  </span>
                  <span className="text-xs text-sky-300/70">Optimisé IA</span>
                </div>
              </div>

              <div className="text-xs text-slate-400 leading-relaxed bg-white/5 p-3 rounded-xl">
                💡 <strong>Analyse Strategique :</strong> {data.ai_rationale}
              </div>
            </div>

            {/* Right Interactive Chart Card */}
            <div className="glass-container p-6 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white margin-0">Comparaison Évolution de Portefeuille</h3>
                  <div className="text-xs text-slate-400">Marché Réel vs Prédiction IA ({durationMonths} mois)</div>
                </div>
                <div className="flex gap-2">
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Marché Réel
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-sky-400 font-medium ml-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span> IA Optimisée
                  </span>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.chart_points} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="realGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="aiGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="period" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        borderColor: 'rgba(255, 255, 255, 0.15)',
                        borderRadius: '12px',
                        backdropFilter: 'blur(12px)',
                        color: '#fff',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="real_market"
                      name="Marché Réel (€)"
                      stroke="#34d399"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#realGradient)"
                    />
                    <Area
                      type="monotone"
                      dataKey="ai_simulated"
                      name="IA Simulée (€)"
                      stroke="#38bdf8"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#aiGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recommended Stock Allocation Grid */}
          <div>
            <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-sky-400" />
              <span>Panier d'Actions Recommandé & Rendements Individuels</span>
            </h2>

            <div className="stocks-allocation-grid">
              {data.recommended_stocks.map((stock) => (
                <div key={stock.symbol} className="glass-container stock-glass-card">
                  <div className="stock-card-header">
                    <div>
                      <span className="stock-ticker-badge">{stock.symbol}</span>
                      <div className="text-xs text-slate-400 mt-1 font-medium">{stock.name}</div>
                    </div>
                    <span className="stock-alloc-tag">{stock.allocation_percent}% du capital</span>
                  </div>

                  <div className="stock-metrics-row">
                    <div>
                      <div className="text-xs text-slate-400">Montant Investi</div>
                      <div className="font-semibold text-white">{stock.allocated_amount} €</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Prix d'Achat</div>
                      <div className="font-semibold text-white">${stock.historical_buy_price}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Prix Réel Actuel</div>
                      <div className="font-semibold text-white">${stock.current_price}</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-white/10">
                    <span className="text-xs text-slate-400">Valeur Actuelle : <strong className="text-white">{stock.current_value} €</strong></span>
                    <span className={stock.return_percent >= 0 ? 'badge-gain' : 'badge-loss'}>
                      {stock.return_percent >= 0 ? '+' : ''}{stock.return_percent}%
                    </span>
                  </div>

                  <div className="stock-reason-box">
                    "{stock.reason}"
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Simulation;
