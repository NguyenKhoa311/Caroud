/**
 * Room Lobby Component
 * 
 * Detailed room lobby where players wait before game starts:
 * - Display room info and participants
 * - Ready/unready toggle
 * - Host can start game when all ready
 * - Invite friends to room
 * - Copy room link
 * - Leave room
 * 
 * Features:
 * - Real-time participant list
 * - Ready status indicators
 * - Start game button (host only)
 * - Friend invitation modal
 * - Room settings display
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import roomService from '../services/roomService';
import friendService from '../services/friendService';
import { useAuth } from '../utils/auth';
import './RoomLobby.css';

function RoomLobby() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State
  const [room, setRoom] = useState(null);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');

  /**
   * Load room details on mount and set up polling
   */
  useEffect(() => {
    loadRoomDetails();
    loadFriends();
    
    // Poll for room updates every 3 seconds
    const interval = setInterval(loadRoomDetails, 3000);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  /**
   * Fetch room details
   */
  const loadRoomDetails = async () => {
    try {
      const roomData = await roomService.getRoomByCode(code);
      setRoom(roomData);
      setLoading(false);
      
      // If game started, navigate to game page
      if (roomData.status === 'active' && roomData.game) {
        navigate(`/game?mode=online&matchId=${roomData.game.id}&roomCode=${code}`);
      }
    } catch (err) {
      setError('Failed to load room details');
      setLoading(false);
      console.error('Error loading room:', err);
    }
  };

  /**
   * Load friends for inviting
   */
  const loadFriends = async () => {
    try {
      const friendsData = await friendService.getFriends();
      setFriends(friendsData);
    } catch (err) {
      console.error('Error loading friends:', err);
    }
  };

  /**
   * Toggle ready status
   */
  const handleToggleReady = async () => {
    try {
      const updatedRoom = await roomService.toggleReady(code);
      setRoom(updatedRoom);
      
      const participant = updatedRoom.participants.find(p => p.user.id === user.id && !p.has_left);
      setSuccessMessage(participant?.is_ready ? 'You are ready!' : 'Ready status removed');
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (err) {
      setError('Failed to update ready status');
      setTimeout(() => setError(''), 3000);
    }
  };

  /**
   * Start the game (host only)
   */
  const handleStartGame = async () => {
    try {
      const result = await roomService.startGame(code);
      setSuccessMessage('Game starting...');
      
      // Navigate to game page with online mode
      setTimeout(() => {
        navigate(`/game/online?matchId=${result.match.id}`);
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start game');
      setTimeout(() => setError(''), 3000);
    }
  };

  /**
   * Copy room link to clipboard
   */
  const handleCopyLink = () => {
    if (room) {
      navigator.clipboard.writeText(room.join_url);
      setSuccessMessage('Room link copied!');
      setTimeout(() => setSuccessMessage(''), 2000);
    }
  };

  /**
   * Send invitation to friend
   */
  const handleInviteFriend = async (friendId) => {
    try {
      await roomService.sendInvitation({
        room_id: room.id,
        to_user_id: friendId,
        message: inviteMessage || 'Join my game!'
      });
      
      setSuccessMessage('Invitation sent!');
      setShowInviteModal(false);
      setInviteMessage('');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send invitation');
      setTimeout(() => setError(''), 3000);
    }
  };

  /**
   * Leave the room
   */
  const handleLeaveRoom = async () => {
    if (!window.confirm('Are you sure you want to leave this room?')) {
      return;
    }
    
    try {
      await roomService.leaveRoom(code);
      setSuccessMessage('Left room');
      setTimeout(() => {
        navigate('/rooms');
      }, 1000);
    } catch (err) {
      setError('Failed to leave room');
      setTimeout(() => setError(''), 3000);
    }
  };

  if (loading) {
    return <div className="room-lobby loading">Loading room...</div>;
  }

  if (!room) {
    return <div className="room-lobby error">Room not found</div>;
  }

  const isHost = room.host.id === user?.id;
  const currentParticipant = room.participants.find(p => p.user.id === user?.id && !p.has_left);
  const activePlayers = room.participants.filter(p => !p.has_left);
  const canStart = room.status === 'ready' && isHost;

  return (
    <div className="room-lobby">
      <div className="room-lobby-header">
        <h1>{room.name}</h1>
        <span className={`room-status ${room.status}`}>{room.status}</span>
      </div>

      {/* Messages */}
      {error && <div className="message error">{error}</div>}
      {successMessage && <div className="message success">{successMessage}</div>}

      <div className="room-lobby-content">
        {/* Room Info */}
        <div className="room-info-panel">
          <h2>Room Information</h2>
          <div className="info-item">
            <span className="label">Host:</span>
            <span className="value">{room.host.username}</span>
          </div>
          <div className="info-item">
            <span className="label">Room Code:</span>
            <span className="value"><code>{room.code}</code></span>
          </div>
          <div className="info-item">
            <span className="label">Players:</span>
            <span className="value">{activePlayers.length} / {room.max_players}</span>
          </div>
          <div className="info-item">
            <span className="label">Visibility:</span>
            <span className="value">{room.is_public ? 'Public' : 'Private'}</span>
          </div>

          <div className="room-actions">
            <button className="btn-copy-link" onClick={handleCopyLink}>
              📋 Copy Room Link
            </button>
            <button className="btn-invite" onClick={() => setShowInviteModal(true)}>
              👥 Invite Friends
            </button>
          </div>
        </div>

        {/* Players List */}
        <div className="players-panel">
          <h2>Players</h2>
          <div className="players-list">
            {activePlayers.map(participant => (
              <div 
                key={participant.id} 
                className={`player-item ${participant.is_ready ? 'ready' : ''}`}
              >
                <div className="player-info">
                  <span className="player-name">
                    {participant.user.username}
                    {participant.user.id === room.host.id && <span className="host-badge">👑 Host</span>}
                  </span>
                  <span className="player-elo">ELO: {participant.user.elo_rating}</span>
                </div>
                {participant.is_ready ? (
                  <span className="ready-indicator">✓ Ready</span>
                ) : (
                  <span className="not-ready-indicator">⏳ Not Ready</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="lobby-footer">
        {currentParticipant && (
          <button 
            className={`btn-ready ${currentParticipant.is_ready ? 'ready' : ''}`}
            onClick={handleToggleReady}
          >
            {currentParticipant.is_ready ? '✓ Ready' : 'Mark as Ready'}
          </button>
        )}
        
        {canStart && (
          <button className="btn-start-game" onClick={handleStartGame}>
            🎮 Start Game
          </button>
        )}
        
        <button className="btn-leave" onClick={handleLeaveRoom}>
          🚪 Leave Room
        </button>
      </div>

      {/* Invite Friends Modal */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Invite Friends</h2>
            <div className="invite-message-input">
              <input
                type="text"
                placeholder="Optional message..."
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
              />
            </div>
            <div className="friends-list-modal">
              {friends.length === 0 ? (
                <p className="empty-state">No friends to invite</p>
              ) : (
                friends.map(friendship => (
                  <div key={friendship.id} className="friend-item">
                    <span>{friendship.friend.username}</span>
                    <button
                      className="btn-send-invite"
                      onClick={() => handleInviteFriend(friendship.friend.id)}
                    >
                      Send Invite
                    </button>
                  </div>
                ))
              )}
            </div>
            <button className="btn-close-modal" onClick={() => setShowInviteModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoomLobby;
