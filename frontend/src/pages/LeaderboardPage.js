import React, { useState, useEffect } from 'react';
import { leaderboardService } from '../services/leaderboardService';
import './LeaderboardPage.css';

function LeaderboardPage() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, week, month

  useEffect(() => {
    fetchLeaderboard();
  }, [filter]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      // Fetch real leaderboard data from API
      const data = await leaderboardService.getLeaderboard(filter);
      setPlayers(data);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (rank) => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return '#667eea';
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '🏅';
  };

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-container">
        <div className="leaderboard-header">
          <h1>🏆 Leaderboard</h1>
          <p>Top players ranked by ELO rating</p>
        </div>

        <div className="leaderboard-filters">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Time
          </button>
          <button 
            className={`filter-btn ${filter === 'week' ? 'active' : ''}`}
            onClick={() => setFilter('week')}
          >
            This Week
          </button>
          <button 
            className={`filter-btn ${filter === 'month' ? 'active' : ''}`}
            onClick={() => setFilter('month')}
          >
            This Month
          </button>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading leaderboard...</p>
          </div>
        ) : (
          <div className="leaderboard-table">
            <div className="table-header">
              <div className="col-rank">Rank</div>
              <div className="col-player">Player</div>
              <div className="col-elo">ELO</div>
              <div className="col-stats">W/L</div>
              <div className="col-winrate">Win Rate</div>
            </div>

            {players.map((player) => (
              <div 
                key={player.rank} 
                className={`table-row ${player.rank <= 3 ? 'top-player' : ''}`}
                style={{ borderLeft: `4px solid ${getRankColor(player.rank)}` }}
              >
                <div className="col-rank">
                  <span className="rank-icon">{getRankIcon(player.rank)}</span>
                  <span className="rank-number">#{player.rank}</span>
                </div>
                <div className="col-player">
                  <strong>{player.username}</strong>
                </div>
                <div className="col-elo">
                  <span className="elo-badge">{player.elo_rating}</span>
                </div>
                <div className="col-stats">
                  <span className="wins">{player.wins}W</span>
                  <span className="losses">{player.losses}L</span>
                </div>
                <div className="col-winrate">
                  <div className="winrate-bar">
                    <div 
                      className="winrate-fill" 
                      style={{ width: `${player.win_rate}%` }}
                    ></div>
                    <span className="winrate-text">{player.win_rate.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default LeaderboardPage;
