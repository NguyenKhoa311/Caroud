/**
 * Environment Configuration
 * 
 * Automatically detects environment and provides correct API/WebSocket URLs
 * 
 * Development (npm start):
 *   - Uses .env file
 *   - API: http://localhost:8000
 *   - WS: ws://localhost:8000/ws
 * 
 * Production (npm run build):
 *   - Uses .env.production file
 *   - API: https://caroud.click
 *   - WS: wss://caroud.click/ws
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Get environment from env variable or detect from NODE_ENV
const getEnvironment = () => {
  if (process.env.REACT_APP_ENV) {
    return process.env.REACT_APP_ENV;
  }
  return isDevelopment ? 'development' : 'production';
};

// API Base URL
const getApiUrl = () => {
  // First priority: environment variable
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Fallback based on environment
  if (isDevelopment) {
    return 'http://localhost:8000';
  }
  
  return 'https://caroud.click';
};

// WebSocket Base URL
const getWsUrl = () => {
  // First priority: environment variable
  if (process.env.REACT_APP_WS_URL) {
    return process.env.REACT_APP_WS_URL;
  }
  
  // Fallback based on environment
  if (isDevelopment) {
    return 'ws://localhost:8000/ws';
  }
  
  return 'wss://caroud.click/ws';
};

// AWS Cognito Configuration
const getCognitoConfig = () => ({
  region: process.env.REACT_APP_AWS_REGION || 'ap-southeast-1',
  userPoolId: process.env.REACT_APP_USER_POOL_ID,
  userPoolWebClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID,
  identityPoolId: process.env.REACT_APP_IDENTITY_POOL_ID,
  oauth: {
    domain: process.env.REACT_APP_OAUTH_DOMAIN,
    redirectSignIn: process.env.REACT_APP_REDIRECT_SIGN_IN || 
                    (isDevelopment ? 'http://localhost:3000/' : 'https://caroud.click/'),
    redirectSignOut: process.env.REACT_APP_REDIRECT_SIGN_OUT || 
                     (isDevelopment ? 'http://localhost:3000/' : 'https://caroud.click/'),
    responseType: 'code'
  }
});

const config = {
  environment: getEnvironment(),
  isDevelopment,
  isProduction,
  apiUrl: getApiUrl(),
  wsUrl: getWsUrl(),
  cognito: getCognitoConfig(),
};

// Log configuration in development
if (isDevelopment) {
  console.log('🔧 Environment Configuration:', {
    environment: config.environment,
    apiUrl: config.apiUrl,
    wsUrl: config.wsUrl,
    NODE_ENV: process.env.NODE_ENV
  });
}

export default config;
