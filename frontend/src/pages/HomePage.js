import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../utils/auth';
import DashboardPage from './DashboardPage';
import './HomePage.css';

function HomePage() {
  const { user } = useAuth();

  // If user is logged in, show Dashboard instead
  if (user) {
    return <DashboardPage />;
  }

  // If not logged in, show welcome page
  return (
    <div className="home-page">
      {/* Welcome Section */}
      <div className="home-header">
        <h1>🎮 Welcome to Caro Game</h1>
        <p className="home-subtitle">Play Caro (Five in a Row) online with friends, random players, or AI</p>
        <p className="home-description">Challenge players worldwide on AWS Cloud Platform</p>
      </div>

      {/* Quick Play */}
      <div className="quick-actions">
        <h2>Choose Your Game Mode</h2>
        <div className="actions-grid">
          {/* Online Matchmaking */}
          <Link to="/login" className="action-card action-matchmaking">
            <div className="action-icon">🌐</div>
            <h3>Ranked Match</h3>
            <p>Find opponent with similar ELO</p>
          </Link>

          {/* Play vs AI */}
          <Link to="/game/ai" className="action-card action-ai">
            <div className="action-icon">🤖</div>
            <h3>Play vs AI</h3>
            <p>Challenge our artificial intelligence</p>
          </Link>

          {/* Local Multiplayer */}
          <Link to="/game/local" className="action-card action-local">
            <div className="action-icon">👥</div>
            <h3>Local Game</h3>
            <p>Play with a friend on the same device</p>
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="features-section">
        <h2>Features</h2>
        <div className="features-grid">
          <div className="feature-item">
            <span className="feature-icon">🏆</span>
            <h4>ELO Rating System</h4>
            <p>Competitive ranking system</p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📊</span>
            <h4>Leaderboard</h4>
            <p>Compete with top players</p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📜</span>
            <h4>Match History</h4>
            <p>Review your past games</p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🔐</span>
            <h4>Secure Login</h4>
            <p>Google & Facebook integration</p>
          </div>
        </div>
      </div>

      {/* Game Rules */}
      <div className="rules-section">
        <div className="section-header">
          <h2>Game Rules</h2>
        </div>
        <div className="rules-content">
          <div className="rule-item">
            <span className="rule-icon">🎯</span>
            <div>
              <h4>Board Size</h4>
              <p>Play on a 15x15 grid</p>
            </div>
          </div>
          <div className="rule-item">
            <span className="rule-icon">⚫</span>
            <div>
              <h4>First Move</h4>
              <p>Black (X) plays first</p>
            </div>
          </div>
          <div className="rule-item">
            <span className="rule-icon">🏁</span>
            <div>
              <h4>Win Condition</h4>
              <p>Place 5 stones in a row (horizontal, vertical, or diagonal)</p>
            </div>
          </div>
          <div className="rule-item">
            <span className="rule-icon">⏱️</span>
            <div>
              <h4>Time Limit</h4>
              <p>30 seconds per move in online matches</p>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="cta-section">
        <h2>Ready to Play?</h2>
        <p>Join thousands of players and start your journey to the top!</p>
        <div className="cta-buttons">
          <Link to="/login" className="btn btn-primary">Login Now</Link>
          <Link to="/register" className="btn btn-secondary">Create Account</Link>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
