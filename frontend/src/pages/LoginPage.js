import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithRedirect } from 'aws-amplify/auth';
import axios from 'axios';
import { setAuthData } from '../utils/auth';
import './LoginPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when user types
    if (errors[name] || errors.general) {
      setErrors({});
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    
    // Validation
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await axios.post(`${API_URL}/api/users/login/`, formData);
      
      // Store token and user info using auth utility
      setAuthData(response.data.token, response.data.user);
      
      // Redirect to dashboard
      navigate('/dashboard');
      
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.response && error.response.data) {
        if (error.response.data.error) {
          setErrors({ general: error.response.data.error });
        } else {
          setErrors(error.response.data);
        }
      } else {
        setErrors({ general: 'Login failed. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <h1>Welcome to Caro Game</h1>
          <p className="login-subtitle">Sign in to start playing</p>
          
          {errors.general && (
            <div className="error-message">
              {errors.general}
            </div>
          )}
          
          {/* Email/Password Login Form */}
          <form onSubmit={handleEmailLogin} className="email-login-form">
            <div className="form-group">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email"
                className={errors.email ? 'error' : ''}
              />
              {errors.email && (
                <span className="error-text">{errors.email}</span>
              )}
            </div>
            
            <div className="form-group">
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                className={errors.password ? 'error' : ''}
              />
              {errors.password && (
                <span className="error-text">{errors.password}</span>
              )}
            </div>
            
            <button 
              type="submit" 
              className="email-login-btn"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          
          <div className="divider">
            <span>OR</span>
          </div>
          
          {/* Social Login Buttons */}
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

          <div className="register-link">
            Don't have an account? <Link to="/register">Create Account</Link>
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
