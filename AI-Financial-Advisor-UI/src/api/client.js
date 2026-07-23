// src/api/client.js
import API_CONFIG from './config';

/**
 * Helper d'exécution de requêtes HTTP JSON.
 */
async function request(url, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  return response;
}

// ----------------------------------------------------
// Authentification et Profil Utilisateur
// ----------------------------------------------------
export const login = async (email, password) => {
  return request(`${API_CONFIG.BACKEND_URL}/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

export const signup = async (userData) => {
  return request(`${API_CONFIG.BACKEND_URL}/signup`, {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

export const getUserDetails = async (email) => {
  return request(`${API_CONFIG.BACKEND_URL}/user-details/${encodeURIComponent(email)}`, {
    method: 'GET',
  });
};

// ----------------------------------------------------
// Gestion du Portefeuille
// ----------------------------------------------------
export const addToPortfolio = async (email, stock) => {
  return request(`${API_CONFIG.BACKEND_URL}/user/${encodeURIComponent(email)}/portfolio`, {
    method: 'POST',
    body: JSON.stringify({ stock }),
  });
};

export const deletePortfolio = async (email) => {
  return request(`${API_CONFIG.BACKEND_URL}/delete-portfolio/${encodeURIComponent(email)}`, {
    method: 'DELETE',
  });
};

export const updateRiskAssessment = async (email, symbol, riskAssessment) => {
  return request(
    `${API_CONFIG.BACKEND_URL}/user/${encodeURIComponent(email)}/portfolio/${encodeURIComponent(symbol)}/risk-assessment`,
    {
      method: 'PATCH',
      body: JSON.stringify({ riskAssessment }),
    }
  );
};

// ----------------------------------------------------
// Actions & Données Financières
// ----------------------------------------------------
export const getStockQuote = async (symbol) => {
  return request(`${API_CONFIG.BACKEND_URL}/stocks/quote?symbol=${encodeURIComponent(symbol)}`);
};

export const getStockOverview = async (symbol) => {
  return request(`${API_CONFIG.BACKEND_URL}/stocks/overview?symbol=${encodeURIComponent(symbol)}`);
};

export const getIncomeStatement = async (symbol) => {
  return request(`${API_CONFIG.BACKEND_URL}/stocks/income_statement?symbol=${encodeURIComponent(symbol)}`);
};

export const getStockNews = async (symbol) => {
  return request(`${API_CONFIG.BACKEND_URL}/stocks/news?symbol=${encodeURIComponent(symbol)}`);
};

export const getInsiderTransactions = async (symbol) => {
  return request(`${API_CONFIG.BACKEND_URL}/stocks/insider_transactions?symbol=${encodeURIComponent(symbol)}`);
};

export const getStockTimeSeries = async (symbol, func = 'TIME_SERIES_DAILY') => {
  return request(`${API_CONFIG.BACKEND_URL}/stocks/time_series?symbol=${encodeURIComponent(symbol)}&function=${func}`);
};

export const getStockMonthlyData = async (symbol) => {
  return request(`${API_CONFIG.BACKEND_URL}/stocks/time_series_monthly?symbol=${encodeURIComponent(symbol)}`);
};

export const getTopMovers = async () => {
  return request(`${API_CONFIG.BACKEND_URL}/stocks/top_movers`);
};

export const analyzeStock = async (symbol) => {
  return request(`${API_CONFIG.BACKEND_URL}/stocks/${encodeURIComponent(symbol)}/analyze`, {
    method: 'POST',
  });
};

// ----------------------------------------------------
// Chat & Assistant IA
// ----------------------------------------------------
export const sendChatMessage = async (query, conversationHistory = []) => {
  return request(API_CONFIG.CHAT_SERVICE_URL, {
    method: 'POST',
    body: JSON.stringify({
      query,
      conversation_history: conversationHistory,
    }),
  });
};

// ----------------------------------------------------
// Alpha Vantage Direct (Recherche de symboles)
// ----------------------------------------------------
export const searchSymbolsAlphaVantage = async (query) => {
  const url = `${API_CONFIG.ALPHA_VANTAGE_BASE_URL}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${API_CONFIG.ALPHA_VANTAGE_API_KEY}`;
  return fetch(url);
};

const apiClient = {
  API_CONFIG,
  login,
  signup,
  getUserDetails,
  addToPortfolio,
  deletePortfolio,
  updateRiskAssessment,
  getStockQuote,
  getStockOverview,
  getIncomeStatement,
  getStockNews,
  getInsiderTransactions,
  getStockTimeSeries,
  getStockMonthlyData,
  getTopMovers,
  analyzeStock,
  sendChatMessage,
  searchSymbolsAlphaVantage,
};

export default apiClient;
