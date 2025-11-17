import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../utils/auth';
import LoadingOverlay from '../components/LoadingOverlay';
import './DashboardPage.css';

function DashboardPage() {
  const navigate = useNavigate();
  const { user: authUser, loading: authLoading } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentMatches, setRecentMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadUserData = async () => {
    if (!authUser) {
      navigate('/login');
      return;
    }

    try {
      // Fetch user stats
      try {
        const statsResponse = await api.get(`/api/users/${authUser.id}/stats/`);
        setStats(statsResponse.data);
      } catch (err) {
        console.error('Error fetching stats:', err);
      }

      // Fetch recent matches
      try {
        const matchesResponse = await api.get(`/api/users/${authUser.id}/matches/?limit=5`);
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

  useEffect(() => {
    if (!authLoading) {
      loadUserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, authLoading]);

  if (authLoading || loading) {
    return <LoadingOverlay message="Đang tải dashboard..." />;
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
        <h1>
          Welcome back, <span className="welcome-username">{authUser?.username || authUser?.email?.split('@')[0]}</span>! 👋
        </h1>
        <p className="dashboard-subtitle">Ready to play some Caro?</p>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Play</h2>
        <div className="actions-grid">
          <Link to="/matchmaking" className="action-card action-matchmaking">
            <div className="action-icon">�</div>
            <h3>Ranked Match</h3>
            <p>Find opponent with similar ELO</p>
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

      {/* Social Actions */}
      <div className="quick-actions">
        <h2>Social Features</h2>
        <div className="actions-grid">
          <Link to="/friends" className="action-card action-friends">
            <div className="action-icon">👥</div>
            <h3>Friends</h3>
            <p>Manage friends and requests</p>
          </Link>

          <Link to="/rooms" className="action-card action-rooms">
            <div className="action-icon">🏠</div>
            <h3>Private Rooms</h3>
            <p>Create or join game rooms</p>
          </Link>
        </div>
      </div>

      {/* Stats Section */}
      <div className="stats-section">
        <h2>Your Statistics</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🏆</div>
            <div className="stat-value">{stats?.elo_rating || authUser?.elo_rating || 1200}</div>
            <div className="stat-label">ELO Rating</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🎮</div>
            <div className="stat-value">{stats?.total_games || authUser?.total_games || 0}</div>
            <div className="stat-label">Total Games</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{stats?.wins || authUser?.wins || 0}</div>
            <div className="stat-label">Wins</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">❌</div>
            <div className="stat-value">{stats?.losses || authUser?.losses || 0}</div>
            <div className="stat-label">Losses</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-value">
              {stats?.win_rate !== undefined 
                ? `${stats.win_rate.toFixed(1)}%` 
                : authUser?.win_rate !== undefined
                ? `${authUser.win_rate.toFixed(1)}%`
                : '0%'}
            </div>
            <div className="stat-label">Win Rate</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🔥</div>
            <div className="stat-value">{stats?.current_streak || authUser?.current_streak || 0}</div>
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
                  {match.winner === authUser?.id ? (
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
