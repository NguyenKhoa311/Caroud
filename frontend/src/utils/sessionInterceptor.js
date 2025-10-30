/**
 * Axios Interceptor for Session Management
 * 
 * This interceptor detects when a user's session has been invalidated
 * (e.g., they logged in from another device) and handles the logout process.
 * 
 * Usage:
 * Import this file in your main App.js or index.js:
 * import './utils/sessionInterceptor';
 */

import axios from 'axios';

// Flag to prevent multiple alerts
let sessionExpiredAlertShown = false;

// Response interceptor
axios.interceptors.response.use(
  (response) => {
    // Check for session expiration header
    const sessionExpired = response.headers['x-session-expired'];
    const sessionReason = response.headers['x-session-reason'];
    
    if (sessionExpired === 'true' && !sessionExpiredAlertShown) {
      sessionExpiredAlertShown = true;
      
      // Clear user data
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Show user-friendly message
      let message = 'Your session has expired. Please log in again.';
      if (sessionReason === 'logged_in_elsewhere') {
        message = 'You have been logged out because you logged in from another device.';
      }
      
      alert(message);
      
      // Redirect to login page
      window.location.href = '/login';
      
      // Reset flag after redirect
      setTimeout(() => {
        sessionExpiredAlertShown = false;
      }, 1000);
    }
    
    return response;
  },
  (error) => {
    // Check error response for session expiration
    if (error.response) {
      const sessionExpired = error.response.headers['x-session-expired'];
      const sessionReason = error.response.headers['x-session-reason'];
      
      if (sessionExpired === 'true' && !sessionExpiredAlertShown) {
        sessionExpiredAlertShown = true;
        
        // Clear user data
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Show user-friendly message
        let message = 'Your session has expired. Please log in again.';
        if (sessionReason === 'logged_in_elsewhere') {
          message = 'You have been logged out because you logged in from another device.';
        }
        
        alert(message);
        
        // Redirect to login page
        window.location.href = '/login';
        
        // Reset flag after redirect
        setTimeout(() => {
          sessionExpiredAlertShown = false;
        }, 1000);
      }
    }
    
    return Promise.reject(error);
  }
);

export default axios;
