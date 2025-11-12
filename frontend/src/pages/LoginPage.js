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