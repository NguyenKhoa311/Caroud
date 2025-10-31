/**
 * Friend Service
 * 
 * Handles all friend-related API calls including:
 * - Friend requests (send, accept, reject, cancel)
 * - Friends list management
 * - User search for adding friends
 * - Invite links (create, use)
 * 
 * All methods require authentication token in headers.
 */

import api from './api';

/**
 * Get list of friends for current user.
 * 
 * @returns {Promise<Array>} List of friend objects with user data
 * 
 * @example
 * const friends = await friendService.getFriends();
 * // Returns: [{ id: 1, friend: { username: "player1", ... }, social_source: "direct", ... }]
 */
export const getFriends = async () => {
  try {
    const response = await api.get('/api/users/friends/list/');
    // Backend returns paginated response with 'results' array
    return Array.isArray(response.data?.results) ? response.data.results : 
           Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching friends:', error);
    return []; // Return empty array on error
  }
};

/**
 * Get list of received friend requests.
 * 
 * @param {string} [status='pending'] - Filter by status (pending/accepted/rejected)
 * @returns {Promise<Array>} List of friend request objects
 * 
 * @example
 * const requests = await friendService.getReceivedRequests('pending');
 */
export const getReceivedRequests = async (status = 'pending') => {
  try {
    const response = await api.get('/api/users/friends/requests/', {
      params: { status }
    });
    // Backend returns paginated response with 'results' array
    return Array.isArray(response.data?.results) ? response.data.results : 
           Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching received requests:', error);
    return [];
  }
};

/**
 * Get list of sent friend requests.
 * 
 * @param {string} [status='pending'] - Filter by status
 * @returns {Promise<Array>} List of sent friend request objects
 * 
 * @example
 * const sentRequests = await friendService.getSentRequests('pending');
 */
export const getSentRequests = async (status = 'pending') => {
  try {
    const response = await api.get('/api/users/friends/requests/sent/', {
      params: { status }
    });
    // Backend returns paginated response with 'results' array
    return Array.isArray(response.data?.results) ? response.data.results : 
           Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching sent requests:', error);
    return [];
  }
};

/**
 * Send a friend request to another user.
 * 
 * @param {number} toUserId - Target user's ID
 * @param {string} [message=''] - Optional message to include
 * @returns {Promise<Object>} Created friend request object
 * 
 * @example
 * const request = await friendService.sendFriendRequest(2, "Let's play!");
 */
export const sendFriendRequest = async (toUserId, message = '') => {
  const response = await api.post('/api/users/friends/requests/', {
    to_user_id: toUserId,
    message
  });
  return response.data;
};

/**
 * Accept a received friend request.
 * Creates bidirectional friendship.
 * 
 * @param {number} requestId - Friend request ID
 * @returns {Promise<Object>} Success message
 * 
 * @example
 * await friendService.acceptFriendRequest(5);
 */
export const acceptFriendRequest = async (requestId) => {
  const response = await api.post(`/api/users/friends/requests/${requestId}/accept/`);
  return response.data;
};

/**
 * Reject a received friend request.
 * 
 * @param {number} requestId - Friend request ID
 * @returns {Promise<Object>} Success message
 * 
 * @example
 * await friendService.rejectFriendRequest(5);
 */
export const rejectFriendRequest = async (requestId) => {
  const response = await api.post(`/api/users/friends/requests/${requestId}/reject/`);
  return response.data;
};

/**
 * Cancel a sent friend request.
 * 
 * @param {number} requestId - Friend request ID
 * @returns {Promise<Object>} Success message
 * 
 * @example
 * await friendService.cancelFriendRequest(5);
 */
export const cancelFriendRequest = async (requestId) => {
  const response = await api.delete(`/api/users/friends/requests/${requestId}/`);
  return response.data;
};

/**
 * Search for users by username.
 * Excludes current user, existing friends, and pending requests.
 * 
 * @param {string} query - Search query (min 2 characters)
 * @returns {Promise<Array>} List of matching users
 * 
 * @example
 * const users = await friendService.searchUsers('player');
 * // Returns: [{ id: 2, username: "player123", elo_rating: 1200, ... }]
 */
export const searchUsers = async (query) => {
  if (!query || query.length < 2) {
    throw new Error('Search query must be at least 2 characters');
  }
  
  const response = await api.get('/api/users/friends/list/search/', {
    params: { q: query }
  });
  return response.data;
};

/**
 * Get user's active invite links.
 * 
 * @returns {Promise<Array>} List of invite link objects
 * 
 * @example
 * const links = await friendService.getInviteLinks();
 */
export const getInviteLinks = async () => {
  try {
    const response = await api.get('/api/users/friends/invite-links/');
    // Backend returns paginated response with 'results' array
    return Array.isArray(response.data?.results) ? response.data.results : 
           Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching invite links:', error);
    return [];
  }
};

/**
 * Create a new friend invite link.
 * 
 * @param {Object} options - Link options
 * @param {string} [options.expires_at] - ISO date string for expiration (null = never)
 * @param {number} [options.max_uses] - Maximum uses (null = unlimited)
 * @returns {Promise<Object>} Created invite link with full URL
 * 
 * @example
 * const link = await friendService.createInviteLink({
 *   expires_at: '2024-12-31T23:59:59Z',
 *   max_uses: 10
 * });
 * // Use link.invite_url to share
 */
export const createInviteLink = async (options = {}) => {
  const response = await api.post('/api/users/friends/invite-links/', options);
  return response.data;
};

/**
 * Deactivate an invite link.
 * 
 * @param {string} code - Invite link UUID code
 * @returns {Promise<Object>} Success message
 * 
 * @example
 * await friendService.deactivateInviteLink('abc-123-def');
 */
export const deactivateInviteLink = async (code) => {
  const response = await api.delete(`/api/users/friends/invite-links/${code}/`);
  return response.data;
};

/**
 * Accept friend invitation via invite link code.
 * 
 * @param {string} code - Invite link UUID code
 * @returns {Promise<Object>} Success message with new friend data
 * 
 * @example
 * const result = await friendService.acceptInviteLink('abc-123-def');
 * // Returns: { message: "...", friend: { username: "...", ... } }
 */
export const acceptInviteLink = async (code) => {
  const response = await api.post(`/api/users/friends/invite/${code}/`);
  return response.data;
};

const friendService = {
  getFriends,
  getReceivedRequests,
  getSentRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  searchUsers,
  getInviteLinks,
  createInviteLink,
  deactivateInviteLink,
  acceptInviteLink
};

export default friendService;
