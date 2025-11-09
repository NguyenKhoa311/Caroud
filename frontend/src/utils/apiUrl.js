/**
 * Automatically detect the correct API URL based on current hostname
 * This allows the app to work on both localhost and network IP addresses
 * Note: Returns base URL without /api suffix (services add /api themselves)
 */
export const getApiUrl = () => {
  // Use environment variable first (supports both .env and .env.production)
  if (process.env.REACT_APP_API_URL) {
    console.log('✅ [apiUrl.js] Using REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }
  
  // Fallback: Auto-detect based on hostname
  console.log('⚠️ [apiUrl.js] REACT_APP_API_URL not found, using fallback');
  const hostname = window.location.hostname;
  
  // If accessing via localhost, use localhost for backend
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  }
  
  // Otherwise, use the same IP/hostname with port 8000
  return `http://${hostname}:8000`;
};

/**
 * Get WebSocket URL
 */
export const getWsUrl = () => {
  // Use environment variable first
  if (process.env.REACT_APP_WS_URL) {
    console.log('✅ [apiUrl.js] Using REACT_APP_WS_URL:', process.env.REACT_APP_WS_URL);
    return process.env.REACT_APP_WS_URL;
  }
  
  // Fallback: Auto-detect based on hostname
  console.log('⚠️ [apiUrl.js] REACT_APP_WS_URL not found, using fallback');
  const hostname = window.location.hostname;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  
  return `${protocol}//${hostname}:8000/ws`;
};
