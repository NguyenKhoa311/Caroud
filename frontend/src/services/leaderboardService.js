import api from './api';

export const leaderboardService = {
  // Get leaderboard
  getLeaderboard: async (filter = 'all', limit = 50) => {
    const response = await api.get('/api/leaderboard/', {
      params: { filter, limit }
    });
    return response.data;
  },

  // Get user rank
  getUserRank: async (userId) => {
    const response = await api.get(`/api/leaderboard/user/${userId}/`);
    return response.data;
  },
};
