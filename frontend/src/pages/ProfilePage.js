import React, { useState, useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import { userService } from '../services/userService';
import './ProfilePage.css';

function ProfilePage() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [matchHistory, setMatchHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      // TODO: Replace with actual API calls
      // const userStats = await userService.getUserStats(currentUser.userId);
      // const history = await userService.getMatchHistory(currentUser.userId);

      // Mock data
      const mockStats = {
        elo: 1650,
        rank: 8,
        totalGames: 97,
        wins: 52,
        losses: 45,
        winRate: 53.6,
        currentStreak: 3,
        bestStreak: 8,
      };

      const mockHistory = [
        { id: 1, date: '2025-10-15', opponent: 'GrandMaster', result: 'win', eloChange: +15 },
        { id: 2, date: '2025-10-14', opponent: 'CaroPro', result: 'win', eloChange: +18 },
        { id: 3, date: '2025-10-14', opponent: 'BoardMaster', result: 'win', eloChange: +12 },
        { id: 4, date: '2025-10-13', opponent: 'QuickThinker', result: 'loss', eloChange: -16 },
        { id: 5, date: '2025-10-12', opponent: 'TacticalGenius', result: 'loss', eloChange: -14 },
      ];

      setStats(mockStats);
      setMatchHistory(mockHistory);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading profile...</p>
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
            <h1>{user?.username || 'Player'}</h1>
            <p className="profile-email">{user?.signInDetails?.loginId || 'user@example.com'}</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="stats-overview">
          <div className="stat-card highlight">
            <span className="stat-icon">🏆</span>
            <div className="stat-content">
              <h3>{stats?.elo}</h3>
              <p>ELO Rating</p>
            </div>
          </div>

          <div className="stat-card">
            <span className="stat-icon">📊</span>
            <div className="stat-content">
              <h3>#{stats?.rank}</h3>
              <p>Global Rank</p>
            </div>
          </div>

          <div className="stat-card">
            <span className="stat-icon">🎮</span>
            <div className="stat-content">
              <h3>{stats?.totalGames}</h3>
              <p>Total Games</p>
            </div>
          </div>

          <div className="stat-card">
            <span className="stat-icon">🔥</span>
            <div className="stat-content">
              <h3>{stats?.currentStreak}</h3>
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
              <span className="stat-value wins">{stats?.wins}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Losses:</span>
              <span className="stat-value losses">{stats?.losses}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Win Rate:</span>
              <span className="stat-value">{stats?.winRate.toFixed(1)}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Best Streak:</span>
              <span className="stat-value">{stats?.bestStreak}</span>
            </div>
          </div>

          <div className="winrate-visual">
            <div className="winrate-bar-large">
              <div 
                className="winrate-fill-large" 
                style={{ width: `${stats?.winRate}%` }}
              >
                <span className="winrate-label">{stats?.winRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Match History */}
        <div className="match-history">
          <h2>Recent Matches</h2>
          <div className="history-list">
            {matchHistory.map((match) => (
              <div key={match.id} className={`history-item ${match.result}`}>
                <div className="match-date">{match.date}</div>
                <div className="match-opponent">
                  <span className="vs-label">vs</span>
                  <strong>{match.opponent}</strong>
                </div>
                <div className={`match-result ${match.result}`}>
                  {match.result === 'win' ? '✅ Won' : '❌ Lost'}
                </div>
                <div className={`elo-change ${match.eloChange > 0 ? 'positive' : 'negative'}`}>
                  {match.eloChange > 0 ? '+' : ''}{match.eloChange}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
