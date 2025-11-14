import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../utils/auth';
import LoadingOverlay from '../components/LoadingOverlay';
import './ProfilePage.css';

function ProfilePage() {
  const { user: authUser, loading: authLoading, refreshAuth } = useAuth();
  const [stats, setStats] = useState(null);
  const [matchHistory, setMatchHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    username: '',
    email: ''
  });
  const [editError, setEditError] = useState(null);
  const [editSuccess, setEditSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authUser && !authLoading) {
      fetchUserData();
      // Initialize edit form with current user data
      setEditForm({
        username: authUser.username || '',
        email: authUser.email || ''
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, authLoading]);

  const fetchUserData = async () => {
    try {
      if (!authUser) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      // Fetch user stats from API
      try {
        const statsResponse = await api.get(`/api/users/${authUser.id}/stats/`);
        setStats(statsResponse.data);
      } catch (err) {
        console.error('Error fetching stats:', err);
        // Use default stats if API fails
        setStats({
          elo_rating: authUser.elo_rating || 1200,
          rank: '---',
          total_games: authUser.total_games || 0,
          wins: authUser.wins || 0,
          losses: authUser.losses || 0,
          win_rate: authUser.win_rate || 0,
          current_streak: authUser.current_streak || 0,
          best_streak: authUser.best_streak || 0,
        });
      }

      // Fetch match history
      try {
        const historyResponse = await api.get(`/api/users/${authUser.id}/matches/?limit=10`);
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

  const handleEditClick = () => {
    setIsEditing(true);
    setEditError(null);
    setEditSuccess(false);
    // Reset form to current values
    setEditForm({
      username: authUser.username || '',
      email: authUser.email || ''
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditError(null);
    setEditSuccess(false);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when user types
    setEditError(null);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setEditError(null);
    setEditSuccess(false);

    try {
      // Validate username
      if (editForm.username.trim().length < 3) {
        setEditError('Username must be at least 3 characters long');
        setSaving(false);
        return;
      }

      if (editForm.username.trim().length > 30) {
        setEditError('Username must be at most 30 characters long');
        setSaving(false);
        return;
      }

      // Call API to update profile
      const response = await api.put('/api/users/update_profile/', {
        username: editForm.username.trim(),
        email: editForm.email.trim()
      });

      if (response.data) {
        setEditSuccess(true);
        setIsEditing(false);
        
        // Refresh auth to get updated user data
        await refreshAuth();
        
        // Show success message
        setTimeout(() => {
          setEditSuccess(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      
      if (error.response?.data) {
        // Handle validation errors from backend
        const errors = error.response.data;
        if (errors.username) {
          setEditError(errors.username[0]);
        } else if (errors.email) {
          setEditError(errors.email[0]);
        } else {
          setEditError('Failed to update profile. Please try again.');
        }
      } else {
        setEditError('Failed to update profile. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return <LoadingOverlay message="Đang tải profile..." />;
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
        {/* Success Message */}
        {editSuccess && (
          <div className="alert alert-success">
            ✅ Profile updated successfully!
          </div>
        )}

        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-avatar">
            <span className="avatar-icon">👤</span>
          </div>
          <div className="profile-info">
            {!isEditing ? (
              <>
                <h1>{authUser?.username || 'Player'}</h1>
                <p className="profile-email">{authUser?.email || 'user@example.com'}</p>
                <button className="btn btn-edit" onClick={handleEditClick}>
                  ✏️ Edit Profile
                </button>
              </>
            ) : (
              <div className="profile-edit-form">
                <h2>Edit Profile</h2>
                {editError && (
                  <div className="alert alert-error">
                    {editError}
                  </div>
                )}
                <form onSubmit={handleSaveProfile}>
                  <div className="form-group">
                    <label htmlFor="username">Username</label>
                    <input
                      type="text"
                      id="username"
                      name="username"
                      value={editForm.username}
                      onChange={handleEditChange}
                      placeholder="Enter username (3-30 characters)"
                      minLength="3"
                      maxLength="30"
                      required
                      disabled={saving}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={editForm.email}
                      onChange={handleEditChange}
                      placeholder="Enter email"
                      required
                      disabled={saving}
                    />
                  </div>
                  <div className="form-actions">
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : '💾 Save Changes'}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={handleCancelEdit}
                      disabled={saving}
                    >
                      ❌ Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
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

      {/* Loading Overlay during save */}
      {saving && <LoadingOverlay message="Đang lưu thay đổi..." />}
    </div>
  );
}

export default ProfilePage;
