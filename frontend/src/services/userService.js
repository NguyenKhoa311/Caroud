import api from './api';

export const userService = {
  // Get user profile
  getUserProfile: async () => {
    const response = await api.get('/users/profile/');
    return response.data;
  },

  // Update user profile
  updateUserProfile: async (data) => {
    const response = await api.put('/users/profile/', data);
    return response.data;
  },

  // Get user stats
  getUserStats: async (userId) => {
    const response = await api.get(`/users/${userId}/stats/`);
    return response.data;
  },

  // Get match history
  getMatchHistory: async (userId, limit = 10) => {
    const response = await api.get(`/users/${userId}/matches/`, {
      params: { limit }
    });
    return response.data;
  },

  // --- Friends ---
  getFriends: async () => {
    const response = await api.get('/users/friends/');
    return response.data;
  },

  sendFriendRequest: async (toUsername) => {
    const response = await api.post('/users/friends/', { to_username: toUsername });
    return response.data;
  },

  createInviteLink: async () => {
    const response = await api.post('/users/friends/invite/');
    return response.data;
  },

  acceptInvite: async (token) => {
    const response = await api.post('/users/friends/invite/accept/', { token });
    return response.data;
  },

  acceptFriendRequest: async (requestId) => {
    const response = await api.post(`/users/friends/${requestId}/accept/`);
    return response.data;
  },

  rejectFriendRequest: async (requestId) => {
    const response = await api.post(`/users/friends/${requestId}/reject/`);
    return response.data;
  },

  removeFriend: async (userId) => {
    const response = await api.delete(`/users/friends/${userId}/`);
    return response.data;
  },

  searchUsers: async (q) => {
    const response = await api.get('/users/friends/search/', { params: { q } });
    return response.data;
  }
};
