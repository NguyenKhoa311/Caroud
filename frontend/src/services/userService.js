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
};
