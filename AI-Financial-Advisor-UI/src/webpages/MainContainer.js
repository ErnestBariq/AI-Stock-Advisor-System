import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createChart } from 'lightweight-charts';
import { ChevronDown, Send } from 'lucide-react';
import { getTopMovers, getStockTimeSeries, sendChatMessage } from '../api/client';
import './MainContainer.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronUp, faChevronDown } from '@fortawesome/free-solid-svg-icons';

function MainComponent() {
  const { symbol } = useParams();
  const [topGainers, setTopGainers] = useState([]);
  const [topLosers, setTopLosers] = useState([]);
  const [mostActive, setMostActive] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [conversation, setConversation] = useState([]);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [dailyData, setDailyData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [error, setError] = useState(null);
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const textareaRef = useRef(null);
  const chatWindowRef = useRef(null);
  const elementRef = useRef(null);
  const resizeObserverRef = useRef(null);

  const navigate = useNavigate();

  const userDetailsString = localStorage.getItem('userDetails');
  var userDetails = userDetailsString ? JSON.parse(userDetailsString) : null;

  // If userDetails is present, remove the monthly_data from the portfolio array
  if (userDetails && userDetails.portfolio) {
    // Construct a simpler userDetails object:
    userDetails = {
      username: userDetails.username,
      age: userDetails.age,
      gender: userDetails.gender,
      email: userDetails.email,
      investmentGoal: userDetails.investmentGoal,
      riskAppetite: userDetails.riskAppetite,
      timeHorizon: userDetails.timeHorizon,
      portfolio: userDetails.portfolio.map(stock => ({
        symbol: stock.symbol,
        name: stock.companyOverview?.Name,
        currentPrice: stock.currentPrice,
        purchasePrice: stock.purchasePrice,
        shares: stock.shares,
        amount: stock.amount
      }))
    };
  }

  useEffect(() => {
    setSelectedSymbol(symbol);
  }, [symbol]);

  // Fetch top gainers, losers, and most active on component mount
  useEffect(() => {
    getTopMovers()
      .then((response) => response.json())
      .then((data) => {
        if (data.top_gainers && data.top_losers && data.most_active) {
          setTopGainers(data.top_gainers.slice(0, 10)); // Get top 10 gainers
          setTopLosers(data.top_losers.slice(0, 10));   // Get top 10 losers
          setMostActive(data.most_active.slice(0, 10)); // Get top 10 most active
          setSelectedSymbol(data.most_active[0].ticker); // Set initial symbol for the chart
        } else {
          alert('No data found for top gainers, losers, or most active.');
        }
      })
      .catch((error) => {
        console.error('Error fetching top movers:', error);
        alert('Error fetching top movers. Please try again later.');
      });
  }, []);

  // Fetch time-series data for daily, weekly, and monthly
  useEffect(() => {
    if (selectedSymbol) {
      // Daily data
      getStockTimeSeries(selectedSymbol, 'TIME_SERIES_DAILY')
        .then(response => response.json())
        .then(({ data }) => {
          if (data) {
            setDailyData(data.map(d => ({ time: d.time, value: d.close })));
          } else {
            throw new Error('Daily data not available.');
          }
        })
        .catch(error => {
          console.error('Error fetching daily data:', error);
          setError('Error fetching daily data. Please try again later.');
        });

      // Weekly data
      getStockTimeSeries(selectedSymbol, 'TIME_SERIES_WEEKLY')
        .then(response => response.json())
        .then(({ data }) => {
          if (data) {
            setWeeklyData(data.map(d => ({ time: d.time, value: d.close })));
          } else {
            throw new Error('Weekly data not available.');
          }
        })
        .catch(error => {
          console.error('Error fetching weekly data:', error);
          setError('Error fetching weekly data. Please try again later.');
        });

      // Monthly data
      getStockTimeSeries(selectedSymbol, 'TIME_SERIES_MONTHLY')
        .then(response => response.json())
        .then(({ data }) => {
          if (data) {
            setMonthlyData(data.map(d => ({ time: d.time, value: d.close })));
          } else {
            throw new Error('Monthly data not available.');
          }
        })
        .catch(error => {
          console.error('Error fetching monthly data:', error);
          setError('Error fetching monthly data. Please try again later.');
        });
    }
  }, [selectedSymbol]);

  // Initialize chart and update based on interval
  useEffect(() => {
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        backgroundColor: '#0e0e10',
        textColor: '#ffffff',
        timeScale: {
          borderColor: '#d1d4dc',
          fixLeftEdge: true,
          visible: true,
          rightOffset: 10,
          barSpacing: 10,
          tickMarkFormatter: (time, tickMarkType, locale) => {
            // Customize time format if needed
            return new Date(time * 1000).toLocaleDateString(locale, {
              month: 'short',
              day: 'numeric',
            });
          },
        },
      }
    });

    chartRef.current = chart;
    setChartInterval('1D'); // Set default to daily on load

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, [dailyData, weeklyData, monthlyData]);

  // Function to switch chart interval
  const setChartInterval = (interval) => {
    if (!chartRef.current) return;

    let data = [];
    let color = '#2962FF';

    switch (interval) {
      case '1D':
        data = dailyData;
        color = '#2962FF';
        break;
      case '1W':
        data = weeklyData;
        color = 'rgb(225, 87, 90)';
        break;
      case '1M':
        data = monthlyData;
        color = 'rgb(242, 142, 44)';
        break;
      default:
        data = dailyData;
    }

    if (data && data.length > 0) {
      // Remove the existing series if it exists
      if (chartRef.current.lineSeries) {
        chartRef.current.removeSeries(chartRef.current.lineSeries);
      }

      // Create a new line series and set the data
      chartRef.current.lineSeries = chartRef.current.addLineSeries({ color });
      chartRef.current.lineSeries.setData(data);
      chartRef.current.timeScale().fitContent();
    } else {
      console.error("Data for the selected interval is undefined or empty.");
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (userQuery.trim() === '') return;

    // Expand chat on user message send
    setIsChatExpanded(true);

    // Add user's message to the conversation
    setConversation((prevConversation) => [
      ...prevConversation,
      { role: 'user', message: userQuery.trim() },
      { role: 'assistant', message: 'Thinking...' }
    ]);

    // Prepare the conversation history for the API
    const apiConversationHistory = conversation.map((msg) => ({
      [msg.role]: msg.message,
    }));

    sendChatMessage(userQuery.trim(), apiConversationHistory)
      .then((response) => response.json())
      .then((data) => {
        let assistantMessage = '';

        if (data.response) {
          assistantMessage = data.response;
        } else {
          assistantMessage = 'Sorry, I did not understand your question.';
        }

        // Add assistant's response to the conversation
        setConversation((prevConversation) => {
          const newConv = [...prevConversation];
          // The last added message is "Thinking...", so replace it:
          newConv[newConv.length - 1] = { role: 'assistant', message: assistantMessage };
          return newConv;
        });
      })
      .catch((error) => {
        console.error('Error querying data:', error);
        setConversation((prevConversation) => {
          const newConv = [...prevConversation];
          // The last added message is "Thinking...", so replace it:
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

  const handleStockClick = (symbol) => {
    setSelectedSymbol(symbol); // Update the chart above to this stock
  };

  return (
    <div className={`main-container ${isChatExpanded ? 'chat-expanded' : ''}`}>
      <div className="content-container">
        <h1 className="section-title">Today's Top Movers</h1>

        {/* Error Message */}
        {error && <p className="error-message">{error}</p>}

        {selectedSymbol && <h2 className="chart-symbol-title">{selectedSymbol}</h2>}

        {/* Interval Buttons */}
        <div className="interval-buttons">
          <button onClick={() => setChartInterval('1D')}>1D</button>
          <button onClick={() => setChartInterval('1W')}>1W</button>
          <button onClick={() => setChartInterval('1M')}>1M</button>
        </div>

        {/* Chart + Add to Portfolio */}
        <div className="chart-section">
          <div ref={chartContainerRef} className="chart-container w-full" />
          <button
            className="add-to-portfolio-button"
            onClick={() => navigate(`/stocks/${selectedSymbol}`)}
            disabled={!selectedSymbol}
          >
            Ajouter au portefeuille
          </button>
        </div>

        {/* Display top gainers, losers, and most active */}
        <div className="lists-container">
          {/* Top Gainers */}
          <div className="list">
            <h2>Top 10 Gainers</h2>
            <table>
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Price (USD)</th>
                  <th>Change</th>
                  <th>Volume</th>
                </tr>
              </thead>
              <tbody>
                {topGainers.map((stock) => (
                  <tr key={stock.ticker} onClick={() => handleStockClick(stock.ticker)}>
                    <td>{stock.ticker}</td>
                    <td>{stock.price}</td>
                    <td>
                      {stock.change_percentage.includes('-') ? (
                        <span className="negative-change">
                          ▼ {stock.change_percentage} ({stock.change_amount})
                        </span>
                      ) : (
                        <span className="positive-change">
                          ▲ {stock.change_percentage} ({stock.change_amount})
                        </span>
                      )}
                    </td>
                    <td>{stock.volume}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Top Losers */}
          <div className="list">
            <h2>Top 10 Losers</h2>
            <table>
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Price (USD)</th>
                  <th>Change</th>
                  <th>Volume</th>
                </tr>
              </thead>
              <tbody>
                {topLosers.map((stock) => (
                  <tr key={stock.ticker} onClick={() => handleStockClick(stock.ticker)}>
                    <td>{stock.ticker}</td>
                    <td>{stock.price}</td>
                    <td>
                      {stock.change_percentage.includes('-') ? (
                        <span className="negative-change">
                          ▼ {stock.change_percentage} ({stock.change_amount})
                        </span>
                      ) : (
                        <span className="positive-change">
                          ▲ {stock.change_percentage} ({stock.change_amount})
                        </span>
                      )}
                    </td>
                    <td>{stock.volume}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Most Active */}
          <div className="list">
            <h2>Top 10 Most Active</h2>
            <table>
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Price (USD)</th>
                  <th>Change</th>
                  <th>Volume</th>
                </tr>
              </thead>
              <tbody>
                {mostActive.map((stock) => (
                  <tr key={stock.ticker} onClick={() => handleStockClick(stock.ticker)}>
                    <td>{stock.ticker}</td>
                    <td>{stock.price}</td>
                    <td>
                      {stock.change_percentage.includes('-') ? (
                        <span className="negative-change">
                          ▼ {stock.change_percentage} ({stock.change_amount})
                        </span>
                      ) : (
                        <span className="positive-change">
                          ▲ {stock.change_percentage} ({stock.change_amount})
                        </span>
                      )}
                    </td>
                    <td>{stock.volume}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
}

export default MainComponent;
