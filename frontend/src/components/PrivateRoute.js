/**
 * PrivateRoute Component
 * 
 * Route guard for protected pages that require authentication.
 * Automatically redirects unauthenticated users to login page.
 * 
 * Features:
 * - Checks authentication status using useAuth() hook
 * - Shows loading state while checking authentication
 * - Redirects to /login if user is not authenticated
 * - Renders protected content if user is authenticated
 * 
 * @component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Protected page/component to render
 * 
 * @example
 * // In App.js routes
 * <Route 
 *   path="/dashboard" 
 *   element={
 *     <PrivateRoute>
 *       <DashboardPage />
 *     </PrivateRoute>
 *   } 
 * />
 * 
 * // User not logged in → Redirects to /login
 * // User logged in → Renders DashboardPage
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../utils/auth';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  // Show loading spinner while checking authentication status
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#667eea'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  // If user is authenticated, render the protected content
  // If not authenticated, redirect to login page
  return user ? children : <Navigate to="/login" />;
}

export default PrivateRoute;
