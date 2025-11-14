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
    
    // Priority 1: Get token from sessionStorage (for email/password auth)
    const tokenAuth = sessionStorage.getItem('token');
    
    if (tokenAuth) {
      // Django REST Framework expects "Token <token>"
      config.headers.Authorization = `Token ${tokenAuth}`;
      console.log('🔑 Using Token auth:', tokenAuth.substring(0, 20) + '...');
      return config;
    }
    
    // Priority 2: Get Cognito token from OIDC storage
    const oidcStorageKey = `oidc.user:https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_MffQbWHoJ:7r5jtsi7pmgvpuu3hroso4qm7m`;
    const oidcUserStr = sessionStorage.getItem(oidcStorageKey);
    
    console.log('🔍 Checking OIDC storage:', oidcStorageKey);
    console.log('🔍 OIDC data exists:', !!oidcUserStr);
    
    if (oidcUserStr) {
      try {
        const oidcUser = JSON.parse(oidcUserStr);
        // Use id_token instead of access_token for authentication
        const cognitoToken = oidcUser.id_token;
        
        console.log('🔍 OIDC user parsed:', { 
          hasIdToken: !!cognitoToken,
          tokenPreview: cognitoToken ? cognitoToken.substring(0, 20) + '...' : 'none'
        });
        
        if (cognitoToken) {
          // Cognito uses Bearer token
          config.headers.Authorization = `Bearer ${cognitoToken}`;
          console.log('✅ Using Cognito Bearer token (id_token)');
        }
      } catch (error) {
        console.error('❌ Failed to parse OIDC user data:', error);
      }
    } else {
      console.log('⚠️ No auth token found in sessionStorage');
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
