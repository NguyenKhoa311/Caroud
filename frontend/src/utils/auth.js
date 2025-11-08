// /**
//  * Authentication Utility Module
//  * 
//  * Provides centralized authentication state management for the entire app.
//  * Uses session-based storage (cleared when browser/tab closes) for security.
//  * 
//  * Features:
//  * - Custom useAuth() hook for components to access auth state
//  * - Event-based synchronization across components
//  * - Automatic logout on browser close (sessionStorage)
//  * - Support for both Token auth (email/password) and Cognito (social login)
//  * 
//  * Usage:
//  *   import { useAuth, setAuthData, clearAuthData } from './utils/auth';
//  *   
//  *   function MyComponent() {
//  *     const { user, loading } = useAuth();
//  *     if (loading) return <div>Loading...</div>;
//  *     if (user) return <div>Hello {user.username}</div>;
//  *   }
//  * 
//  * @module auth
//  */

// // Authentication utility functions and hooks
// import { useState, useEffect } from 'react';
// // import { getCurrentUser } from 'aws-amplify/auth'; // DISABLED until Cognito is configured

// /**
//  * Custom React hook for authentication state management.
//  * 
//  * Automatically checks for authenticated user on mount and updates
//  * when authentication changes (login/logout).
//  * 
//  * Authentication Flow:
//  * 1. Check sessionStorage for token (email/password auth)
//  * 2. If not found, check Cognito (social login)
//  * 3. Set user state and loading state accordingly
//  * 
//  * Event Listeners:
//  * - 'auth-change': Custom event fired when auth state changes (same tab)
//  * - 'storage': Browser event for sessionStorage changes (cross-tab sync)
//  * 
//  * @returns {Object} Auth state object
//  * @returns {Object|null} returns.user - Current user data or null if not authenticated
//  * @returns {string} returns.user.username - User's display name
//  * @returns {string} returns.user.email - User's email address
//  * @returns {number} returns.user.id - User's unique ID
//  * @returns {string} returns.user.authType - 'token' or 'cognito'
//  * @returns {boolean} returns.loading - True while checking authentication
//  * @returns {Function} returns.refreshAuth - Function to manually refresh auth state
//  * 
//  * @example
//  * function Navbar() {
//  *   const { user, loading } = useAuth();
//  *   
//  *   if (loading) return <div>Loading...</div>;
//  *   
//  *   return (
//  *     <nav>
//  *       {user ? (
//  *         <span>Welcome, {user.username}!</span>
//  *       ) : (
//  *         <Link to="/login">Login</Link>
//  *       )}
//  *     </nav>
//  *   );
//  * }
//  */
// export const useAuth = () => {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);

//   /**
//    * Check current authentication status.
//    * 
//    * Priority:
//    * 1. Token authentication (sessionStorage) - for email/password login
//    * 2. Cognito authentication - for social login (Google/Facebook)
//    * 
//    * @async
//    * @private
//    */
//   const checkAuth = async () => {
//     try {
//       // Check for token authentication (email/password login)
//       const token = sessionStorage.getItem('token');
//       const userStr = sessionStorage.getItem('user');
      
//       if (token && userStr) {
//         const userData = JSON.parse(userStr);
//         setUser({
//           username: userData.username,
//           email: userData.email,
//           id: userData.id,
//           authType: 'token'
//         });
//         setLoading(false);
//         return;
//       }

//       // DISABLED: Check for Cognito authentication (social login)
//       // Enable this after Cognito is fully configured
//       /*
//       try {
//         const currentUser = await getCurrentUser();
//         setUser({
//           username: currentUser.username || currentUser.signInDetails?.loginId,
//           authType: 'cognito'
//         });
//       } catch (cognitoError) {
//         // No Cognito user, that's fine
//         setUser(null);
//       }
//       */
      
//       // For now, if no token auth, user is not logged in
//       setUser(null);
//     } catch (error) {
//       console.error('Auth check error:', error);
//       setUser(null);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     // Initial auth check on component mount
//     checkAuth();

//     /**
//      * Event handler for authentication changes.
//      * Triggered when setAuthData() or clearAuthData() is called.
//      * Re-checks authentication to update component state.
//      */
//     const handleAuthChange = () => {
//       checkAuth();
//     };

//     /**
//      * Event handler for sessionStorage changes from other tabs.
//      * Allows auth state to sync across multiple browser tabs.
//      * 
//      * Note: Only fires for changes made in OTHER tabs, not the current tab.
//      * That's why we also need the custom 'auth-change' event.
//      */
//     const handleStorageChange = (e) => {
//       if (e.key === 'token' || e.key === 'user') {
//         checkAuth();
//       }
//     };

//     // Listen for auth changes in current tab
//     window.addEventListener('auth-change', handleAuthChange);
    
//     // Listen for auth changes in other tabs
//     window.addEventListener('storage', handleStorageChange);

//     // Cleanup event listeners on unmount
//     return () => {
//       window.removeEventListener('auth-change', handleAuthChange);
//       window.removeEventListener('storage', handleStorageChange);
//     };
//   }, []);

//   return { user, loading, refreshAuth: checkAuth };
// };

// /**
//  * Trigger authentication change event.
//  * 
//  * Dispatches custom 'auth-change' event to notify all components
//  * using useAuth() hook that authentication state has changed.
//  * 
//  * Called by:
//  * - setAuthData() after successful login/registration
//  * - clearAuthData() after logout
//  * 
//  * @private
//  */
// export const triggerAuthChange = () => {
//   window.dispatchEvent(new Event('auth-change'));
// };

// /**
//  * Store authentication data and trigger state update.
//  * 
//  * Call this function after successful login or registration.
//  * Stores token and user data in sessionStorage (cleared on browser close).
//  * 
//  * @param {string} token - Authentication token from backend
//  * @param {Object} userData - User data object
//  * @param {number} userData.id - User's unique ID
//  * @param {string} userData.username - User's display name
//  * @param {string} userData.email - User's email address
//  * @param {number} [userData.elo_rating] - User's ELO rating
//  * 
//  * @fires auth-change - Triggers re-render of all components using useAuth()
//  * 
//  * @example
//  * // After successful login API call
//  * const response = await axios.post('/api/users/login/', credentials);
//  * setAuthData(response.data.token, response.data.user);
//  * // User is now logged in, components will auto-update
//  */
// export const setAuthData = (token, userData) => {
//   sessionStorage.setItem('token', token);
//   sessionStorage.setItem('user', JSON.stringify(userData));
//   triggerAuthChange();
// };

// /**
//  * Clear authentication data and trigger state update.
//  * 
//  * Call this function when user logs out.
//  * Removes token and user data from both sessionStorage and localStorage.
//  * 
//  * Why clear both?
//  * - sessionStorage: Current storage location
//  * - localStorage: Legacy storage (for migration from old version)
//  * 
//  * @fires auth-change - Triggers re-render of all components using useAuth()
//  * 
//  * @example
//  * // Logout handler
//  * const handleLogout = () => {
//  *   clearAuthData();
//  *   navigate('/');
//  * };
//  */
// export const clearAuthData = () => {
//   sessionStorage.removeItem('token');
//   sessionStorage.removeItem('user');
//   // Also clear localStorage if exists (migration from old version)
//   localStorage.removeItem('token');
//   localStorage.removeItem('user');
//   triggerAuthChange();
// };

// /**
//  * Check if user is currently authenticated.
//  * 
//  * Simple synchronous check for token existence.
//  * Use useAuth() hook for reactive authentication state in components.
//  * 
//  * @returns {boolean} True if token exists in sessionStorage
//  * 
//  * @example
//  * if (isAuthenticated()) {
//  *   // Proceed with authenticated action
//  * } else {
//  *   // Redirect to login
//  * }
//  */
// export const isAuthenticated = () => {
//   const token = sessionStorage.getItem('token');
//   return !!token;
// };

// /**
//  * Get current user data from sessionStorage.
//  * 
//  * Returns parsed user object or null if not found/invalid.
//  * For reactive user state in components, use useAuth() hook instead.
//  * 
//  * @returns {Object|null} User data object or null
//  * 
//  * @example
//  * const userData = getCurrentUserData();
//  * if (userData) {
//  *   console.log(`Current user: ${userData.username}`);
//  * }
//  */
// export const getCurrentUserData = () => {
//   const userStr = sessionStorage.getItem('user');
//   if (userStr) {
//     try {
//       return JSON.parse(userStr);
//     } catch (error) {
//       console.error('Failed to parse user data:', error);
//       return null;
//     }
//   }
//   return null;
// };

// /**
//  * Get authentication token for API requests.
//  * 
//  * Use this to include authentication in axios requests.
//  * 
//  * @returns {string|null} Authentication token or null if not found
//  * 
//  * @example
//  * // Making authenticated API request
//  * const token = getAuthToken();
//  * const response = await axios.get('/api/users/profile/', {
//  *   headers: {
//  *     Authorization: `Token ${token}`
//  *   }
//  * });
//  */
// export const getAuthToken = () => {
//   return sessionStorage.getItem('token');
// };



/**
 * auth.js
 * 
 * Unified authentication utility
 * - Supports Cognito via react-oidc-context
 * - Supports token-based login via sessionStorage
 * - Event-driven reactive updates for all components using useAuth()
 */

import { useState, useEffect } from "react";
import { useAuth as useOidcAuth } from "react-oidc-context";

/**
 * Trigger authentication change event
 * Components using useAuth() will re-check auth state
 */
export const triggerAuthChange = () => {
  window.dispatchEvent(new Event("auth-change"));
};

/**
 * Store token-based auth data and notify components
 */
export const setAuthData = (token, userData) => {
  sessionStorage.setItem("token", token);
  sessionStorage.setItem("user", JSON.stringify(userData));
  triggerAuthChange();
};

/**
 * Clear all auth data (OIDC + token)
 */
export const clearAuthData = () => {
  // Clear token-based auth
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");

  // Clear localStorage (legacy)
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  // Optionally redirect to login page
  triggerAuthChange();
  window.location.href = "/login";
};

/**
 * Get token for API requests (token auth or OIDC)
 */
export const getAuthToken = () => {
  const tokenAuth = sessionStorage.getItem("token");
  if (tokenAuth) return tokenAuth;

  // OIDC token
  const storedOidc = sessionStorage.getItem(
    "oidc.user:https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_pa1dGg56I:6k0219tpbactikiqraom2v6mgo"
  );
  if (!storedOidc) return null;

  try {
    const parsed = JSON.parse(storedOidc);
    return parsed.access_token || null;
  } catch {
    return null;
  }
};

/**
 * Get current user data (token auth or OIDC)
 */
export const getCurrentUserData = () => {
  const tokenUserStr = sessionStorage.getItem("user");
  if (tokenUserStr) {
    try {
      return JSON.parse(tokenUserStr);
    } catch {
      return null;
    }
  }

  const storedOidc = sessionStorage.getItem(
    "oidc.user:https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_pa1dGg56I:6k0219tpbactikiqraom2v6mgo"
  );
  if (!storedOidc) return null;

  try {
    const parsed = JSON.parse(storedOidc);
    return parsed.profile || null;
  } catch {
    return null;
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => !!getAuthToken();

/**
 * Reactive hook for authentication
 */
export const useAuth = () => {
  const oidcAuth = useOidcAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    setLoading(true);

    // Priority 1: token-based auth
    const token = sessionStorage.getItem("token");
    const userStr = sessionStorage.getItem("user");
    if (token && userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser({ ...userData, authType: "token", token });
        setLoading(false);
        return;
      } catch {
        // ignore parse error
      }
    }

    // Priority 2: OIDC auth
    if (oidcAuth.isAuthenticated) {
      const profile = oidcAuth.user?.profile || {};
      const access_token = oidcAuth.user?.access_token || null;
      const oidcUser = {
        username: profile.email?.split("@")[0] || "CognitoUser",
        email: profile.email,
        id: profile.sub,
        authType: "cognito",
        token: access_token,
      };
      setUser(oidcUser);
      setLoading(false);
      return;
    }

    // Not authenticated
    setUser(null);
    setLoading(false);
  };

  useEffect(() => {
    checkAuth();

    const handleAuthChange = () => {
      checkAuth();
    };

    const handleStorageChange = (e) => {
      if (e.key === "token" || e.key === "user") {
        checkAuth();
      }
    };

    window.addEventListener("auth-change", handleAuthChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("auth-change", handleAuthChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [oidcAuth.isAuthenticated, oidcAuth.user]);

  return {
    user,
    loading,
    isAuthenticated: !!user,
    login: () => oidcAuth.signinRedirect?.(),
    logout: () => oidcAuth.signoutRedirect?.(),
    refreshAuth: () => checkAuth(),
  };
};
