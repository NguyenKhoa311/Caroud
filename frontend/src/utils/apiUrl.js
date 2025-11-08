/**
 * Automatically detect the correct API URL based on current hostname
 * This allows the app to work on both localhost and network IP addresses
 * Note: Returns base URL without /api suffix (services add /api themselves)
 */
export const getApiUrl = () => {
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
  const hostname = window.location.hostname;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  
  return `${protocol}//${hostname}:8000/ws`;
};

