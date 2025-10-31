import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import { Amplify } from 'aws-amplify'; // DISABLED until Cognito is configured
import './App.css';

// Session management interceptor
import './utils/sessionInterceptor';

// Pages
import HomePage from './pages/HomePage';
import GamePage from './pages/GamePage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import FriendsPage from './pages/FriendsPage';
import RoomsPage from './pages/RoomsPage';
import RoomLobby from './pages/RoomLobby';
import MatchmakingPage from './pages/MatchmakingPage';

// Components
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';

// AWS Amplify Configuration (replace with your Cognito details)
// TEMPORARILY DISABLED - Enable when testing Cognito OAuth
/*
Amplify.configure({
  Auth: {
    Cognito: {
      region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
      userPoolId: process.env.REACT_APP_USER_POOL_ID || 'your-user-pool-id',
      userPoolClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID || 'your-client-id',
      identityPoolId: process.env.REACT_APP_IDENTITY_POOL_ID || 'your-identity-pool-id',
      loginWith: {
        oauth: {
          domain: process.env.REACT_APP_OAUTH_DOMAIN || 'your-domain.auth.us-east-1.amazoncognito.com',
          scopes: ['email', 'openid', 'profile'],
          redirectSignIn: [process.env.REACT_APP_REDIRECT_SIGN_IN || 'http://localhost:3000/'],
          redirectSignOut: [process.env.REACT_APP_REDIRECT_SIGN_OUT || 'http://localhost:3000/'],
          responseType: 'code',
        },
      },
    },
  },
});
*/

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
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
  );
}

export default App;
