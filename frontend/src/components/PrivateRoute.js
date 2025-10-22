import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../utils/auth';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

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

  return user ? children : <Navigate to="/login" />;
}

export default PrivateRoute;
