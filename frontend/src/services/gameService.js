import api from './api';

export const gameService = {
  // Create a new game
  createGame: async (mode) => {
    const response = await api.post('/api/games/', { mode });
    return response.data;
  },

  // Get game by ID
  getGame: async (gameId) => {
    const response = await api.get(`/api/games/${gameId}/`);
    return response.data;
  },

  // Make a move
  makeMove: async (gameId, row, col) => {
    const response = await api.post(`/api/games/${gameId}/move/`, { row, col });
    return response.data;
  },

  // Get AI move
  getAIMove: async (gameId, difficulty = 'medium') => {
    const response = await api.post(`/api/games/${gameId}/ai_move/`, { difficulty });
    return response.data;
  },

  // Save game result
  saveGameResult: async (gameId, result) => {
    const response = await api.post(`/api/games/${gameId}/result/`, result);
    return response.data;
  },

  // Join matchmaking queue
  joinMatchmaking: async () => {
    const response = await api.post('/api/matchmaking/join/');
    return response.data;
  },

  // Leave matchmaking queue
  leaveMatchmaking: async () => {
    const response = await api.post('/api/matchmaking/leave/');
    return response.data;
  },

  // Check matchmaking status
  checkMatchmaking: async () => {
    const response = await api.get('/api/matchmaking/status/');
    return response.data;
  },
};
