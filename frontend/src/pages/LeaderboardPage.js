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
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // const data = await leaderboardService.getLeaderboard(filter);
      
      // Mock data for now
      const mockData = [
        { rank: 1, username: 'GrandMaster', elo: 2150, wins: 156, losses: 42, winRate: 78.8 },
        { rank: 2, username: 'CaroPro', elo: 2050, wins: 134, losses: 51, winRate: 72.4 },
        { rank: 3, username: 'StrategicMind', elo: 1980, wins: 98, losses: 38, winRate: 72.1 },
        { rank: 4, username: 'BoardMaster', elo: 1920, wins: 87, losses: 41, winRate: 68.0 },
        { rank: 5, username: 'TacticalGenius', elo: 1850, wins: 76, losses: 39, winRate: 66.1 },
        { rank: 6, username: 'QuickThinker', elo: 1780, wins: 65, losses: 42, winRate: 60.7 },
        { rank: 7, username: 'PatientPlayer', elo: 1720, wins: 58, losses: 38, winRate: 60.4 },
        { rank: 8, username: 'RiskyGambler', elo: 1650, wins: 52, losses: 45, winRate: 53.6 },
        { rank: 9, username: 'SteadyWinner', elo: 1590, wins: 48, losses: 41, winRate: 53.9 },
        { rank: 10, username: 'Challenger', elo: 1520, wins: 42, losses: 44, winRate: 48.8 },
      ];
      
      setPlayers(mockData);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
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
                  <span className="elo-badge">{player.elo}</span>
                </div>
                <div className="col-stats">
                  <span className="wins">{player.wins}W</span>
                  <span className="losses">{player.losses}L</span>
                </div>
                <div className="col-winrate">
                  <div className="winrate-bar">
                    <div 
                      className="winrate-fill" 
                      style={{ width: `${player.winRate}%` }}
                    ></div>
                    <span className="winrate-text">{player.winRate.toFixed(1)}%</span>
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
