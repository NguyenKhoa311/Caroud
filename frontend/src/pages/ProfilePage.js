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

      // !!! THAY THẾ '/api/your-aws-lambda-endpoint' BẰNG URL CỦA BẠN !!!
      const AWS_API_ENDPOINT = 'https://maqj70s38d.execute-api.ap-southeast-1.amazonaws.com/dev';

      // --- THAY ĐỔI CHO STATS ---
      try {
        const statsPayload = {
          action: 'getUserStats',
          payload: {
            // Use cognito_id if available (for Cognito users), otherwise use id
            userId: authUser.cognito_id || authUser.id 
          }
        };
        // Sử dụng POST (hoặc GET nếu bạn cấu hình API Gateway cho phép)
        const statsResponse = await api.post(AWS_API_ENDPOINT, statsPayload);
        setStats(statsResponse.data);
      } catch (err) {
        // ... giữ nguyên phần xử lý lỗi stats ...
      }

      // --- THAY ĐỔI CHO MATCH HISTORY ---
      try {
        const historyPayload = {
          action: 'getMatchHistory',
          payload: {
            // Use cognito_id if available (for Cognito users), otherwise use id
            userId: authUser.cognito_id || authUser.id,
            limit: 10
          }
        };
        const historyResponse = await api.post(AWS_API_ENDPOINT, historyPayload);
        setMatchHistory(historyResponse.data || []);
      } catch (err) {
        // ... giữ nguyên phần xử lý lỗi match history ...
      }

    } catch (error) {
      // ...
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
      // Validate username (giữ nguyên)
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

      // --- THAY ĐỔI BẮT ĐẦU TỪ ĐÂY ---

      // 1. Chuẩn bị payload cho Lambda
      // Trong ProfilePage.js, hàm handleSaveProfile...

      // 1. Chuẩn bị payload cho Lambda
      const lambdaPayload = {
        action: 'updateProfile',
        payload: {
          userId: authUser.id, // <-- THÊM DÒNG NÀY
          username: editForm.username.trim(),
          email: editForm.email.trim()
        }
      };
      
// ... phần còn lại giữ nguyên

      // 2. Gọi đến endpoint AWS API Gateway của bạn
      // !!! THAY THẾ '/api/your-aws-lambda-endpoint' BẰNG URL CỦA BẠN !!!
      // ... trong hàm handleSaveProfile ...
const response = await api.post(
  'https://maqj70s38d.execute-api.ap-southeast-1.amazonaws.com/dev', 
  lambdaPayload
);

// ... các lệnh gọi khác cũng phải dùng URL đầy đủ ...

      // --- KẾT THÚC THAY ĐỔI ---

      /*
      // Code cũ:
      const response = await api.put('/api/users/update_profile/', {
        username: editForm.username.trim(),
        email: editForm.email.trim()
      });
      */

      if (response.data) {
        setEditSuccess(true);
        setIsEditing(false);
        
        // Refresh auth để lấy dữ liệu user mới
        // await refreshAuth();
        await fetchUserData();
        
        // Tải lại stats sau khi refresh auth (tùy chọn)
        // await fetchUserData(); // Có thể không cần nếu refreshAuth đã cập nhật authUser
        
        setTimeout(() => {
          setEditSuccess(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      
      // PHẦN NÀY RẤT QUAN TRỌNG:
      // Hàm Lambda của bạn PHẢI trả về lỗi có cấu trúc
      // giống như API cũ (ví dụ: { "username": ["Tên đã tồn tại"] })
      // để code xử lý lỗi bên dưới hoạt động.
      
      if (error.response?.data) {
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
                // Backend đã tính user_result sẵn ('win', 'loss', 'draw')
                const result = match.user_result || 'draw';
                
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
                      {result === 'draw' ? '⚖️ Draw' : result === 'win' ? '✅ Won' : '❌ Lost'}
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
