import api from './api';

const matchmakingService = {
  /**
   * Join matchmaking queue
   */
  joinQueue: async () => {
    try {
      const response = await api.post('/api/matchmaking/join/');
      return response.data;
    } catch (error) {
      console.error('Error joining matchmaking:', error);
      throw error;
    }
  },

  /**
   * Leave matchmaking queue
   */
  leaveQueue: async () => {
    try {
      const response = await api.post('/api/matchmaking/leave/');
      return response.data;
    } catch (error) {
      console.error('Error leaving matchmaking:', error);
      throw error;
    }
  },

  /**
   * Check matchmaking status (for polling)
   */
  checkStatus: async () => {
    try {
      const response = await api.get('/api/matchmaking/status/');
      return response.data;
    } catch (error) {
      console.error('Error checking matchmaking status:', error);
      throw error;
    }
  },

  /**
   * Get queue information
   */
  getQueueInfo: async () => {
    try {
      const response = await api.get('/api/matchmaking/queue_info/');
      return response.data;
    } catch (error) {
      console.error('Error getting queue info:', error);
      throw error;
    }
  }
};

export default matchmakingService;
