/**
 * Room Service
 * 
 * Handles all game room-related API calls including:
 * - Room creation and management
 * - Joining rooms via code
 * - Ready status and game start
 * - Room invitations
 * - Room listing and details
 * 
 * All methods require authentication token in headers.
 */

import api from './api';

/**
 * Get list of user's rooms.
 * 
 * @param {Object} [filters={}] - Filter options
 * @param {string} [filters.status] - Filter by status (waiting/ready/active/finished/closed)
 * @param {boolean} [filters.public] - Show only public rooms
 * @returns {Promise<Array>} List of room objects with participants
 * 
 * @example
 * const rooms = await roomService.getRooms({ status: 'waiting' });
 */
export const getRooms = async (filters = {}) => {
  try {
    const response = await api.get('/users/rooms/list/', {
      params: filters
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return [];
  }
};

/**
 * Get details of a specific room by code.
 * 
 * @param {string} code - Room's unique code
 * @returns {Promise<Object>} Room object with full details and participants
 * 
 * @example
 * const room = await roomService.getRoomByCode('abc-123-def');
 */
export const getRoomByCode = async (code) => {
  const response = await api.get(`/users/rooms/list/${code}/`);
  return response.data;
};

/**
 * Create a new game room.
 * Current user becomes the host.
 * 
 * @param {Object} roomData - Room configuration
 * @param {string} roomData.name - Room display name
 * @param {boolean} [roomData.is_public=false] - Whether room is publicly visible
 * @param {number} [roomData.max_players=2] - Maximum players (default 2 for Caro)
 * @param {Object} [roomData.settings={}] - Custom settings (time limits, board size, etc.)
 * @returns {Promise<Object>} Created room object with join URL
 * 
 * @example
 * const room = await roomService.createRoom({
 *   name: "My Private Game",
 *   is_public: false,
 *   max_players: 2,
 *   settings: { board_size: 15, time_limit: 600 }
 * });
 * // Share room.join_url to invite players
 */
export const createRoom = async (roomData) => {
  const response = await api.post('/users/rooms/list/', roomData);
  return response.data;
};

/**
 * Join a room using its code.
 * 
 * @param {string} code - Room's unique code
 * @returns {Promise<Object>} Updated room object
 * 
 * @example
 * const room = await roomService.joinRoom('abc-123-def');
 */
export const joinRoom = async (code) => {
  const response = await api.post(`/users/rooms/list/${code}/join/`);
  return response.data;
};

/**
 * Toggle ready status in a room.
 * When all players are ready, room status becomes 'ready'.
 * 
 * @param {string} code - Room's unique code
 * @returns {Promise<Object>} Updated room object
 * 
 * @example
 * const room = await roomService.toggleReady('abc-123-def');
 */
export const toggleReady = async (code) => {
  const response = await api.post(`/users/rooms/list/${code}/ready/`);
  return response.data;
};

/**
 * Start the game (host only).
 * Creates a Match and updates room status to 'active'.
 * 
 * @param {string} code - Room's unique code
 * @returns {Promise<Object>} Match data and updated room
 * 
 * @example
 * const result = await roomService.startGame('abc-123-def');
 * // Returns: { message: "...", match: { ... }, room: { ... } }
 * // Navigate to game page with match ID
 */
export const startGame = async (code) => {
  const response = await api.post(`/users/rooms/list/${code}/start/`);
  return response.data;
};

/**
 * Leave a room.
 * If host leaves, room is closed.
 * 
 * @param {string} code - Room's unique code
 * @returns {Promise<Object>} Success message
 * 
 * @example
 * await roomService.leaveRoom('abc-123-def');
 */
export const leaveRoom = async (code) => {
  const response = await api.post(`/users/rooms/list/${code}/leave/`);
  return response.data;
};

/**
 * Close a room (host only).
 * 
 * @param {string} code - Room's unique code
 * @returns {Promise<Object>} Success message
 * 
 * @example
 * await roomService.closeRoom('abc-123-def');
 */
export const closeRoom = async (code) => {
  const response = await api.delete(`/users/rooms/list/${code}/`);
  return response.data;
};

/**
 * Get list of received room invitations.
 * 
 * @param {string} [status='pending'] - Filter by status (pending/accepted/rejected)
 * @returns {Promise<Array>} List of invitation objects
 * 
 * @example
 * const invitations = await roomService.getInvitations('pending');
 */
export const getInvitations = async (status = 'pending') => {
  try {
    const response = await api.get('/users/rooms/invitations/', {
      params: { status }
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return [];
  }
};

/**
 * Send room invitation to a friend.
 * 
 * @param {Object} inviteData - Invitation data
 * @param {number} inviteData.room_id - Room ID to invite to
 * @param {number} inviteData.to_user_id - Friend's user ID
 * @param {string} [inviteData.message=''] - Optional message
 * @returns {Promise<Object>} Created invitation object
 * 
 * @example
 * const invitation = await roomService.sendInvitation({
 *   room_id: 1,
 *   to_user_id: 2,
 *   message: "Join my game!"
 * });
 */
export const sendInvitation = async (inviteData) => {
  const response = await api.post('/users/rooms/invitations/', inviteData);
  return response.data;
};

/**
 * Accept a room invitation.
 * Automatically joins the room.
 * 
 * @param {number} invitationId - Invitation ID
 * @returns {Promise<Object>} Success message with room data
 * 
 * @example
 * const result = await roomService.acceptInvitation(5);
 * // Returns: { message: "...", room: { code: "...", ... } }
 * // Navigate to room lobby with room.code
 */
export const acceptInvitation = async (invitationId) => {
  const response = await api.post(`/users/rooms/invitations/${invitationId}/accept/`);
  return response.data;
};

/**
 * Reject a room invitation.
 * 
 * @param {number} invitationId - Invitation ID
 * @returns {Promise<Object>} Success message
 * 
 * @example
 * await roomService.rejectInvitation(5);
 */
export const rejectInvitation = async (invitationId) => {
  const response = await api.post(`/users/rooms/invitations/${invitationId}/reject/`);
  return response.data;
};

const roomService = {
  getRooms,
  getRoomByCode,
  createRoom,
  joinRoom,
  toggleReady,
  startGame,
  leaveRoom,
  closeRoom,
  getInvitations,
  sendInvitation,
  acceptInvitation,
  rejectInvitation
};

export default roomService;
