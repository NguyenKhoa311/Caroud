import axios from 'axios';

// Automatically detect the correct API URL based on current hostname
const getApiBaseUrl = () => {
  // Get the current hostname (localhost or IP address)
  const hostname = window.location.hostname;
  
  // If accessing via network IP, use that IP for backend
  // Otherwise use localhost
  // Note: No /api suffix here because services already include it
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  } else {
    // Use the same hostname as frontend with backend port 8000
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
