/**
 * API URL configuration for dual API Gateway architecture
 * 
 * - REST API: For authentication, profiles, leaderboard (can have higher latency)
 * - Realtime API: For matchmaking, game moves, WebSocket (low latency required)
 */

/**
 * Get REST API URL (slow path - authentication, profiles, leaderboard)
 * Uses Lambda for additional processing, rate limiting
 */
export const getRestApiUrl = () => {
  // Production: Use REST API Gateway
  if (process.env.REACT_APP_API_URL) {
    console.log('✅ [dualApiUrl.js] Using REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }
  
  // Development: Auto-detect based on hostname
  console.log('⚠️ [dualApiUrl.js] REACT_APP_API_URL not found, using fallback');
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  }
  
  return `http://${hostname}:8000`;
};

/**
 * Get Real-time API URL (fast path - matchmaking, game moves)
 * Direct connection to ALB/EC2 cluster for minimal latency
 */
export const getRealtimeApiUrl = () => {
  // Production: Use Real-time API Gateway (direct to ALB)
  if (process.env.REACT_APP_REALTIME_API_URL) {
    return process.env.REACT_APP_REALTIME_API_URL;
  }
  
  // Development: Same as REST API in dev mode
  return getRestApiUrl();
};

/**
 * Get WebSocket URL for real-time game communication
 */
export const getWsUrl = () => {
  // Production: Use WebSocket URL from environment
  if (process.env.REACT_APP_WS_URL) {
    console.log('✅ [dualApiUrl.js] Using REACT_APP_WS_URL:', process.env.REACT_APP_WS_URL);
    return process.env.REACT_APP_WS_URL;
  }
  
  // Development: Auto-detect based on hostname
  console.log('⚠️ [dualApiUrl.js] REACT_APP_WS_URL not found, using fallback');
  const hostname = window.location.hostname;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  
  return `${protocol}//${hostname}:8000/ws`;
};

/**
 * Route API call to appropriate gateway based on endpoint
 * 
 * @param {string} endpoint - API endpoint path
 * @returns {string} - Full URL with appropriate gateway
 */
export const getApiUrlForEndpoint = (endpoint) => {
  // Real-time endpoints (use fast path)
  const realtimeEndpoints = [
    '/api/matchmaking/',
    '/api/games/',
    '/api/users/rooms/',  // When followed by {code}/join, /start, /leave
    '/ws/'
  ];
  
  // Check if endpoint needs real-time API
  const isRealtime = realtimeEndpoints.some(pattern => endpoint.includes(pattern));
  
  if (isRealtime) {
    // Check for specific room actions
    if (endpoint.includes('/api/users/rooms/')) {
      // /api/users/rooms/{code}/join|leave|start = realtime
      // /api/users/rooms/ or /api/users/rooms/{code} = rest
      if (endpoint.match(/\/rooms\/[^/]+\/(join|leave|start)/)) {
        return getRealtimeApiUrl();
      }
      return getRestApiUrl();
    }
    
    return getRealtimeApiUrl();
  }
  
  // Default to REST API for everything else
  return getRestApiUrl();
};

/**
 * Debug logging for API routing
 */
export const logApiRouting = (endpoint) => {
  const url = getApiUrlForEndpoint(endpoint);
  const isRealtime = url === getRealtimeApiUrl();
  
  console.log(
    `🔀 API Route: ${endpoint}\n` +
    `   → Gateway: ${isRealtime ? '⚡ REALTIME (ALB)' : '📡 REST (Lambda)'}\n` +
    `   → URL: ${url}`
  );
};
