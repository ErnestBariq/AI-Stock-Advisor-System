// src/api/config.js
// Configuration centralisée des endpoints API et clés d'accès

export const API_CONFIG = {
  BACKEND_URL: process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000',
  CHAT_SERVICE_URL: process.env.REACT_APP_CHAT_SERVICE_URL || 'http://localhost:5000/chat',
  ALPHA_VANTAGE_BASE_URL: process.env.REACT_APP_ALPHA_VANTAGE_BASE_URL || 'https://www.alphavantage.co/query',
  ALPHA_VANTAGE_API_KEY: process.env.REACT_APP_ALPHA_VANTAGE_API_KEY || '9ZQUXAH9JOQRSQDV',
};

export default API_CONFIG;
