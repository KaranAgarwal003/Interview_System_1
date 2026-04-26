export const API_CONFIG = {
  // Express Backend (Main API - Authentication, User Management)
  // Now using Vite Proxy for HTTPS compatibility
  EXPRESS_BASE_URL: "/api",
  
  // Flask Backend (AI Features)
  // Now using Vite Proxy for HTTPS compatibility
  FLASK_BASE_URL: "/flask-api",

  TIMEOUT: 15000,
  WITH_CREDENTIALS: true,
};

// Helper function to get the appropriate API URL
export const getApiUrl = (endpoint, useFlask = false) => {
  const baseUrl = useFlask
    ? API_CONFIG.FLASK_BASE_URL
    : API_CONFIG.EXPRESS_BASE_URL;
  return `${baseUrl}${endpoint}`;
};

export default API_CONFIG;
