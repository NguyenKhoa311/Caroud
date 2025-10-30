/**
 * Rooms Page Component
 * 
 * Manages private game rooms:
 * - List user's active rooms
 * - Create new private rooms
 * - Join rooms via code
 * - View and manage room invitations
 * - Room lobby with ready status
 * 
 * Features:
 * - Create custom rooms with settings
 * - Invite friends to rooms
 * - Join via shareable room code
 * - Ready/unready toggle
 * - Host can start game when all ready
 * - Leave or close rooms
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import roomService from '../services/roomService';
import friendService from '../services/friendService';
import './RoomsPage.css';

function RoomsPage() {
  const navigate = useNavigate();
  
  // State management
  const [rooms, setRooms] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('rooms'); // rooms, create, invitations
  
  // Create room form
  const [roomName, setRoomName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  /**
   * Load rooms and invitations on component mount
   */
  useEffect(() => {
    loadRoomsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Fetch user's rooms and invitations
   */
  const loadRoomsData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Get all rooms including public rooms
      const [roomsData, invitationsData] = await Promise.all([
        roomService.getRooms({ public: 'true' }), // Get user's rooms + all public rooms
        roomService.getInvitations('pending')
      ]);
      
      // Filter out finished and closed rooms on client side
      const activeRooms = roomsData.filter(room => 
        room.status !== 'finished' && room.status !== 'closed'
      );
      
      setRooms(activeRooms || []);
      setInvitations(invitationsData || []);
    } catch (err) {
      setError('Failed to load rooms data. Please try again.');
      console.error('Error loading rooms:', err);
      // Set empty arrays on error to prevent runtime errors
      setRooms([]);
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  };



  /**
   * Create a new room
   */
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    
    if (!roomName.trim()) {
      setError('Please enter a room name');
      return;
    }
    
    try {
      const newRoom = await roomService.createRoom({
        name: roomName,
        is_public: isPublic,
        max_players: 2
      });
      
      setSuccessMessage(`Room "${roomName}" created!`);
      setRoomName('');
      setIsPublic(false);
      setActiveTab('rooms');
      loadRoomsData();
      
      // Navigate to room lobby
      setTimeout(() => {
        navigate(`/room/${newRoom.code}`);
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create room');
      setTimeout(() => setError(''), 3000);
    }
  };

  /**
   * Join a room via code
   */
  const handleJoinRoom = async (e) => {
    e.preventDefault();
    
    if (!joinCode.trim()) {
      setError('Please enter a room code');
      return;
    }
    
    try {
      await roomService.joinRoom(joinCode);
      setSuccessMessage('Joined room successfully!');
      setJoinCode('');
      
      // Navigate to room lobby
      setTimeout(() => {
        navigate(`/room/${joinCode}`);
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join room');
      setTimeout(() => setError(''), 3000);
    }
  };

  /**
   * Accept a room invitation
   */
  const handleAcceptInvitation = async (invitationId, roomCode) => {
    try {
      await roomService.acceptInvitation(invitationId);
      setSuccessMessage('Invitation accepted!');
      loadRoomsData();
      
      // Navigate to room lobby
      setTimeout(() => {
        navigate(`/room/${roomCode}`);
      }, 1000);
    } catch (err) {
      setError('Failed to accept invitation');
      setTimeout(() => setError(''), 3000);
    }
  };

  /**
   * Reject a room invitation
   */
  const handleRejectInvitation = async (invitationId) => {
    try {
      await roomService.rejectInvitation(invitationId);
      setSuccessMessage('Invitation rejected');
      loadRoomsData();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to reject invitation');
      setTimeout(() => setError(''), 3000);
    }
  };

  /**
   * Copy room join URL to clipboard
   */
  const handleCopyRoomLink = (joinUrl) => {
    navigator.clipboard.writeText(joinUrl);
    setSuccessMessage('Room link copied to clipboard!');
    setTimeout(() => setSuccessMessage(''), 2000);
  };

  /**
   * Navigate to room lobby
   * Auto-join if not already in room
   */
  const handleEnterRoom = async (roomCode) => {
    try {
      // Try to join the room first (will handle rejoin if already joined)
      await roomService.joinRoom(roomCode);
      // Navigate to room lobby
      navigate(`/room/${roomCode}`);
    } catch (err) {
      // If already in room, just navigate
      if (err.response?.data?.error?.includes('already in this room')) {
        navigate(`/room/${roomCode}`);
      } else {
        setError(err.response?.data?.error || 'Failed to enter room');
      }
    }
  };

  if (loading) {
    return <div className="rooms-page loading">Loading rooms...</div>;
  }

  return (
    <div className="rooms-page">
      <h1>Game Rooms</h1>

      {/* Messages */}
      {error && <div className="message error">{error}</div>}
      {successMessage && <div className="message success">{successMessage}</div>}

      {/* Tabs */}
      <div className="tabs">
        <button
          className={activeTab === 'rooms' ? 'active' : ''}
          onClick={() => setActiveTab('rooms')}
        >
          My Rooms ({Array.isArray(rooms) ? rooms.length : 0})
        </button>
        <button
          className={activeTab === 'create' ? 'active' : ''}
          onClick={() => setActiveTab('create')}
        >
          Create / Join Room
        </button>
        <button
          className={activeTab === 'invitations' ? 'active' : ''}
          onClick={() => setActiveTab('invitations')}
        >
          Invitations ({Array.isArray(invitations) ? invitations.length : 0})
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* My Rooms Tab */}
        {activeTab === 'rooms' && (
          <div className="rooms-list">
            <h2>Active Rooms</h2>
            {!Array.isArray(rooms) || rooms.length === 0 ? (
              <p className="empty-state">No active rooms. Create a new room or join via code!</p>
            ) : (
              <div className="rooms-grid">
                {rooms.map(room => (
                  <div key={room.id} className="room-card">
                    <div className="room-header">
                      <h3>{room.name || 'Unnamed Room'}</h3>
                      <span className={`room-status ${room.status || 'waiting'}`}>{room.status || 'waiting'}</span>
                    </div>
                    <div className="room-info">
                      <p><strong>Host:</strong> {room.host?.username || 'Unknown'}</p>
                      <p><strong>Players:</strong> {room.participants ? room.participants.filter(p => !p.has_left).length : 0} / {room.max_players || 2}</p>
                      <p><strong>Code:</strong> <code>{room.code || 'N/A'}</code></p>
                    </div>
                    <div className="room-participants">
                      {room.participants && room.participants
                        .filter(p => !p.has_left)
                        .map(participant => (
                          <div key={participant.id} className="participant">
                            <span>{participant.user?.username || 'Unknown'}</span>
                            {participant.is_ready && <span className="ready-badge">✓ Ready</span>}
                          </div>
                        ))}
                    </div>
                    <div className="room-actions">
                      <button
                        className="btn-enter"
                        onClick={() => handleEnterRoom(room.code)}
                      >
                        Enter Room
                      </button>
                      <button
                        className="btn-copy"
                        onClick={() => handleCopyRoomLink(room.join_url)}
                      >
                        Copy Link
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create/Join Room Tab */}
        {activeTab === 'create' && (
          <div className="create-join-section">
            <div className="create-room-form">
              <h2>Create New Room</h2>
              <form onSubmit={handleCreateRoom}>
                <div className="form-group">
                  <label htmlFor="roomName">Room Name</label>
                  <input
                    type="text"
                    id="roomName"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="Enter room name"
                    required
                  />
                </div>
                <div className="form-group checkbox">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                  />
                  <label htmlFor="isPublic">Public Room (visible to everyone)</label>
                </div>
                <button type="submit" className="btn-create">Create Room</button>
              </form>
            </div>

            <div className="join-room-form">
              <h2>Join Room via Code</h2>
              <form onSubmit={handleJoinRoom}>
                <div className="form-group">
                  <label htmlFor="joinCode">Room Code</label>
                  <input
                    type="text"
                    id="joinCode"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="Enter room code (UUID)"
                    required
                  />
                </div>
                <button type="submit" className="btn-join">Join Room</button>
              </form>
            </div>
          </div>
        )}

        {/* Invitations Tab */}
        {activeTab === 'invitations' && (
          <div className="invitations-section">
            <h2>Room Invitations</h2>
            {!Array.isArray(invitations) || invitations.length === 0 ? (
              <p className="empty-state">No pending invitations</p>
            ) : (
              <div className="invitations-list">
                {invitations.map(invitation => (
                  <div key={invitation.id} className="invitation-card">
                    <div className="invitation-info">
                      <h3>{invitation.room?.name || 'Unknown Room'}</h3>
                      <p><strong>From:</strong> {invitation.from_user?.username || 'Unknown User'}</p>
                      {invitation.message && (
                        <p className="invitation-message">"{invitation.message}"</p>
                      )}
                      <p className="invitation-details">
                        Players: {invitation.room?.participants ? invitation.room.participants.filter(p => !p.has_left).length : 0} / {invitation.room?.max_players || 2}
                      </p>
                      <p className="invitation-date">
                        {new Date(invitation.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="invitation-actions">
                      <button
                        className="btn-accept"
                        onClick={() => handleAcceptInvitation(invitation.id, invitation.room.code)}
                      >
                        Accept & Join
                      </button>
                      <button
                        className="btn-reject"
                        onClick={() => handleRejectInvitation(invitation.id)}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default RoomsPage;
