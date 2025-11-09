import axios from 'axios';

// Get API URL from environment variables
// Development (.env): http://localhost:8000 or https://caroud.click
// Production (.env.production): https://caroud.click
const getApiBaseUrl = () => {
  // Debug: Log environment variable
  console.log('🔍 DEBUG - process.env.REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
  
  // Use environment variable if set
  if (process.env.REACT_APP_API_URL) {
    console.log('✅ Using REACT_APP_API_URL from .env:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }
  
  // Fallback: Auto-detect based on hostname (legacy behavior)
  console.log('⚠️ REACT_APP_API_URL not found, using fallback hostname detection');
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    console.log('🏠 Fallback: Using localhost:8000');
    return 'http://localhost:8000';
  } else {
    console.log('🌐 Fallback: Using hostname:', hostname);
    return `http://${hostname}:8000`;
  }
};

const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests and set baseURL dynamically
api.interceptors.request.use(
  (config) => {
    // Set baseURL dynamically for each request
    config.baseURL = getApiBaseUrl();
    
    // Debug: Log the API URL being used
    console.log('🔗 API Request:', config.method?.toUpperCase(), config.baseURL + (config.url || ''));
    
    // Get token from sessionStorage (for email/password auth)
    const token = sessionStorage.getItem('token');
    
    if (token) {
      // Django REST Framework expects "Token <token>"
      config.headers.Authorization = `Token ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login or refresh token
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
