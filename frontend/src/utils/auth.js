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
    "oidc.user:https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_MffQbWHoJ:7r5jtsi7pmgvpuu3hroso4qm7m"
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
    "oidc.user:https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_MffQbWHoJ:7r5jtsi7pmgvpuu3hroso4qm7m"
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
