import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NavigationGuardProvider } from "./contexts/NavigationGuardContext";
import LoadingOverlay from "./components/LoadingOverlay";
import "./App.css";
import "./utils/sessionInterceptor";

import Navbar from "./components/Navbar";
import PrivateRoute from "./components/PrivateRoute";

import HomePage from "./pages/HomePage";
import GamePage from "./pages/GamePage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import FriendsPage from "./pages/FriendsPage";
import RoomsPage from "./pages/RoomsPage";
import RoomLobby from "./pages/RoomLobby";
import MatchmakingPage from "./pages/MatchmakingPage";
import InviteAccept from "./pages/InviteAccept";

// ----------------------------------------------------------------

function AuthWatcher() {
  const auth = useAuth();
  const navigate = useNavigate();

  // Check if we just returned from Cognito logout
  useEffect(() => {
    // If referrer is from Cognito domain, clear OIDC storage
    if (document.referrer.includes('amazoncognito.com') && document.referrer.includes('/logout')) {
      // Clear OIDC storage to ensure logout
      const oidcKey = "oidc.user:https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_MffQbWHoJ:7r5jtsi7pmgvpuu3hroso4qm7m";
      sessionStorage.removeItem(oidcKey);
      sessionStorage.removeItem("cognito_user");
      
      // Clear query params if any
      if (window.location.search) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  // Only redirect to dashboard if authenticated AND on login/register pages
  useEffect(() => {
    if (auth.isAuthenticated) {
      const currentPath = window.location.pathname;
      // Only redirect from login/register pages, NOT from home page or game pages
      if (currentPath === '/login' || currentPath === '/register') {
        navigate("/dashboard");
      }
    }
  }, [auth.isAuthenticated, navigate]);

  // Handle OIDC loading/error globally
  if (auth.isLoading) return <LoadingOverlay message="Đang xác thực..." />;
  if (auth.error) return <div>Error: {auth.error.message}</div>;

  return null;
}

function App() {
  return (
    <ThemeProvider>
      <NavigationGuardProvider>
        <Router>
          <div className="App">
            <Navbar />

            {/* global auth state watcher */}
            <AuthWatcher />

            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Friend invite link - public route (redirects to login if not authenticated) */}
              <Route path="/invite/accept/:token" element={<InviteAccept />} />

              <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
              <Route path="/game/:mode" element={<PrivateRoute><GamePage /></PrivateRoute>} />
              <Route path="/game" element={<PrivateRoute><GamePage /></PrivateRoute>} />
              <Route path="/matchmaking" element={<PrivateRoute><MatchmakingPage /></PrivateRoute>} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
              <Route path="/friends" element={<PrivateRoute><FriendsPage /></PrivateRoute>} />
              <Route path="/rooms" element={<PrivateRoute><RoomsPage /></PrivateRoute>} />
              <Route path="/room/:code" element={<PrivateRoute><RoomLobby /></PrivateRoute>} />
            </Routes>
          </div>
        </Router>
      </NavigationGuardProvider>
    </ThemeProvider>
  );
}

export default App;
