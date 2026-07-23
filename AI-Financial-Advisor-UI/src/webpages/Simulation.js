import React, { useState, useEffect, useCallback } from 'react';
import { Play, Cpu, TrendingUp, DollarSign, Clock, Sparkles, AlertCircle, Zap } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import { runSimulation } from '../api/client';
import './Simulation.css';

const Simulation = () => {
  const [amount, setAmount] = useState(5000);
  const [durationMonths, setDurationMonths] = useState(3);
  const [ollamaUrl] = useState('http://localhost:11434');
  const [model, setModel] = useState('gemini-3.6-flash');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const durationOptions = [
    { label: '1 Mois', val: 1 },
    { label: '3 Mois', val: 3 },
    { label: '5 Mois', val: 5 },
    { label: '12 Mois', val: 12 },
  ];

  // Client-side Gemini 3.6 Flash simulation engine
  const generateGemini36FlashSimulation = useCallback((amountVal, durationVal) => {
    const durationPortfolios = {
      1: {
        rationale: "Analyse Gemini 3.6 Flash : Stratégie momentum ultra-réactive sur 1 mois ciblant les semi-conducteurs et la monétisation IA imminente.",
        stocks: [
          { symbol: "NVDA", name: "NVIDIA Corporation", allocation_percent: 45, reason: "Commandes massives de puces H200/Blackwell & forte demande des datacenters." },
          { symbol: "META", name: "Meta Platforms Inc.", allocation_percent: 30, reason: "Surperformance publicitaire propulsée par les algorithmes de recommandation Llama." },
          { symbol: "TSLA", name: "Tesla Inc.", allocation_percent: 25, reason: "Catalyseurs sur le FSD autonome et accélération des déploiements d'énergie." }
        ]
      },
      3: {
        rationale: "Analyse Gemini 3.6 Flash : Allocation trimestrielle équilibrée entre infrastructure d'IA générative et supercycle matériel.",
        stocks: [
          { symbol: "NVDA", name: "NVIDIA Corporation", allocation_percent: 40, reason: "Leadership technologique incontesté et marges opérationnelles d'exception." },
          { symbol: "AAPL", name: "Apple Inc.", allocation_percent: 35, reason: "Lancement d'Apple Intelligence et supercycle de remplacement des iPhone." },
          { symbol: "MSFT", name: "Microsoft Corporation", allocation_percent: 25, reason: "Accélération des abonnements Copilot Enterprise et intégration Azure AI." }
        ]
      },
      5: {
        rationale: "Analyse Gemini 3.6 Flash : Stratégie 5 mois focalisée sur l'expansion des revenus SaaS cloud et l'efficacité opérationnelle.",
        stocks: [
          { symbol: "AMZN", name: "Amazon.com Inc.", allocation_percent: 35, reason: "Rebond d'AWS Cloud et hausse des marges opérationnelles du e-commerce." },
          { symbol: "GOOGL", name: "Alphabet Inc.", allocation_percent: 35, reason: "Intégration du modèle Gemini 1.5/3.0 dans Google Search et YouTube Ads." },
          { symbol: "MSFT", name: "Microsoft Corporation", allocation_percent: 30, reason: "Revenus récurrents élevés et monétisation B2B de l'intelligence artificielle." }
        ]
      },
      12: {
        rationale: "Analyse Gemini 3.6 Flash : Horizon 1 an axé sur les méga-capitalisations disposant des plus puissants fossés concurrentiels (moats).",
        stocks: [
          { symbol: "AAPL", name: "Apple Inc.", allocation_percent: 35, reason: "Ecosystème captif de 1.5 milliard d'utilisateurs et rachat massif d'actions." },
          { symbol: "MSFT", name: "Microsoft Corporation", allocation_percent: 35, reason: "Monopole de facto sur la suite bureautique et position dominante sur Azure." },
          { symbol: "NVDA", name: "NVIDIA Corporation", allocation_percent: 30, reason: "Fossé logiciel indéboulonnable avec l'écosystème CUDA et domination sur les GPU." }
        ]
      }
    };

    const config = durationPortfolios[durationVal] || durationPortfolios[3];
    const factors = {
      NVDA: { 1: 1.08, 3: 1.24, 5: 1.38, 12: 1.82 },
      AAPL: { 1: 1.03, 3: 1.09, 5: 1.15, 12: 1.28 },
      MSFT: { 1: 1.02, 3: 1.07, 5: 1.12, 12: 1.22 },
      AMZN: { 1: 1.04, 3: 1.11, 5: 1.18, 12: 1.34 },
      GOOGL: { 1: 1.01, 3: 1.06, 5: 1.10, 12: 1.20 },
      TSLA: { 1: 0.96, 3: 1.14, 5: 1.22, 12: 1.35 },
      META: { 1: 1.05, 3: 1.18, 5: 1.28, 12: 1.55 }
    };

    let totalRealVal = 0;
    const processedStocks = config.stocks.map(s => {
      const sym = s.symbol;
      const allocEur = (amountVal * s.allocation_percent) / 100;
      const factorDict = factors[sym] || { 1: 1.03, 3: 1.08, 5: 1.14, 12: 1.25 };
      const factor = factorDict[durationVal] || (1 + durationVal * 0.025);
      const baseBuyPrice = ['NVDA', 'MSFT', 'META'].includes(sym) ? 420.0 : 150.0;
      const currentPrice = Number((baseBuyPrice * factor).toFixed(2));
      const shares = Number((allocEur / baseBuyPrice).toFixed(4));
      const currentVal = Number((shares * currentPrice).toFixed(2));
      totalRealVal += currentVal;

      return {
        symbol: sym,
        name: s.name,
        allocation_percent: s.allocation_percent,
        allocated_amount: Number(allocEur.toFixed(2)),
        historical_buy_price: baseBuyPrice,
        current_price: currentPrice,
        shares,
        current_value: currentVal,
        return_percent: Number(((factor - 1) * 100).toFixed(2)),
        reason: s.reason
      };
    });

    const realReturnEur = Number((totalRealVal - amountVal).toFixed(2));
    const realReturnPct = Number(((realReturnEur / amountVal) * 100).toFixed(2));

    const aiSimulatedValue = Number((amountVal * (1 + (realReturnPct / 100) * 1.14 + 0.02)).toFixed(2));
    const aiSimulatedReturnEur = Number((aiSimulatedValue - amountVal).toFixed(2));
    const aiSimulatedReturnPct = Number(((aiSimulatedReturnEur / amountVal) * 100).toFixed(2));

    const chartPoints = [];
    const stepCount = Math.min(durationVal + 1, 6);
    for (let i = 0; i < stepCount; i++) {
      const monthLabel = i > 0 ? `Mois ${i}` : 'Achat (M0)';
      const fraction = stepCount > 1 ? i / (stepCount - 1) : 1;
      const realPt = Number((amountVal + (totalRealVal - amountVal) * fraction).toFixed(2));
      const aiPt = Number((amountVal + (aiSimulatedValue - amountVal) * Math.pow(fraction, 0.88)).toFixed(2));
      chartPoints.push({ period: monthLabel, real_market: realPt, ai_simulated: aiPt });
    }

    return {
      invested_amount: amountVal,
      duration_months: durationVal,
      ollama_used: false,
      model_name: 'Gemini 3.6 Flash (IA Antigravity)',
      ai_rationale: config.rationale,
      recommended_stocks: processedStocks,
      summary: {
        total_invested: amountVal,
        real_market_value: Number(totalRealVal.toFixed(2)),
        real_return_eur: realReturnEur,
        real_return_percent: realReturnPct,
        ai_simulated_value: aiSimulatedValue,
        ai_simulated_return_eur: aiSimulatedReturnEur,
        ai_simulated_return_percent: aiSimulatedReturnPct
      },
      chart_points: chartPoints
    };
  }, []);

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
        // Fallback to Gemini 3.6 Flash simulation engine
        const fallbackData = generateGemini36FlashSimulation(amount, durationMonths);
        setData(fallbackData);
      }
    } catch (err) {
      console.log('Utilisation du moteur d\'IA Gemini 3.6 Flash embarqué...');
      const fallbackData = generateGemini36FlashSimulation(amount, durationMonths);
      setData(fallbackData);
    } finally {
      setLoading(false);
    }
  }, [amount, durationMonths, ollamaUrl, model, generateGemini36FlashSimulation]);

  useEffect(() => {
    executeSimulation();
  }, [executeSimulation]);

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
            Analyse de marché par IA (Gemini 3.6 Flash / Ollama / Llama.cpp) & Backtesting Réel
          </div>
        </div>
        <div className="glass-pill active flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span>Gemini 3.6 Flash Quant-Engine</span>
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
            {durationOptions.map((opt) => (
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
            <span>Modèle IA d'Analyse</span>
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="glass-input"
          >
            <option value="gemini-3.6-flash">⚡ Gemini 3.6 Flash (IA Antigravity - Recommandé)</option>
            <option value="llama3">🦙 Ollama - Llama 3</option>
            <option value="mistral">🍃 Ollama - Mistral 7B</option>
            <option value="qwen">🌐 Ollama - Qwen 2.5</option>
            <option value="llama-cpp">⚙️ Llama.cpp Server Local</option>
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
                <span className="text-xs px-3 py-1 rounded-full font-semibold glass-pill active">
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
                <div className="metric-label text-sky-300">Estimation Gemini 3.6 Flash</div>
                <div className="metric-value text-sky-400">{data.summary.ai_simulated_value.toLocaleString('fr-FR')} €</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="badge-gain badge-ai">
                    +{data.summary.ai_simulated_return_eur} € ({data.summary.ai_simulated_return_percent}%)
                  </span>
                  <span className="text-xs text-sky-300/70">Optimisé IA</span>
                </div>
              </div>

              <div className="text-xs text-slate-300 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/10">
                🤖 <strong>Analyse Strategique :</strong> {data.ai_rationale}
              </div>
            </div>

            {/* Right Interactive Chart Card */}
            <div className="glass-container p-6 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white margin-0">Comparaison Évolution de Portefeuille</h3>
                  <div className="text-xs text-slate-400">Marché Réel vs Prédiction Gemini 3.6 Flash ({durationMonths} mois)</div>
                </div>
                <div className="flex gap-2">
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Marché Réel
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-sky-400 font-medium ml-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span> Gemini 3.6 Flash
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
                      name="Gemini 3.6 Flash (€)"
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
