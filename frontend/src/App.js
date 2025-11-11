import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { ThemeProvider } from "./contexts/ThemeContext";
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

// ----------------------------------------------------------------

function AuthWatcher() {
  const auth = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if authenticated
  useEffect(() => {
    if (auth.isAuthenticated) navigate("/dashboard");
  }, [auth.isAuthenticated, navigate]);

  // Handle OIDC loading/error globally
  if (auth.isLoading) return <div>Loading...</div>;
  if (auth.error) return <div>Error: {auth.error.message}</div>;

  return null;
}

function App() {
  const auth = useAuth();

  return (
    <ThemeProvider>
      <Router>
        <div className="App">
          <Navbar />

          {/* global auth state watcher */}
          <AuthWatcher />

          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

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
    </ThemeProvider>
  );
}

export default App;
