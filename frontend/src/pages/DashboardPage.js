import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './DashboardPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentMatches, setRecentMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      if (!token || !userStr) {
        navigate('/login');
        return;
      }

      const userData = JSON.parse(userStr);
      setUser(userData);

      // Fetch user stats
      try {
        const statsResponse = await axios.get(
          `${API_URL}/api/users/${userData.id}/stats/`,
          {
            headers: { Authorization: `Token ${token}` }
          }
        );
        setStats(statsResponse.data);
      } catch (err) {
        console.error('Error fetching stats:', err);
      }

      // Fetch recent matches
      try {
        const matchesResponse = await axios.get(
          `${API_URL}/api/users/${userData.id}/matches/?limit=5`,
          {
            headers: { Authorization: `Token ${token}` }
          }
        );
        setRecentMatches(matchesResponse.data);
      } catch (err) {
        console.error('Error fetching matches:', err);
      }

    } catch (err) {
      console.error('Error loading user data:', err);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>{error}</p>
        <Link to="/login" className="btn btn-primary">Go to Login</Link>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* Welcome Section */}
      <div className="dashboard-header">
        <h1>Welcome back, {user?.username}! 👋</h1>
        <p className="dashboard-subtitle">Ready to play some Caro?</p>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Play</h2>
        <div className="actions-grid">
          <Link to="/game/online" className="action-card action-online">
            <div className="action-icon">🌐</div>
            <h3>Find Match</h3>
            <p>Play against random opponent</p>
          </Link>

          <Link to="/game/ai" className="action-card action-ai">
            <div className="action-icon">🤖</div>
            <h3>Play vs AI</h3>
            <p>Challenge our AI</p>
          </Link>

          <Link to="/game/local" className="action-card action-local">
            <div className="action-icon">👥</div>
            <h3>Local Game</h3>
            <p>Play with a friend</p>
          </Link>
        </div>
      </div>

      {/* Stats Section */}
      <div className="stats-section">
        <h2>Your Statistics</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🏆</div>
            <div className="stat-value">{stats?.elo_rating || user?.elo_rating || 1200}</div>
            <div className="stat-label">ELO Rating</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🎮</div>
            <div className="stat-value">{stats?.total_games || user?.total_games || 0}</div>
            <div className="stat-label">Total Games</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{stats?.wins || user?.wins || 0}</div>
            <div className="stat-label">Wins</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">❌</div>
            <div className="stat-value">{stats?.losses || user?.losses || 0}</div>
            <div className="stat-label">Losses</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-value">
              {stats?.win_rate !== undefined 
                ? `${(stats.win_rate * 100).toFixed(1)}%` 
                : user?.win_rate !== undefined
                ? `${(user.win_rate * 100).toFixed(1)}%`
                : '0%'}
            </div>
            <div className="stat-label">Win Rate</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🔥</div>
            <div className="stat-value">{stats?.current_streak || user?.current_streak || 0}</div>
            <div className="stat-label">Current Streak</div>
          </div>
        </div>
      </div>

      {/* Recent Matches */}
      <div className="recent-matches">
        <div className="section-header">
          <h2>Recent Matches</h2>
          <Link to="/profile" className="view-all-link">View All →</Link>
        </div>

        {recentMatches.length > 0 ? (
          <div className="matches-list">
            {recentMatches.map((match, index) => (
              <div key={index} className="match-item">
                <div className="match-result">
                  {match.winner === user?.id ? (
                    <span className="result-win">WIN</span>
                  ) : match.winner === null ? (
                    <span className="result-draw">DRAW</span>
                  ) : (
                    <span className="result-loss">LOSS</span>
                  )}
                </div>
                <div className="match-info">
                  <div className="match-opponent">
                    vs {match.opponent_username || 'Unknown'}
                  </div>
                  <div className="match-date">
                    {new Date(match.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-matches">
            <p>No matches played yet</p>
            <p className="no-matches-subtitle">Start playing to see your match history!</p>
          </div>
        )}
      </div>

      {/* Leaderboard Preview */}
      <div className="leaderboard-preview">
        <div className="section-header">
          <h2>Leaderboard</h2>
          <Link to="/leaderboard" className="view-all-link">View Full Leaderboard →</Link>
        </div>
        <div className="rank-info">
          <p>Your current rank: <strong>#{stats?.rank || '---'}</strong></p>
          <p className="rank-subtitle">Keep playing to climb the ranks!</p>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
