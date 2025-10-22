// Authentication utility functions and hooks
import { useState, useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';

// Custom hook to check authentication status
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      // Check for token authentication (email/password login)
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      
      if (token && userStr) {
        const userData = JSON.parse(userStr);
        setUser({
          username: userData.username,
          email: userData.email,
          id: userData.id,
          authType: 'token'
        });
        setLoading(false);
        return;
      }

      // Check for Cognito authentication (social login)
      const currentUser = await getCurrentUser();
      setUser({
        username: currentUser.username || currentUser.signInDetails?.loginId,
        authType: 'cognito'
      });
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();

    // Listen for custom auth events
    const handleAuthChange = () => {
      checkAuth();
    };

    // Listen for storage changes (from other tabs)
    const handleStorageChange = (e) => {
      if (e.key === 'token' || e.key === 'user') {
        checkAuth();
      }
    };

    window.addEventListener('auth-change', handleAuthChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return { user, loading, refreshAuth: checkAuth };
};

// Trigger auth change event
export const triggerAuthChange = () => {
  window.dispatchEvent(new Event('auth-change'));
};

// Login helper
export const setAuthData = (token, userData) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(userData));
  triggerAuthChange();
};

// Logout helper
export const clearAuthData = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  triggerAuthChange();
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  return !!token;
};

// Get current user from localStorage
export const getCurrentUserData = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch (error) {
      return null;
    }
  }
  return null;
};

// Get auth token
export const getAuthToken = () => {
  return localStorage.getItem('token');
};
