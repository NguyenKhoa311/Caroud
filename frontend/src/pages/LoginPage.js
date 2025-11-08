// import React, { useState, useEffect } from 'react';
// import { useNavigate, Link } from 'react-router-dom';
// import { signInWithRedirect } from 'aws-amplify/auth'; // DISABLED until Cognito is fully configured
// import axios from 'axios';
// import { setAuthData, useAuth } from '../utils/auth';
// import { getApiUrl } from '../utils/apiUrl';
// import './LoginPage.css';

// const API_URL = getApiUrl();

// function LoginPage() {
//   const navigate = useNavigate();
//   const { user, loading: authLoading } = useAuth();
//   const [formData, setFormData] = useState({
//     email: '',
//     password: ''
//   });
//   const [errors, setErrors] = useState({});
//   const [loading, setLoading] = useState(false);

//   // Redirect if already logged in
//   useEffect(() => {
//     if (!authLoading && user) {
//       navigate('/dashboard');
//     }
//   }, [user, authLoading, navigate]);

//   // DISABLED - Enable after Cognito is configured
//   /*
//   const handleGoogleSignIn = async () => {
//     try {
//       await signInWithRedirect({ provider: 'Google' });
//     } catch (error) {
//       console.error('Error signing in with Google:', error);
//     }
//   };

//   const handleFacebookSignIn = async () => {
//     try {
//       await signInWithRedirect({ provider: 'Facebook' });
//     } catch (error) {
//       console.error('Error signing in with Facebook:', error);
//     }
//   };
//   */

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({
//       ...prev,
//       [name]: value
//     }));
//     // Clear errors when user types
//     if (errors[name] || errors.general) {
//       setErrors({});
//     }
//   };

//   const handleEmailLogin = async (e) => {
//     e.preventDefault();
    
//     // Validation
//     const newErrors = {};
//     if (!formData.email.trim()) {
//       newErrors.email = 'Email is required';
//     }
//     if (!formData.password) {
//       newErrors.password = 'Password is required';
//     }
    
//     if (Object.keys(newErrors).length > 0) {
//       setErrors(newErrors);
//       return;
//     }

//     setLoading(true);
//     setErrors({});

//     try {
//       const response = await axios.post(`${API_URL}/api/users/login/`, formData);
      
//       // Store token and user info using auth utility
//       setAuthData(response.data.token, response.data.user);
      
//       // Navigate immediately after setting auth data
//       navigate('/dashboard');
      
//     } catch (error) {
//       console.error('Login error:', error);
      
//       if (error.response && error.response.data) {
//         if (error.response.data.error) {
//           setErrors({ general: error.response.data.error });
//         } else {
//           setErrors(error.response.data);
//         }
//       } else {
//         setErrors({ general: 'Login failed. Please try again.' });
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Show loading while checking auth or redirecting
//   if (authLoading || user) {
//     return (
//       <div className="login-page">
//         <div className="login-container">
//           <div className="login-card">
//             <p>{authLoading ? 'Loading...' : 'Redirecting to dashboard...'}</p>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="login-page">
//       <div className="login-container">
//         <div className="login-card">
//           <h1>Welcome to Caro Game</h1>
//           <p className="login-subtitle">Sign in to start playing</p>
          
//           {errors.general && (
//             <div className="error-message">
//               {errors.general}
//             </div>
//           )}
          
//           {/* Email/Password Login Form */}
//           <form onSubmit={handleEmailLogin} className="email-login-form">
//             <div className="form-group">
//               <input
//                 type="email"
//                 name="email"
//                 value={formData.email}
//                 onChange={handleChange}
//                 placeholder="Email"
//                 className={errors.email ? 'error' : ''}
//               />
//               {errors.email && (
//                 <span className="error-text">{errors.email}</span>
//               )}
//             </div>
            
//             <div className="form-group">
//               <input
//                 type="password"
//                 name="password"
//                 value={formData.password}
//                 onChange={handleChange}
//                 placeholder="Password"
//                 className={errors.password ? 'error' : ''}
//               />
//               {errors.password && (
//                 <span className="error-text">{errors.password}</span>
//               )}
//             </div>
            
//             <button 
//               type="submit" 
//               className="email-login-btn"
//               disabled={loading}
//             >
//               {loading ? 'Signing in...' : 'Sign In'}
//             </button>
//           </form>
          
//           {/* TEMPORARILY DISABLED - Enable after Cognito OAuth is fully configured */}
//           {/*
//           <div className="divider">
//             <span>OR</span>
//           </div>
          
//           <div className="login-buttons">
//             <button onClick={handleGoogleSignIn} className="social-btn google-btn">
//               <span className="btn-icon">🔍</span>
//               Continue with Google
//             </button>
            
//             <button onClick={handleFacebookSignIn} className="social-btn facebook-btn">
//               <span className="btn-icon">👤</span>
//               Continue with Facebook
//             </button>
//           </div>
//           */}

//           <div className="register-link">
//             Don't have an account? <Link to="/register">Create Account</Link>
//           </div>

//           <div className="login-info">
//             <p>🎮 Play online matches</p>
//             <p>🏆 Compete in leaderboards</p>
//             <p>📊 Track your statistics</p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default LoginPage;


import React, { useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";

function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();

  // Nếu đã đăng nhập, chuyển đến dashboard
  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate("/dashboard");
    }
  }, [auth.isAuthenticated, navigate]);

  if (auth.isLoading) return <p>Loading...</p>;
  if (auth.error) return <p>Error: {auth.error.message}</p>;

  const handleLogin = () => auth.signinRedirect();
  const handleLogout = () => auth.signoutRedirect();

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <h1>Welcome to Caro Game</h1>
          {!auth.isAuthenticated ? (
            <button onClick={handleLogin} className="email-login-btn">
              Sign in with Cognito
            </button>
          ) : (
            <button onClick={handleLogout} className="email-login-btn">
              Logout
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;


// import React from "react";
// import { useAuth } from "react-oidc-context";

// function LoginPage() {
//   const auth = useAuth();

//   if (auth.isLoading) return <p>Loading...</p>;
//   if (auth.isAuthenticated)
//     return <p>Signed in as {auth.user?.profile.email}</p>;

//   return (
//     <div className="login-page">
//       <button onClick={() => auth.signinRedirect()} className="email-login-btn">
//         Sign in with Cognito
//       </button>
//     </div>
//   );
// }

// export default LoginPage;
