/**
 * Leaderboard Utilities
 * 
 * Provides stable ranking logic with proper tie-breaking rules
 */

/**
 * Calculate unique ranks for players with tie-breaking
 * 
 * Ranking rules (Chess standard):
 * 1. Rated players (played at least 1 game) ALWAYS rank higher than unrated
 * 2. Among rated players:
 *    - ELO rating (descending)
 *    - Win rate (descending)
 *    - Total wins (descending)
 *    - User ID (ascending - ensures deterministic ordering)
 * 3. Among unrated players:
 *    - User ID (ascending)
 * 
 * @param {Array} players - Array of player objects
 * @returns {Array} - Sorted players with unique rank assigned
 */
export const calculateRanks = (players) => {
  if (!players || players.length === 0) {
    return [];
  }

  // Separate rated (played games) vs unrated (no games) players
  const rated = players.filter(p => (p.wins + p.losses) > 0);
  const unrated = players.filter(p => (p.wins + p.losses) === 0);

  // Sort rated players with comprehensive tie-breaking
  const sortedRated = [...rated].sort((a, b) => {
    // Primary: ELO rating (descending)
    if (b.elo_rating !== a.elo_rating) {
      return b.elo_rating - a.elo_rating;
    }
    
    // Tie-breaker 1: Win rate (descending)
    if (b.win_rate !== a.win_rate) {
      return b.win_rate - a.win_rate;
    }
    
    // Tie-breaker 2: Total wins (descending)
    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }
    
    // Tie-breaker 3: User ID (ascending - stable sort)
    return a.id - b.id;
  });

  // Sort unrated players by ID only (all have same ELO)
  const sortedUnrated = [...unrated].sort((a, b) => a.id - b.id);

  // Combine: rated players first, then unrated
  const combined = [...sortedRated, ...sortedUnrated];

  // Assign sequential ranks (1, 2, 3, ...)
  return combined.map((player, index) => ({
    ...player,
    rank: index + 1,
    isRated: (player.wins + player.losses) > 0 // Flag for UI display
  }));
};

/**
 * Get rank color based on position
 * 
 * @param {number} rank - Player's rank
 * @returns {string} - Hex color code
 */
export const getRankColor = (rank) => {
  if (rank === 1) return '#FFD700'; // Gold
  if (rank === 2) return '#C0C0C0'; // Silver
  if (rank === 3) return '#CD7F32'; // Bronze
  return '#667eea'; // Default purple
};

/**
 * Get rank emoji based on position
 * 
 * @param {number} rank - Player's rank
 * @returns {string} - Emoji icon
 */
export const getRankIcon = (rank) => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return '🏅';
};

/**
 * Calculate win rate percentage
 * 
 * @param {number} wins - Number of wins
 * @param {number} losses - Number of losses
 * @returns {number} - Win rate as percentage (0-100)
 */
export const calculateWinRate = (wins, losses) => {
  const totalGames = wins + losses;
  if (totalGames === 0) return 0;
  return (wins / totalGames) * 100;
};
