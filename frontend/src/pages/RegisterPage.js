import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { setAuthData, useAuth } from '../utils/auth';
import './RegisterPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

function RegisterPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    // Password confirmation
    if (!formData.password_confirm) {
      newErrors.password_confirm = 'Please confirm your password';
    } else if (formData.password !== formData.password_confirm) {
      newErrors.password_confirm = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await axios.post(`${API_URL}/api/users/register/`, formData);
      
      // Store token and user info using auth utility
      setAuthData(response.data.token, response.data.user);
      
      setSuccessMessage('Registration successful! Redirecting...');
      
      // Navigate immediately after setting auth data
      navigate('/dashboard');
      
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.response && error.response.data) {
        // Handle field-specific errors
        const serverErrors = error.response.data;
        const formattedErrors = {};
        
        Object.keys(serverErrors).forEach(key => {
          if (Array.isArray(serverErrors[key])) {
            formattedErrors[key] = serverErrors[key].join(' ');
          } else {
            formattedErrors[key] = serverErrors[key];
          }
        });
        
        setErrors(formattedErrors);
      } else {
        setErrors({ general: 'Registration failed. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking auth or redirecting
  if (authLoading || user) {
    return (
      <div className="register-page">
        <div className="register-container">
          <div className="register-card">
            <p>{authLoading ? 'Loading...' : 'Redirecting to dashboard...'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-card">
          <h1>Create Account</h1>
          <p className="register-subtitle">Join Caro Game and start playing!</p>
          
          {successMessage && (
            <div className="success-message">
              {successMessage}
            </div>
          )}
          
          {errors.general && (
            <div className="error-message">
              {errors.general}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="register-form">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Choose a username"
                className={errors.username ? 'error' : ''}
              />
              {errors.username && (
                <span className="error-text">{errors.username}</span>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                className={errors.email ? 'error' : ''}
              />
              {errors.email && (
                <span className="error-text">{errors.email}</span>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Min. 8 characters"
                className={errors.password ? 'error' : ''}
              />
              {errors.password && (
                <span className="error-text">{errors.password}</span>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor="password_confirm">Confirm Password</label>
              <input
                type="password"
                id="password_confirm"
                name="password_confirm"
                value={formData.password_confirm}
                onChange={handleChange}
                placeholder="Re-enter password"
                className={errors.password_confirm ? 'error' : ''}
              />
              {errors.password_confirm && (
                <span className="error-text">{errors.password_confirm}</span>
              )}
            </div>
            
            <button 
              type="submit" 
              className="register-btn"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
          
          <div className="login-link">
            Already have an account? <Link to="/login">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
