import React from 'react';
import { signInWithRedirect } from 'aws-amplify/auth';
import './LoginPage.css';

function LoginPage() {
  const handleGoogleSignIn = async () => {
    try {
      await signInWithRedirect({ provider: 'Google' });
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  const handleFacebookSignIn = async () => {
    try {
      await signInWithRedirect({ provider: 'Facebook' });
    } catch (error) {
      console.error('Error signing in with Facebook:', error);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <h1>Welcome to Caro Game</h1>
          <p className="login-subtitle">Sign in to start playing</p>
          
          <div className="login-buttons">
            <button onClick={handleGoogleSignIn} className="social-btn google-btn">
              <span className="btn-icon">🔍</span>
              Continue with Google
            </button>
            
            <button onClick={handleFacebookSignIn} className="social-btn facebook-btn">
              <span className="btn-icon">👤</span>
              Continue with Facebook
            </button>
          </div>

          <div className="login-info">
            <p>🎮 Play online matches</p>
            <p>🏆 Compete in leaderboards</p>
            <p>📊 Track your statistics</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
