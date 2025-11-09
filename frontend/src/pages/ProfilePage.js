import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth, getAuthToken } from '../utils/auth';
import { getApiUrl } from '../utils/apiUrl';
import './ProfilePage.css';

const API_URL = getApiUrl();

function ProfilePage() {
  const { user: authUser, loading: authLoading } = useAuth();
  const [stats, setStats] = useState(null);
  const [matchHistory, setMatchHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authUser && !authLoading) {
      fetchUserData();
    }
  }, [authUser, authLoading]);

  const fetchUserData = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const userData = authUser;
      
      // Fetch user stats from API
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
        // Use default stats if API fails
        setStats({
          elo_rating: userData.elo_rating || 1200,
          rank: '---',
          total_games: userData.total_games || 0,
          wins: userData.wins || 0,
          losses: userData.losses || 0,
          win_rate: userData.win_rate || 0,
          current_streak: userData.current_streak || 0,
          best_streak: userData.best_streak || 0,
        });
      }

      // Fetch match history
      try {
        const historyResponse = await axios.get(
          `${API_URL}/api/users/${userData.id}/matches/?limit=10`,
          {
            headers: { Authorization: `Token ${token}` }
          }
        );
        setMatchHistory(historyResponse.data || []);
      } catch (err) {
        console.error('Error fetching match history:', err);
        setMatchHistory([]);
      }

    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="profile-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page">
        <div className="error-container">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-avatar">
            <span className="avatar-icon">👤</span>
          </div>
          <div className="profile-info">
            <h1>{authUser?.username || 'Player'}</h1>
            <p className="profile-email">{authUser?.email || 'user@example.com'}</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="stats-overview">
          <div className="stat-card highlight">
            <span className="stat-icon">🏆</span>
            <div className="stat-content">
              <h3>{stats?.elo_rating || 1200}</h3>
              <p>ELO Rating</p>
            </div>
          </div>

          <div className="stat-card">
            <span className="stat-icon">📊</span>
            <div className="stat-content">
              <h3>#{stats?.rank || '---'}</h3>
              <p>Global Rank</p>
            </div>
          </div>

          <div className="stat-card">
            <span className="stat-icon">🎮</span>
            <div className="stat-content">
              <h3>{stats?.total_games || 0}</h3>
              <p>Total Games</p>
            </div>
          </div>

          <div className="stat-card">
            <span className="stat-icon">🔥</span>
            <div className="stat-content">
              <h3>{stats?.current_streak || 0}</h3>
              <p>Win Streak</p>
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="detailed-stats">
          <h2>Statistics</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Wins:</span>
              <span className="stat-value wins">{stats?.wins || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Losses:</span>
              <span className="stat-value losses">{stats?.losses || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Win Rate:</span>
              <span className="stat-value">
                {stats?.win_rate ? stats.win_rate.toFixed(1) : '0.0'}%
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Best Streak:</span>
              <span className="stat-value">{stats?.best_streak || 0}</span>
            </div>
          </div>

          <div className="winrate-visual">
            <div className="winrate-bar-large">
              <div 
                className="winrate-fill-large" 
                style={{ width: `${stats?.win_rate || 0}%` }}
              >
                <span className="winrate-label">
                  {stats?.win_rate ? stats.win_rate.toFixed(1) : '0.0'}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Match History */}
        <div className="match-history">
          <h2>Recent Matches</h2>
          {matchHistory.length > 0 ? (
            <div className="history-list">
              {matchHistory.map((match, index) => {
                // Handle AI matches: winner can be 'AI' string
                const isWinner = match.winner === authUser?.id;
                const isAIWinner = match.winner === 'AI';
                const isDraw = match.result === 'draw' || (!match.winner && !isAIWinner);
                const result = isDraw ? 'draw' : (isWinner ? 'win' : 'loss');
                
                return (
                  <div key={match.id || index} className={`history-item ${result}`}>
                    <div className="match-date">
                      {new Date(match.created_at).toLocaleDateString()}
                    </div>
                    <div className="match-opponent">
                      <span className="vs-label">vs</span>
                      <strong>{match.opponent_username || 'Unknown'}</strong>
                    </div>
                    <div className={`match-result ${result}`}>
                      {isDraw ? '⚖️ Draw' : isWinner ? '✅ Won' : '❌ Lost'}
                    </div>
                    <div className={`elo-change ${match.elo_change > 0 ? 'positive' : 'negative'}`}>
                      {match.elo_change > 0 ? '+' : ''}{match.elo_change || 0}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-matches">
              <p>No matches played yet</p>
              <p className="no-matches-subtitle">Start playing to build your match history!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
