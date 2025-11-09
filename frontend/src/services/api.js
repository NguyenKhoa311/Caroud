import axios from 'axios';
import config from '../config/environment';

// Get API URL from centralized config
const getApiBaseUrl = () => {
  console.log('🔗 API Base URL:', config.apiUrl);
  return config.apiUrl;
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
    
    // Debug: Log the API URL being used in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔗 API Request:', config.method?.toUpperCase(), config.baseURL + (config.url || ''));
    }
    
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
