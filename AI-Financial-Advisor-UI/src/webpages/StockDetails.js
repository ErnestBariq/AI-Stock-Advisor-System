// StockDetails.js
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createChart } from 'lightweight-charts';
import './StockDetails.css';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { ReactComponent as AddToPortfolioIcon } from '../assets/add-to-portfolio.svg';
import { ReactComponent as CheckmarkIcon } from '../assets/checkmark.svg';
import AddToPortfolioDialog from '../components/AddToPortfolioDialog';
import {
  analyzeStock,
  getStockQuote,
  getStockOverview,
  getIncomeStatement,
  getStockNews,
  getInsiderTransactions,
  getStockMonthlyData
} from '../api/client';

function StockDetails() {
  const { symbol } = useParams();
  const [stockData, setStockData] = useState(null);
  const [todayStats, setTodayStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]); // New state for monthly data
  const [companyOverview, setCompanyOverview] = useState(null);
  const [financialData, setFinancialData] = useState(null);
  const [newsData, setNewsData] = useState([]);
  const [insiderTransactions, setInsiderTransactions] = useState([]);
  const [timeFrame, setTimeFrame] = useState('monthly'); // Default to monthly
  const chartContainerRef = useRef();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [financialView, setFinancialView] = useState('quarterly');
  const [isAdded, setIsAdded] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const navigate = useNavigate();

  const openDialog = () => {
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
  };

  const handleAddToPortfolio = () => {
    openDialog();
    setIsAdded(true);
  };

  // Runs the TradingAgents multi-agent analysis for this ticker (same engine as the
  // Advisor chat). Button-triggered only: a run typically takes several minutes
  // (cf run_trading_agents backend), never fetched automatically on page load.
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const response = await analyzeStock(symbol);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed.');
      }
      setAnalysis(data);
    } catch (error) {
      console.error('Error analyzing stock:', error);
      setAnalysisError(error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Fetch global quote for current price and today's stats
  useEffect(() => {
    getStockQuote(symbol)
      .then((response) => response.json())
      .then((data) => {
        if (data['Global Quote']) {
          const quoteData = data['Global Quote'];
          setTodayStats({
            currentPrice: parseFloat(quoteData['05. price']),
            openPrice: parseFloat(quoteData['02. open']),
            highPrice: parseFloat(quoteData['03. high']),
            lowPrice: parseFloat(quoteData['04. low']),
            previousClose: parseFloat(quoteData['08. previous close']),
            change: parseFloat(quoteData['09. change']),
            changePercent: quoteData['10. change percent'],
          });
        } else {
          setTodayStats(null);
        }
      })
      .catch((error) => {
        console.error('Error fetching global quote data:', error);
        alert('Error fetching data. Please try again later.');
      });
  }, [symbol]);

  // Fetch company overview
  useEffect(() => {
    getStockOverview(symbol)
      .then((response) => response.json())
      .then((data) => {
        if (data.Symbol) {
          setCompanyOverview(data);
        } else {
          setCompanyOverview(null);
        }
      })
      .catch((error) => {
        console.error('Error fetching company overview:', error);
        alert('Error fetching company data. Please try again later.');
      });
  }, [symbol]);

  // Fetch financial performance data
  useEffect(() => {
    getIncomeStatement(symbol)
      .then((response) => response.json())
      .then((data) => {
        if (data.quarterlyReports && data.annualReports) {
          setFinancialData({
            quarterly: data.quarterlyReports.slice(0, 4),
            annual: data.annualReports.slice(0, 3),
          });
        } else {
          setFinancialData(null);
        }
      })
      .catch((error) => {
        console.error('Error fetching financial data:', error);
        alert('Error fetching financial data. Please try again later.');
      });
  }, [symbol]);

  // Fetch news and sentiments
  useEffect(() => {
    getStockNews(symbol)
      .then((response) => response.json())
      .then((data) => {
        if (data.feed && data.feed.length > 0) {
          setNewsData(data.feed.slice(0, 5));
        } else {
          setNewsData([]);
        }
      })
      .catch((error) => {
        console.error('Error fetching news data:', error);
        alert('Error fetching news data. Please try again later.');
      });
  }, [symbol]);

  // Fetch insider transactions
  useEffect(() => {
    getInsiderTransactions(symbol)
      .then((response) => response.json())
      .then((data) => {
        if (data.transactions && data.transactions.length > 0) {
          setInsiderTransactions(data.transactions.slice(0, 5));
        } else {
          setInsiderTransactions([]);
        }
      })
      .catch((error) => {
        console.error('Error fetching insider transactions:', error);
        alert('Error fetching insider transactions. Please try again later.');
      });
  }, [symbol]);

  // Fetch monthly time-series data
  useEffect(() => {
    const fetchMonthlyData = async () => {
      try {
        const response = await getStockMonthlyData(symbol);
        const data = await response.json();

        if (data.data) {
          const processedData = data.data
            .map((item) => ({
              time: item.time, // Ensure this is in 'YYYY-MM-DD' format
              value: parseFloat(item.close),
              open: parseFloat(item.open),
              high: parseFloat(item.high),
              low: parseFloat(item.low),
              volume: parseInt(item.volume, 10),
            }))
            .sort((a, b) => new Date(a.time) - new Date(b.time)); // Sort ascendingly

          setMonthlyData(processedData);
          setChartData(processedData); // Set chart data to monthly data
        } else {
          console.error('Error fetching monthly time-series data:', data.error);
          setMonthlyData([]);
          setChartData([]);
        }
      } catch (error) {
        console.error('Error fetching monthly time-series data:', error);
        setMonthlyData([]);
        setChartData([]);
      }
    };

    fetchMonthlyData();
  }, [symbol]);

  // Adjusted chart creation to ensure responsive width and height
  useEffect(() => {
    if (chartContainerRef.current && chartData.length > 0) {
      // Clear previous chart
      chartContainerRef.current.innerHTML = '';

      // Create a new chart
      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 400,
        layout: {
          backgroundColor: '#ffffff',
          textColor: '#000000',
        },
        grid: {
          vertLines: { color: '#e1e1e1' },
          horzLines: { color: '#e1e1e1' },
        },
        crosshair: { mode: 1 },
        rightPriceScale: {
          borderColor: '#cccccc',
          scaleMargins: { top: 0.2, bottom: 0.2 },
          priceFormatter: (price) => `$${price.toFixed(2)}`, // Format price values
        },
        timeScale: {
          borderColor: '#cccccc',
          timeVisible: true,
          secondsVisible: false,
        },
      });

      // Add a line series for stock prices
      const lineSeries = chart.addLineSeries({
        color: '#2196F3',
        lineWidth: 2,
      });

      // Set data for the line series
      lineSeries.setData(chartData);

      // Tooltip
      const toolTip = document.createElement('div');
      toolTip.className = 'chart-tooltip';
      chartContainerRef.current.appendChild(toolTip);

      chart.subscribeCrosshairMove((param) => {
        if (!param.point || !param.time) {
          toolTip.style.display = 'none';
          return;
        }

        const price = param.seriesPrices?.get(lineSeries);
        if (price !== undefined) {
          const coordinate = chart.priceToCoordinate(price);
          if (coordinate !== null) {
            toolTip.style.left = `${param.point.x}px`;
            toolTip.style.top = `${coordinate}px`;
            toolTip.style.display = 'block';
            toolTip.innerHTML = `Price: $${price.toFixed(2)}`;
          }
        } else {
          toolTip.style.display = 'none';
        }
      });

      // Handle window resize
      const handleResize = () => {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      };
      window.addEventListener('resize', handleResize);

      // Cleanup on unmount
      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
      };
    }
  }, [chartData]);

  // TradingAgents only returns a categorical rating (Buy/Hold/Sell), not a numeric
  // score -- map it to something the gauge can show.
  const RATING_GAUGE = {
    Buy: { value: 85, color: '#4caf50' },
    Hold: { value: 50, color: '#ff9800' },
    Sell: { value: 15, color: '#f44336' },
  };

  return (
    <div className="stock-details-container">
      <div className="price-score-portfolio-row">
        {/* Price Details */}
        <div className="price-card">
          {todayStats ? (
            <>
              <h2>{symbol}</h2>
              <div className="price-info">
                <div className="current-price">
                  <span>Current Price</span>
                  <strong>${todayStats.currentPrice.toFixed(2)}</strong>
                </div>
                <div className="price-change">
                  <span
                    className={`change-badge ${todayStats.change >= 0 ? 'positive' : 'negative'}`}
                  >
                    {todayStats.change >= 0 ? '+' : '-'}$
                    {Math.abs(todayStats.change).toFixed(2)} ({todayStats.changePercent})
                  </span>
                </div>
              </div>
              <div className="additional-stats">
                <div className="stat-item">
                  <span>52 Week High</span>
                  <strong>
                    $
                    {companyOverview && companyOverview['52WeekHigh']
                      ? parseFloat(companyOverview['52WeekHigh']).toFixed(2)
                      : 'N/A'}
                  </strong>
                </div>
                <div className="stat-item">
                  <span>52 Week Low</span>
                  <strong>
                    $
                    {companyOverview && companyOverview['52WeekLow']
                      ? parseFloat(companyOverview['52WeekLow']).toFixed(2)
                      : 'N/A'}
                  </strong>
                </div>
                <div className="stat-item">
                  <span>Market Cap</span>
                  <strong>
                    $
                    {companyOverview && companyOverview['MarketCapitalization']
                      ? Number(companyOverview['MarketCapitalization']).toLocaleString()
                      : 'N/A'}
                  </strong>
                </div>
              </div>
              <div className="other-stats">
                <div className="stat-item">
                  <span>Open Price</span>
                  <strong>${todayStats.openPrice.toFixed(2)}</strong>
                </div>
                <div className="stat-item">
                  <span>High Price</span>
                  <strong>${todayStats.highPrice.toFixed(2)}</strong>
                </div>
                <div className="stat-item">
                  <span>Low Price</span>
                  <strong>${todayStats.lowPrice.toFixed(2)}</strong>
                </div>
                <div className="stat-item">
                  <span>Previous Close</span>
                  <strong>${todayStats.previousClose.toFixed(2)}</strong>
                </div>
              </div>
            </>
          ) : (
            <p>Today's statistics are not available.</p>
          )}
        </div>

        {/* AI Advice Section (TradingAgents) */}
        <div className="score-section">
          <h3>AI Advice</h3>
          {analysis ? (
            <>
              <div className="score-chart">
                <CircularProgressbar
                  value={RATING_GAUGE[analysis.rating]?.value ?? 50}
                  text={analysis.rating}
                  styles={buildStyles({
                    pathColor: RATING_GAUGE[analysis.rating]?.color ?? '#999',
                    textColor: '#333',
                    trailColor: '#ddd',
                  })}
                />
              </div>
              <button
                className="score-explanation-button"
                onClick={() => setShowExplanation(!showExplanation)}
              >
                {showExplanation ? 'Hide explanation' : `Why ${analysis.rating}?`}
              </button>
              {showExplanation && <p className="analysis-explanation">{analysis.summary}</p>}
            </>
          ) : (
            <>
              {isAnalyzing ? (
                <p>Analyzing {symbol} with AI (can take several minutes)...</p>
              ) : (
                <button className="score-explanation-button" onClick={handleAnalyze}>
                  Get AI Advice
                </button>
              )}
              {analysisError && <p className="error-message">{analysisError}</p>}
            </>
          )}
        </div>

        {/* Add to Portfolio Button */}
        <div className="add-to-portfolio-container">
          <button className="add-to-portfolio-button" onClick={handleAddToPortfolio}>
            {isAdded ? <CheckmarkIcon /> : <AddToPortfolioIcon />}
            {isAdded ? 'Added to Portfolio' : 'Add to Portfolio'}
          </button>
        </div>
      </div>

      {/* AddToPortfolioDialog Component */}
      {isDialogOpen && (
        <AddToPortfolioDialog
          symbol={symbol}
          currentPrice={todayStats ? todayStats.currentPrice : 0}
          monthlyData={monthlyData} // Pass monthly data instead of lastWeekData
          companyOverview={companyOverview}
          financialData={financialData}
          newsData={newsData}
          onClose={closeDialog}
        />
      )}

      {/* Chart and Company Overview */}
      <div className="chart-and-overview">
        {/* Chart */}
        <div className="chart-container" ref={chartContainerRef}></div>

        {/* Company Overview */}
        {companyOverview ? (
          <div className="company-overview">
            <h3>About {companyOverview.Name}</h3>
            {companyOverview.logoUrl && (
              <img
                src={companyOverview.logoUrl}
                alt={`${companyOverview.Name} logo`}
                className="company-logo"
              />
            )}
            <p>
              {isDescriptionExpanded
                ? companyOverview.Description
                : `${companyOverview.Description.substring(0, 200)}... `}
              <button
                className="expand-button"
                onClick={() =>
                  setIsDescriptionExpanded(!isDescriptionExpanded)
                }
              >
                {isDescriptionExpanded ? 'Show Less' : 'Read More'}
              </button>
            </p>
            <div className="company-details">
              <p>Sector: {companyOverview.Sector}</p>
              <p>Industry: {companyOverview.Industry}</p>
              <p>
                Dividend Yield: {companyOverview.DividendYield || 'N/A'}
              </p>
              <p>EPS: {companyOverview.EPS || 'N/A'}</p>
              <p>
                Market Cap: $
                {Number(companyOverview.MarketCapitalization).toLocaleString()}
              </p>
              <p>P/E Ratio: {companyOverview.PERatio}</p>
            </div>
          </div>
        ) : (
          <p>Company overview is not available.</p>
        )}
      </div>

      {/* Financial Performance */}
      {financialData ? (
        <div className="financial-performance">
          <h3>Financial Performance</h3>
          <div className="financial-tabs">
            <button
              onClick={() => setFinancialView('quarterly')}
              className={financialView === 'quarterly' ? 'active' : ''}
            >
              Quarterly
            </button>
            <button
              onClick={() => setFinancialView('annual')}
              className={financialView === 'annual' ? 'active' : ''}
            >
              Annual
            </button>
          </div>
          <div className="table-container">
            {financialView === 'quarterly' ? (
              <table>
                <thead>
                  <tr>
                    <th>Fiscal Date Ending</th>
                    <th>Total Revenue</th>
                    <th>Gross Profit</th>
                    <th>Net Income</th>
                  </tr>
                </thead>
                <tbody>
                  {financialData.quarterly.map((report, index) => (
                    <tr key={index}>
                      <td>{report.fiscalDateEnding}</td>
                      <td>
                        ${Number(report.totalRevenue).toLocaleString()}
                      </td>
                      <td>
                        ${Number(report.grossProfit).toLocaleString()}
                      </td>
                      <td>
                        ${Number(report.netIncome).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Fiscal Date Ending</th>
                    <th>Total Revenue</th>
                    <th>Gross Profit</th>
                    <th>Net Income</th>
                  </tr>
                </thead>
                <tbody>
                  {financialData.annual.map((report, index) => (
                    <tr key={index}>
                      <td>{report.fiscalDateEnding}</td>
                      <td>
                        ${Number(report.totalRevenue).toLocaleString()}
                      </td>
                      <td>
                        ${Number(report.grossProfit).toLocaleString()}
                      </td>
                      <td>
                        ${Number(report.netIncome).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <p>Financial data is not available.</p>
      )}

      {/* News Information Section */}
      {newsData.length > 0 ? (
        <div className="news-section">
          <h3>Latest News</h3>
          <div className="news-cards">
            {newsData.map((newsItem, index) => (
              <div key={index} className="news-card">
                {newsItem.banner_image && (
                  <img src={newsItem.banner_image} alt="News" />
                )}
                <div className="news-content">
                  <a
                    href={newsItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <h4>{newsItem.title}</h4>
                  </a>
                  <p>{newsItem.summary}</p>
                  <p>
                    <small>
                      {new Date(
                        newsItem.publishedDate
                      ).toLocaleString()}
                    </small>
                  </p>
                  {newsItem.sentiment && (
                    <span
                      className={`sentiment-tag ${newsItem.sentiment}`}
                    >
                      {newsItem.sentiment}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p>No recent news available.</p>
      )}

      {/* Insider Transactions */}
      {insiderTransactions.length > 0 ? (
        <div className="insider-transactions">
          <h3>Insider Transactions</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Director</th>
                  <th>Relation</th>
                  <th>Transaction Type</th>
                  <th>Shares</th>
                  <th>Price</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {insiderTransactions.map((transaction, index) => (
                  <tr key={index}>
                    <td>{transaction.Director}</td>
                    <td>{transaction.Relation}</td>
                    <td>{transaction.TransactionType}</td>
                    <td>{transaction.Shares}</td>
                    <td>${transaction.Price}</td>
                    <td>{transaction.TransactionDate}</td>
                    <td>
                      {transaction.Shares > 10000 && (
                        <span className="major-transaction-badge">
                          Major {transaction.TransactionType}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p>No recent insider transactions available.</p>
      )}
    </div>
  );
}

export default StockDetails;
