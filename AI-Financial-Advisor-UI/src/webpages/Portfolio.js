// Portfolio.js

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { useNavigate } from 'react-router-dom';
import {
  Select,
  SelectItem,
} from "../components/ui/Select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart, Pie, Cell
} from 'recharts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { Send } from 'lucide-react';
import { getUserDetails, analyzeStock, updateRiskAssessment, getStockTimeSeries, sendChatMessage } from '../api/client';
import './Portfolio.css'; // Assuming you have a CSS file for styling

const Portfolio = () => {
  const [portfolioStocks, setPortfolioStocks] = useState([]);
  const [portfolioHistory, setPortfolioHistory] = useState([]);
  const [userQuery, setUserQuery] = useState('');
  const [conversation, setConversation] = useState([]);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [selectedGraph, setSelectedGraph] = useState("total-value");
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingCurrentPrices, setLoadingCurrentPrices] = useState(true);
  const [loadingGraphData, setLoadingGraphData] = useState(false);
  const [currentPrices, setCurrentPrices] = useState({});
  const [monthlyDataBySymbol, setMonthlyDataBySymbol] = useState({});
  const [analyzingSymbol, setAnalyzingSymbol] = useState(null);
  const navigate = useNavigate();
  const textareaRef = useRef(null);
  const chatWindowRef = useRef(null);

  const Spinner = () => (
    <div className="spinner">
      <div className="double-bounce1"></div>
      <div className="double-bounce2"></div>
    </div>
  );

  // Fetch User Details
  const fetchUserDetails = async () => {
    const email = localStorage.getItem('email');
    if (!email) {
      alert('No user email found. Redirecting to login.');
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      const response = await getUserDetails(email);

      if (response.ok) {
        const data = await response.json();
        setUserDetails(data);
        setPortfolioStocks(data.portfolio || []); // Ensure portfolio is updated here
        localStorage.setItem('userDetails', JSON.stringify(data)); // Update local storage
      } else {
        alert('Failed to fetch user details. Redirecting to login.');
        navigate('/login');
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setLoading(false);
    }
  };

  // Runs TradingAgents for a holding (same engine as Advisor chat / StockDetails "Get
  // AI Advice") then persists the rating onto the holding's Trading Risk column.
  // Several minutes per run (cf backend run_trading_agents) -- button-triggered only.
  const handleAnalyze = async (event, symbol) => {
    event.stopPropagation(); // don't trigger the row's navigate-to-stock click
    const email = localStorage.getItem('email');
    if (!email) return;

    setAnalyzingSymbol(symbol);
    try {
      const analyzeResponse = await analyzeStock(symbol);
      const analyzeData = await analyzeResponse.json();
      if (!analyzeResponse.ok) {
        throw new Error(analyzeData.error || 'Analysis failed');
      }

      await updateRiskAssessment(email, symbol, analyzeData.rating);

      await fetchUserDetails();
    } catch (error) {
      console.error(`Error analyzing ${symbol}:`, error);
      alert(`Error analyzing ${symbol}: ${error.message}`);
    } finally {
      setAnalyzingSymbol(null);
    }
  };

  useEffect(() => {
    const cachedUserDetailsString = localStorage.getItem('userDetails');
    const cachedUserDetails = cachedUserDetailsString
      ? cleanUserDetails(JSON.parse(cachedUserDetailsString))
      : null;

    setUserDetails(cachedUserDetails);
    fetchUserDetails();
  }, []);

  const cleanUserDetails = (details) => {
    if (!details) return null;

    return {
      username: details.username,
      age: details.age,
      gender: details.gender,
      email: details.email,
      investmentGoal: details.investmentGoal,
      riskAppetite: details.riskAppetite,
      timeHorizon: details.timeHorizon,
      portfolio: details.portfolio.map(stock => ({
        symbol: stock.symbol,
        name: stock.companyOverview?.Name,
        currentPrice: stock.currentPrice,
        purchasePrice: stock.purchasePrice,
        shares: stock.shares,
        amount: stock.amount
      })),
    };
  };

  useEffect(() => {
    const cachedUserDetails = localStorage.getItem('userDetails');
    if (cachedUserDetails) {
      setUserDetails(JSON.parse(cachedUserDetails));
      setLoading(false);
    }
    fetchUserDetails();
  }, []);

  const validateStocks = (stocks) => {
    return stocks.map((stock) => ({
      ...stock,
      companyOverview: stock.companyOverview || { Name: 'Unknown', Industry: 'Unknown' },
      monthlyData: stock.monthlyData || [],
    }));
  };

  useEffect(() => {
    if (userDetails && userDetails.portfolio) {
      const validatedStocks = validateStocks(userDetails.portfolio);
      setPortfolioStocks(validatedStocks);
    }
  }, [userDetails]);

  useEffect(() => {
    const fetchDailyPrices = async () => {
      if (portfolioStocks.length === 0) return;

      setLoadingCurrentPrices(true);
      const updatedPrices = {};
      const updatedHistory = {};

      try {
        // One Alpha Vantage call per stock (free-tier TIME_SERIES_DAILY) — reused
        // below for both the latest price and the portfolio history graph, instead
        // of a second call per stock (which was hitting the 5-req/min free-tier
        // limit and breaking this very fetch; TIME_SERIES_MONTHLY_ADJUSTED is also
        // premium-only and would 400 regardless).
        for (const stock of portfolioStocks) {
          const response = await getStockTimeSeries(stock.symbol, 'TIME_SERIES_DAILY');

          if (!response.ok) {
            throw new Error(`Failed to fetch data for ${stock.symbol}`);
          }

          const { data: timeSeries } = await response.json();

          if (timeSeries && timeSeries.length > 0) {
            updatedPrices[stock.symbol] = timeSeries[timeSeries.length - 1].close;
            updatedHistory[stock.symbol] = timeSeries.map((point) => ({
              time: point.time,
              value: point.close,
            }));
          } else {
            console.error(`No Time Series data for ${stock.symbol}`);
            updatedPrices[stock.symbol] = null; // or a default value
            updatedHistory[stock.symbol] = [];
          }
        }

        setCurrentPrices(updatedPrices);
        setMonthlyDataBySymbol(updatedHistory);
      } catch (error) {
        console.error('Error fetching daily prices:', error);
        alert('Error fetching current stock prices. Please try again later.');
      } finally {
        setLoadingCurrentPrices(false);
      }
    };

    fetchDailyPrices();
  }, [portfolioStocks]);

  // portfolioStocks itself never carries monthlyData (cf effect above, sourced from
  // the same daily-price fetch) — always go through this helper so a stock with no
  // data yet (or a failed fetch) degrades to an empty series instead of throwing.
  const getMonthlyData = (stock) => monthlyDataBySymbol[stock.symbol] || [];

  // Portfolio History Graph Data
  useEffect(() => {
    if (portfolioStocks.length > 0) {
      // Use whichever stock's monthly data has arrived first — the fetch above is
      // async and per-symbol, so on first render (or if one symbol's fetch failed)
      // some stocks may still have an empty series.
      const referenceStock = portfolioStocks.find((stock) => getMonthlyData(stock).length > 0);
      if (!referenceStock) {
        setLoadingGraphData(false);
        return;
      }

      const dates = getMonthlyData(referenceStock).map((data) => data.time);
      const initialPortfolioValue = portfolioStocks.reduce((sum, stock) => {
        const dayData = getMonthlyData(stock)[0];
        return dayData ? sum + stock.shares * dayData.value : sum;
      }, 0);

      const history = dates.map((date) => {
        let totalPortfolioValue = 0;
        const stockValues = {};
        portfolioStocks.forEach((stock) => {
          const stockMonthlyData = getMonthlyData(stock);
          const dayData = stockMonthlyData.find((data) => data.time === date);
          const firstDayData = stockMonthlyData[0];
          if (dayData && firstDayData) {
            const stockValue = stock.shares * dayData.value;
            totalPortfolioValue += stockValue;
            const initialStockValue = stock.shares * firstDayData.value;
            const stockPercentChange =
              ((stockValue - initialStockValue) / initialStockValue) * 100;
            stockValues[stock.symbol] = parseFloat(stockPercentChange.toFixed(2));
          }
        });
        const portfolioPercentChange =
          initialPortfolioValue !== 0
            ? ((totalPortfolioValue - initialPortfolioValue) / initialPortfolioValue) * 100
            : 0;
        return {
          date,
          portfolioValue: parseFloat(totalPortfolioValue.toFixed(2)),
          portfolioPercentChange: parseFloat(portfolioPercentChange.toFixed(2)),
          ...stockValues,
        };
      });
      setPortfolioHistory(history);
      setLoadingGraphData(false); // **Set loadingGraphData to false here**
    } else {
      setLoadingGraphData(false); // **Also set to false if there are no stocks**
    }
  }, [portfolioStocks, monthlyDataBySymbol]);

  // Compute total current portfolio value
  const totalPortfolioValue = portfolioStocks.reduce((sum, stock) => {
    const stockMonthlyData = getMonthlyData(stock);
    const latestPrice = stockMonthlyData[stockMonthlyData.length - 1]?.value || 0;
    return sum + stock.shares * latestPrice;
  }, 0);

  // Calculate total invested and profit/loss
  const totalInvested = portfolioStocks.reduce((sum, stock) => sum + stock.amount, 0);
  const profitOrLoss = totalPortfolioValue - totalInvested;
  const isProfit = profitOrLoss >= 0;

  // Helper function to format profit or loss
  const formatProfitOrLoss = (value) => {
    const formattedValue = `$${Math.abs(value).toFixed(2)}`;
    return isProfit ? `▲ ${formattedValue}` : `▼ ${formattedValue}`;
  };

  // Process stocks to include currentValue and today's change
  const processedStocks = portfolioStocks.map((stock) => {
    const stockMonthlyData = getMonthlyData(stock);
    const todayData = stockMonthlyData[stockMonthlyData.length - 1];
    const latestPrice = todayData?.value;
    const purchasePrice = stock.purchasePrice;
    const priceChangePercent = latestPrice && purchasePrice
      ? ((latestPrice - purchasePrice) / purchasePrice) * 100
      : 0;

    const currentValue = stock.shares * (latestPrice || 0);
    return {
      ...stock,
      currentValue,
      latestPrice,
      priceChangePercent,
    };
  });

  // Sort stocks by current value in descending order
  const sortedStocks = processedStocks.sort((a, b) => b.currentValue - a.currentValue);

  // Pie Chart Colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Pie chart data processing
  const pieData = portfolioStocks.map((stock) => {
    const stockMonthlyData = getMonthlyData(stock);
    const latestMonthlyData = stockMonthlyData.length > 0 ? stockMonthlyData[stockMonthlyData.length - 1] : null;
    const latestPrice = latestMonthlyData ? latestMonthlyData.value : 0;
    const currentValue = stock.shares * latestPrice;

    return {
      name: stock.companyOverview?.Name || 'Unknown',
      value: currentValue,
      symbol: stock.symbol,
      holdings: stock.shares,
    };
  });

  // Map stock symbols to colors
  const stockColorMap = portfolioStocks.map((stock, index) => ({
    symbol: stock.symbol,
    color: COLORS[index % COLORS.length],
  }));

  const graphs = {
    "total-value": {
      title: "Stock Price Trends",
      component: loadingGraphData ? (
        <Spinner />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={portfolioHistory} // Adjusted to use portfolioHistory
            margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
          >
            <XAxis dataKey="date" />
            <YAxis
              tickFormatter={(value) => `$${parseFloat(value).toLocaleString()}`}
              domain={[0, (dataMax) => Math.ceil(dataMax * 1.1)]}
            />
            <Tooltip formatter={(value) => `$${parseFloat(value).toLocaleString()}`} />
            <Line type="monotone" dataKey="portfolioValue" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
    "percentage-change": {
      title: "Total Portfolio Percentage Change Over Last Month",
      component: loadingGraphData ? (
        <Spinner />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={portfolioHistory} // Adjusted to use portfolioHistory
            margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
          >
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(value) => `${value}%`} domain={['auto', 'auto']} />
            <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
            <Line type="monotone" dataKey="portfolioPercentChange" stroke="#82ca9d" />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
    "individual-stocks": {
      title: "Individual Stock Performance Over Last Month",
      component: loadingGraphData ? (
        <Spinner />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={portfolioHistory} // Adjusted to use portfolioHistory or appropriate data
            margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
          >
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(value) => `$${parseFloat(value).toLocaleString()}`} />
            <Tooltip formatter={(value, name) => [`$${parseFloat(value).toLocaleString()}`, name]} />
            {portfolioStocks.map((stock, index) => (
              <Line
                key={stock.symbol}
                type="monotone"
                dataKey={stock.symbol} // Adjust based on portfolioHistory structure
                stroke={COLORS[index % COLORS.length]}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ),
    },
  };

  function formatDate(dateString) {
    // Expected input format: '20241023T224500'
    const year = dateString.substring(0, 4);
    const month = dateString.substring(4, 6);
    const day = dateString.substring(6, 8);
    const hour = dateString.substring(9, 11);
    const minute = dateString.substring(11, 13);
    const second = dateString.substring(13, 15);

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    if (userQuery.trim() === '') return;

    setIsChatExpanded(true);

    // Add user's message to the conversation
    setConversation((prevConversation) => [
      ...prevConversation,
      { role: 'user', message: userQuery.trim() },
      { role: 'assistant', message: 'Thinking...' }
    ]);

    // Prepare conversation history for the API
    const apiConversationHistory = conversation.map((msg) => ({
      [msg.role]: msg.message,
    }));

    const cleanedDetails = cleanUserDetails(userDetails);
    if (!cleanedDetails) {
      alert('User details are missing. Please log in again.');
      navigate('/login');
      return;
    }

    // Prepare a prompt that includes user details and user query
    const userPrompt = `
    ${userQuery.trim()}

    The following information is provided by the user, including their personal details and portfolio data. Use this information to offer a personalized, relevant, and professional response to their query.
    [User Details & Portfolio Data]:
    ${JSON.stringify(cleanedDetails, null, 2)}
    `;

    // Call the API
    sendChatMessage(userPrompt, apiConversationHistory)
      .then((response) => response.json())
      .then((data) => {
        let assistantMessage = data.response || 'Sorry, I did not understand your question.';

        // Add assistant's response to the conversation
        setConversation((prevConversation) => {
          const newConv = [...prevConversation];
          newConv[newConv.length - 1] = { role: 'assistant', message: assistantMessage };
          return newConv;
        });
      })
      .catch((error) => {
        console.error('Error querying data:', error);
        setConversation((prevConversation) => {
          const newConv = [...prevConversation];
          newConv[newConv.length - 1] = { role: 'assistant', message: `Error fetching answer + ${error}` };
          return newConv;
        });
        alert('Error querying data. Please try again later.');
      });

    // Clear the input
    setUserQuery('');
  };

  const handleTextareaChange = (e) => {
    setUserQuery(e.target.value);

    // Reset height to auto to calculate scrollHeight correctly
    textareaRef.current.style.height = 'auto';

    // Set height to scrollHeight, limited to maxHeight (6 lines)
    const maxHeight = 6 * 20; // Assuming line-height is 20px
    textareaRef.current.style.height = `${Math.min(
      textareaRef.current.scrollHeight,
      maxHeight
    )}px`;
  };

  const handleChatToggle = () => {
    setIsChatExpanded(!isChatExpanded);
  };

  return (
    <div className="portfolio pt-16">
      <h1 className="text-2xl font-bold mb-4">Your Portfolio</h1>

      {/* Portfolio Summary */}
      <div className="portfolio-summary mb-6">
        <div className="summary-item">
          <h3 className="text-lg font-semibold">Total Invested</h3>
          <p className={`text-xl ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
            ${totalInvested.toFixed(2)}
          </p>
        </div>
        <div className="summary-item">
          <h3 className="text-lg font-semibold">Current Portfolio Value</h3>
          <p className={`text-xl ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
            ${totalPortfolioValue.toFixed(2)}
          </p>
        </div>
        <div className="summary-item">
          <h3 className="text-lg font-semibold">Profit/Loss</h3>
          <p className={`text-xl ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
            {formatProfitOrLoss(profitOrLoss)}
          </p>
        </div>
      </div>

      <div className="flex-container">
        {/* Portfolio Value Graph with Dropdown */}
        <Card className="graph-card">
          <CardHeader>
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">{graphs[selectedGraph].title}</h2>
              <Select
                defaultValue={selectedGraph}
                onChange={(value) => setSelectedGraph(value)}
                className="dropdown-select"
              >
                <SelectItem value="total-value">Total Value</SelectItem>
                <SelectItem value="percentage-change">Percentage Change</SelectItem>
                <SelectItem value="individual-stocks">Individual Stock Performance</SelectItem>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="chart-container">
              {loadingGraphData ? (
                <div className="loader-container">
                  <Spinner />
                  <p>Loading graph data...</p>
                </div>
              ) : (
                graphs[selectedGraph].component
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stock Share Pie Chart */}
        <Card className="pie-chart-card">
          <CardHeader>
            <h2 className="text-lg font-semibold">Stock Share in Portfolio</h2>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  labelLine={false}
                  dataKey="value"
                  nameKey="name"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => {
                    const stockData = pieData.find((d) => d.name === name);
                    return stockData ? (
                      <div>
                        <strong>{name}</strong><br />
                        {`Holdings: ${stockData.holdings}`}<br />
                        {`Value: $${parseFloat(value).toLocaleString()}`}
                      </div>
                    ) : (
                      <p>No data available</p>
                    );
                  }}
                  wrapperStyle={{ whiteSpace: 'pre-line' }} // To handle line breaks
                />
              </PieChart>
            </ResponsiveContainer>


          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {portfolioStocks.length > 0 ? (
          <>
            {/* Stock Table (75%) */}
            <div className="stock-table" style={{ flex: '3' }}>
              <h2 className="text-lg font-semibold mt-4">Your Stocks</h2>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Industry</th>
                      <th>Company Name</th>
                      <th>Quantity</th>
                      <th>Investment Date</th>
                      <th>Today's Change</th>
                      <th>Current Value</th>
                      <th>Predicted Price</th>
                      <th>Trading Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedStocks.map((stock, index) => (
                      <tr
                        key={index}
                        className="clickable-row"
                        onClick={() => navigate(`/stocks/${stock.symbol}`)}
                      >
                        <td>{stock.symbol || 0}</td>
                        <td>{stock.companyOverview?.Industry || 'Unknown'}</td>
                        <td>{stock.companyOverview?.Name || 'Unknown'}</td>
                        <td>{stock.shares || 0}</td>
                        <td>{new Date(stock.dateOfPurchase).toLocaleDateString() || "N/A"}</td>
                        <td>
                          {loadingCurrentPrices ? (
                            <Spinner />
                          ) : (
                            <>
                              {currentPrices[stock.symbol] >= stock.purchasePrice ? '▲' : '▼'}{' '}
                              {currentPrices[stock.symbol] !== null
                                ? (
                                  ((currentPrices[stock.symbol] - stock.purchasePrice) / stock.purchasePrice) *
                                  100
                                ).toFixed(2)
                                : 'N/A'}
                              %
                            </>
                          )}
                        </td>
                        <td>
                          {loadingCurrentPrices ? (
                            <Spinner />
                          ) : (
                            currentPrices[stock.symbol] !== null
                              ? `$${(stock.shares * currentPrices[stock.symbol]).toFixed(2)}`
                              : 'N/A'
                          )}
                        </td>
                        <td>{stock.predictedPrice ? `$${stock.predictedPrice.toFixed(2)}` : 'N/A'}</td>
                        <td>
                          {stock.riskAssessment ? (
                            stock.riskAssessment
                          ) : analyzingSymbol === stock.symbol ? (
                            <Spinner />
                          ) : (
                            <button
                              className="analyze-button"
                              onClick={(e) => handleAnalyze(e, stock.symbol)}
                            >
                              Analyser
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </>
        ) : (
          <p>You have not added any stocks to your portfolio yet.</p>
        )}
      </div>

      {/* Chat Interface */}
      <div className={`chat-interface ${isChatExpanded ? 'expanded' : ''}`}>
        {isChatExpanded && (
          <>
            <button
              className="collapse-button"
              onClick={handleChatToggle}
              aria-label="Collapse chat"
            >
              <FontAwesomeIcon icon={faChevronDown} />
            </button>

            <div className="chat-window" ref={chatWindowRef}>
              {conversation.map((chat, index) => (
                <div key={index} className={`chat-message ${chat.role}`}>
                  <div className="message">{chat.message}</div>
                </div>
              ))}
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} >
          <div className="input-container">
            <textarea
              ref={textareaRef}
              value={userQuery}
              onChange={handleTextareaChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Hey, I'm your Financial Advisor. Feel free to ask me any questions you have..."
              rows="1"
              className='chat-input'
            />
            <button type="submit" className="send-button">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>

        {!isChatExpanded && (
          <button
            className="collapse-button"
            onClick={handleChatToggle}
            aria-label="Expand chat"
          >
            <FontAwesomeIcon icon={faChevronUp} />
          </button>
        )}
      </div>
    </div>
  );
};

export default Portfolio;
