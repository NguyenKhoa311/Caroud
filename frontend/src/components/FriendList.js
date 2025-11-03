import React, { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import './FriendList.css';

const FriendList = () => {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      const response = await userService.getFriends();
      setFriends(response);
      setError(null);
    } catch (err) {
      setError('Failed to load friends list');
      console.error('Error loading friends:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) {
      return;
    }

    try {
      await userService.removeFriend(friendId);
      setFriends(friends.filter(f => f.friend.id !== friendId));
    } catch (err) {
      setError('Failed to remove friend');
      console.error('Error removing friend:', err);
    }
  };

  if (loading) {
    return <div className="friend-list-loading">Loading friends...</div>;
  }

  if (error) {
    return <div className="friend-list-error">{error}</div>;
  }

  return (
    <div className="friend-list-container">
      <h2>My Friends ({friends.length})</h2>
      
      {friends.length === 0 ? (
        <div className="no-friends">
          <p>You haven't added any friends yet.</p>
        </div>
      ) : (
        <ul className="friend-list">
          {friends.map(({ friend }) => (
            <li key={friend.id} className="friend-item">
              <div className="friend-info">
                <span className="friend-username">{friend.username}</span>
                <span className="friend-stats">
                  ELO: {friend.elo_rating} | 
                  Games: {friend.total_games} | 
                  Win Rate: {friend.win_rate.toFixed(1)}%
                </span>
              </div>
              <div className="friend-actions">
                <button 
                  className="btn-invite-game"
                  onClick={() => console.log('TODO: Invite to game')}
                >
                  Invite to Game
                </button>
                <button
                  className="btn-remove-friend"
                  onClick={() => handleRemoveFriend(friend.id)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FriendList;