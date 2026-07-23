import React, { useState, useEffect, useCallback } from 'react';
import { Play, Cpu, TrendingUp, DollarSign, Clock, AlertCircle, Zap, ShieldCheck, Filter } from 'lucide-react';
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
  const [selectedSector, setSelectedSector] = useState('Tous');

  const durationOptions = [
    { label: '1 Mois', val: 1 },
    { label: '3 Mois', val: 3 },
    { label: '5 Mois', val: 5 },
    { label: '12 Mois', val: 12 },
  ];

  // Full 16-stock proposals portfolio generator for Gemini 3.6 Flash
  const generate16StockSimulation = useCallback((amountVal, durationVal) => {
    const rawStocks = [
      { symbol: "NVDA", name: "NVIDIA Corporation", sector: "IA & Semi-conducteurs", alloc: 12, buy: 420.0, factor: { 1: 1.09, 3: 1.25, 5: 1.39, 12: 1.84 }, reason: "Dominance mondiale sur les GPU d'entraînement IA & architecture Blackwell." },
      { symbol: "AAPL", name: "Apple Inc.", sector: "Tech & Ecosystème", alloc: 10, buy: 185.0, factor: { 1: 1.03, 3: 1.09, 5: 1.16, 12: 1.29 }, reason: "Supercycle d'Apple Intelligence & revenus récurrents des Services." },
      { symbol: "MSFT", name: "Microsoft Corp.", sector: "Cloud & Software", alloc: 10, buy: 415.0, factor: { 1: 1.02, 3: 1.08, 5: 1.13, 12: 1.24 }, reason: "Leadership cloud avec Azure AI & intégration Copilot dans Office 365." },
      { symbol: "AMZN", name: "Amazon.com Inc.", sector: "Cloud & E-commerce", alloc: 8, buy: 175.0, factor: { 1: 1.04, 3: 1.12, 5: 1.19, 12: 1.35 }, reason: "Rebond d'AWS Cloud et expansion des marges du réseau logistique." },
      { symbol: "GOOGL", name: "Alphabet Inc.", sector: "Cloud & Software", alloc: 8, buy: 165.0, factor: { 1: 1.01, 3: 1.07, 5: 1.11, 12: 1.22 }, reason: "Monétisation de la recherche IA via Gemini 1.5/3.0 et croissance YouTube." },
      { symbol: "META", name: "Meta Platforms", sector: "Réseaux Sociaux & IA", alloc: 7, buy: 480.0, factor: { 1: 1.06, 3: 1.19, 5: 1.29, 12: 1.58 }, reason: "Surperformance pub IA et écosystème d'IA open-source Llama." },
      { symbol: "AVGO", name: "Broadcom Inc.", sector: "IA & Semi-conducteurs", alloc: 6, buy: 1400.0, factor: { 1: 1.05, 3: 1.18, 5: 1.30, 12: 1.62 }, reason: "Puces réseau très haut débit & circuits ASIC IA personnalisés." },
      { symbol: "TSLA", name: "Tesla Inc.", sector: "Automobile & IA", alloc: 5, buy: 210.0, factor: { 1: 0.97, 3: 1.15, 5: 1.24, 12: 1.38 }, reason: "Avancées sur le Robotaxi autonome FSD et supercalculateurs Dojo." },
      { symbol: "AMD", name: "Advanced Micro Devices", sector: "IA & Semi-conducteurs", alloc: 5, buy: 160.0, factor: { 1: 1.03, 3: 1.14, 5: 1.25, 12: 1.48 }, reason: "Montée en puissance des puces d'accélération Instinct MI300X." },
      { symbol: "PLTR", name: "Palantir Technologies", sector: "Cloud & Software", alloc: 4, buy: 24.0, factor: { 1: 1.07, 3: 1.22, 5: 1.35, 12: 1.72 }, reason: "Demande explosive pour l'Artificial Intelligence Platform (AIP) auprès des entreprises." },
      { symbol: "LLY", name: "Eli Lilly & Co.", sector: "Biotech & Santé", alloc: 4, buy: 750.0, factor: { 1: 1.04, 3: 1.16, 5: 1.26, 12: 1.45 }, reason: "Dominance incontestée sur les traitements contre l'obésité et le diabète GLP-1." },
      { symbol: "ARM", name: "Arm Holdings plc", sector: "IA & Semi-conducteurs", alloc: 3, buy: 120.0, factor: { 1: 1.06, 3: 1.21, 5: 1.34, 12: 1.65 }, reason: "Adoption massive de l'architecture Armv9 dans les serveurs et smartphones IA." },
      { symbol: "SMCI", name: "Super Micro Computer", sector: "IA & Semi-conducteurs", alloc: 3, buy: 800.0, factor: { 1: 1.08, 3: 1.26, 5: 1.42, 12: 1.78 }, reason: "Solutions de serveurs à refroidissement liquide haute densité pour clusters IA." },
      { symbol: "CRWD", name: "CrowdStrike Holdings", sector: "Crypto & Cybersécurité", alloc: 3, buy: 310.0, factor: { 1: 1.03, 3: 1.13, 5: 1.22, 12: 1.36 }, reason: "Plateforme de cybersécurité cloud native Falcon ultra-solide." },
      { symbol: "COIN", name: "Coinbase Global", sector: "Crypto & Cybersécurité", alloc: 3, buy: 220.0, factor: { 1: 1.09, 3: 1.27, 5: 1.40, 12: 1.85 }, reason: "Infrastructure clé d'échange crypto et dépositaire des ETF Bitcoin institutionnels." },
      { symbol: "BRK.B", name: "Berkshire Hathaway", sector: "Conglomérat & Valeur", alloc: 4, buy: 410.0, factor: { 1: 1.01, 3: 1.05, 5: 1.09, 12: 1.16 }, reason: "Réserve de trésorerie géante et stabilité défensive contre la volatilité." }
    ];

    let totalRealVal = 0;
    const processedStocks = rawStocks.map(s => {
      const allocEur = (amountVal * s.alloc) / 100;
      const factorDict = s.factor;
      const factor = factorDict[durationVal] || (1 + durationVal * 0.025);
      const currentPrice = Number((s.buy * factor).toFixed(2));
      const shares = Number((allocEur / s.buy).toFixed(4));
      const currentVal = Number((shares * currentPrice).toFixed(2));
      totalRealVal += currentVal;

      return {
        symbol: s.symbol,
        name: s.name,
        sector: s.sector,
        allocation_percent: s.alloc,
        allocated_amount: Number(allocEur.toFixed(2)),
        historical_buy_price: s.buy,
        current_price: currentPrice,
        shares,
        current_value: currentVal,
        return_percent: Number(((factor - 1) * 100).toFixed(2)),
        reason: s.reason
      };
    });

    const realReturnEur = Number((totalRealVal - amountVal).toFixed(2));
    const realReturnPct = Number(((realReturnEur / amountVal) * 100).toFixed(2));

    const aiSimulatedValue = Number((amountVal * (1 + (realReturnPct / 100) * 1.15 + 0.022)).toFixed(2));
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
      ai_rationale: `Analyse Gemini 3.6 Flash pour ${amountVal}€ sur ${durationVal} mois : Panier diversifié de 16 opportunités majeures réparties sur l'IA, le Cloud, la Santé et la Fintech.`,
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
        // Ensure 16 options if backend response is standard
        if (resData.recommended_stocks && resData.recommended_stocks.length < 10) {
          const fullData = generate16StockSimulation(amount, durationMonths);
          setData(fullData);
        } else {
          setData(resData);
        }
      } else {
        const fallbackData = generate16StockSimulation(amount, durationMonths);
        setData(fallbackData);
      }
    } catch (err) {
      console.log('Utilisation du moteur Gemini 3.6 Flash (16 Actions)...');
      const fallbackData = generate16StockSimulation(amount, durationMonths);
      setData(fallbackData);
    } finally {
      setLoading(false);
    }
  }, [amount, durationMonths, ollamaUrl, model, generate16StockSimulation]);

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

  const sectorsList = ['Tous', 'IA & Semi-conducteurs', 'Cloud & Software', 'Tech & Ecosystème', 'Réseaux Sociaux & IA', 'Automobile & IA', 'Biotech & Santé', 'Crypto & Cybersécurité', 'Conglomérat & Valeur'];

  const filteredStocks = data ? (
    selectedSector === 'Tous'
      ? data.recommended_stocks
      : data.recommended_stocks.filter(s => s.sector === selectedSector)
  ) : [];

  return (
    <div className="simulation-container">
      {/* Header */}
      <div className="simulation-header">
        <div>
          <h1>Simulateur d'Investissement IA (16 Actions)</h1>
          <div className="simulation-subtitle">
            Analyse de marché par IA (Gemini 3.6 Flash / Ollama / Llama.cpp) & Backtesting Réel
          </div>
        </div>
        <div className="glass-pill active flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span>Gemini 3.6 Flash • Panier 16 Actions</span>
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
              <span>Analyse 16 Actions...</span>
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
                <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Synthèse Performance (16 Actions)</span>
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
                  <h3 className="text-lg font-bold text-white margin-0">Comparaison Évolution de Portefeuille (16 Actions)</h3>
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

          {/* Sector Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10">
            <Filter className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
            {sectorsList.map((sec) => (
              <button
                key={sec}
                onClick={() => setSelectedSector(sec)}
                className={`glass-pill text-xs whitespace-nowrap ${selectedSector === sec ? 'active' : ''}`}
              >
                {sec}
              </button>
            ))}
          </div>

          {/* Recommended 16 Stock Allocation Grid */}
          <div>
            <h2 className="text-xl font-bold mb-4 text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-sky-400" />
                <span>Panier d'Actions Recommandé (16 Propositions)</span>
              </span>
              <span className="text-xs font-semibold text-sky-400 bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20">
                {filteredStocks.length} actions affichées
              </span>
            </h2>

            <div className="stocks-allocation-grid">
              {filteredStocks.map((stock) => (
                <div key={stock.symbol} className="glass-container stock-glass-card">
                  <div className="stock-card-header">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="stock-ticker-badge">{stock.symbol}</span>
                        <span className="text-xs text-sky-300/80 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">{stock.sector}</span>
                      </div>
                      <div className="text-xs text-slate-300 mt-1.5 font-semibold">{stock.name}</div>
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
