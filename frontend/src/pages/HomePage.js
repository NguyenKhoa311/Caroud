import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentUser } from 'aws-amplify/auth';
import './HomePage.css';

function HomePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-page">
      <div className="hero-section">
        <h1 className="hero-title">🎮 Caro Game</h1>
        <p className="hero-subtitle">
          Play Caro (Five in a Row) online with friends, random players, or AI
        </p>
        <p className="hero-description">
          Challenge players worldwide on AWS Cloud Platform
        </p>
      </div>

      <div className="game-modes">
        <h2>Choose Your Game Mode</h2>
        
        <div className="modes-grid">
          {/* Local Multiplayer */}
          <div className="mode-card">
            <div className="mode-icon">👥</div>
            <h3>Local Multiplayer</h3>
            <p>Play with a friend on the same device</p>
            <Link to="/game/local" className="btn btn-primary">
              Play Local
            </Link>
          </div>

          {/* Online Matchmaking */}
          <div className="mode-card">
            <div className="mode-icon">🌐</div>
            <h3>Online Match</h3>
            <p>Find an opponent based on your ELO rating</p>
            {user ? (
              <Link to="/game/online" className="btn btn-primary">
                Find Match
              </Link>
            ) : (
              <Link to="/login" className="btn btn-secondary">
                Login to Play
              </Link>
            )}
          </div>

          {/* Play vs AI */}
          <div className="mode-card">
            <div className="mode-icon">🤖</div>
            <h3>Play vs AI</h3>
            <p>Challenge our artificial intelligence</p>
            <Link to="/game/ai" className="btn btn-primary">
              Play vs AI
            </Link>
          </div>
        </div>
      </div>

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

      <div className="rules-section">
        <h2>Game Rules</h2>
        <div className="rules-content">
          <ul>
            <li>🎯 Board size: 15x15</li>
            <li>⚫ Black (X) plays first</li>
            <li>🏁 Win by placing 5 stones in a row (horizontal, vertical, or diagonal)</li>
            <li>⏱️ Each player has 30 seconds per move in online matches</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
