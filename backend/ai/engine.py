"""
AI Engine for Caro Game

This module provides AI opponents with different difficulty levels.
Currently implements a simple random move AI, but can be extended
to include minimax, alpha-beta pruning, and neural networks.
"""

import random
from typing import List, Tuple, Optional


class CaroAI:
    """
    AI player for Caro game
    """
    
    def __init__(self, difficulty='medium'):
        """
        Initialize AI with difficulty level
        
        Args:
            difficulty: 'easy', 'medium', or 'hard'
        """
        self.difficulty = difficulty
        self.board_size = 15
    
    def get_move(self, board: List[List[Optional[str]]], ai_player: str = 'O') -> Tuple[int, int]:
        """
        Get AI move based on current board state
        
        Args:
            board: 2D list representing the game board
            ai_player: the player symbol the AI is playing as ('X' or 'O')
        Returns:
            Tuple of (row, col) for the move
        """
        if self.difficulty == 'easy':
            return self._get_random_move(board)
        elif self.difficulty == 'medium':
            return self._get_smart_move(board, ai_player)
        else:  # hard
            return self._get_minimax_move(board, ai_player)
    
    def _get_random_move(self, board: List[List[Optional[str]]]) -> Tuple[int, int]:
        """
        Get a random valid move
        """
        empty_cells = []
        for i in range(len(board)):
            for j in range(len(board[0])):
                if board[i][j] is None:
                    empty_cells.append((i, j))
        
        return random.choice(empty_cells) if empty_cells else (0, 0)
    
    def _get_smart_move(self, board: List[List[Optional[str]]], ai_player: str) -> Tuple[int, int]:
        """
        Get a smart move (check for winning moves and blocks)
        """
        # Check for winning move (AI tries to win first)
        winning_move = self._find_winning_move(board, ai_player)
        if winning_move:
            return winning_move
        
        # Check for blocking move (block opponent)
        opponent = 'O' if ai_player == 'X' else 'X'
        blocking_move = self._find_winning_move(board, opponent)
        if blocking_move:
            return blocking_move
        
        # Look for strategic position
        strategic_move = self._find_strategic_move(board, ai_player)
        if strategic_move:
            return strategic_move
        
        # Fall back to random
        return self._get_random_move(board)
    
    def _find_winning_move(self, board: List[List[Optional[str]]], player: str) -> Optional[Tuple[int, int]]:
        """
        Find a move that creates 5 in a row for the player
        """
        for i in range(len(board)):
            for j in range(len(board[0])):
                if board[i][j] is None:
                    # Try this move
                    board[i][j] = player
                    if self._check_win(board, i, j, player):
                        board[i][j] = None
                        return (i, j)
                    board[i][j] = None
        
        return None
    
    def _check_win(self, board: List[List[Optional[str]]], row: int, col: int, player: str) -> bool:
        """
        Check if a move at (row, col) creates 5 in a row
        """
        directions = [
            [(0, 1), (0, -1)],   # horizontal
            [(1, 0), (-1, 0)],   # vertical
            [(1, 1), (-1, -1)],  # diagonal \
            [(1, -1), (-1, 1)]   # diagonal /
        ]
        
        for dir_pair in directions:
            count = 1
            
            for dr, dc in dir_pair:
                r, c = row + dr, col + dc
                while 0 <= r < len(board) and 0 <= c < len(board[0]) and board[r][c] == player:
                    count += 1
                    r += dr
                    c += dc
            
            if count >= 5:
                return True
        
        return False
    
    def _find_strategic_move(
        self,
        board: List[List[Optional[str]]],
        ai_player: str
    ) -> Optional[Tuple[int, int]]:
        """
        Find a strategic move by scoring nearby empty cells.
        Prioritizes moves that extend our lines or disrupt the opponent.
        """
        opponent = 'O' if ai_player == 'X' else 'X'
        candidates = set()

        for i in range(len(board)):
            for j in range(len(board[0])):
                if board[i][j] is None:
                    continue

                for di in [-1, 0, 1]:
                    for dj in [-1, 0, 1]:
                        if di == 0 and dj == 0:
                            continue
                        ni, nj = i + di, j + dj
                        if (0 <= ni < len(board)
                                and 0 <= nj < len(board[0])
                                and board[ni][nj] is None):
                            candidates.add((ni, nj))

        if not candidates:
            return None

        best_move = None
        best_score = float('-inf')
        for row, col in candidates:
            score = self._evaluate_position(board, row, col, ai_player, opponent)
            if score > best_score:
                best_score = score
                best_move = (row, col)

        return best_move
    
    def _evaluate_position(
        self,
        board: List[List[Optional[str]]],
        row: int,
        col: int,
        player: str,
        opponent: str
    ) -> float:
        """Score a potential move for both offense and defense."""
        score = 0.0
        directions = [
            [(0, 1), (0, -1)],
            [(1, 0), (-1, 0)],
            [(1, 1), (-1, -1)],
            [(1, -1), (-1, 1)]
        ]

        for dir_pair in directions:
            score += self._score_line(board, row, col, player, dir_pair)
            # Defensive weight slightly lower than offensive but still important
            score += 0.8 * self._score_line(board, row, col, opponent, dir_pair)

        score += self._adjacent_bonus(board, row, col, player)
        return score

    def _score_line(
        self,
        board: List[List[Optional[str]]],
        row: int,
        col: int,
        player: str,
        dir_pair: List[Tuple[int, int]]
    ) -> float:
        """Score a single line (both directions) for a player."""
        count = 1  # include the hypothetical move
        open_ends = 0

        for dr, dc in dir_pair:
            r, c = row + dr, col + dc
            while 0 <= r < len(board) and 0 <= c < len(board[0]):
                cell = board[r][c]
                if cell == player:
                    count += 1
                    r += dr
                    c += dc
                elif cell is None:
                    open_ends += 1
                    break
                else:
                    break

        return self._line_value(count, open_ends)

    def _line_value(self, count: int, open_ends: int) -> float:
        """Translate a line configuration into a heuristic value."""
        if open_ends == 0:
            return 0.0
        if count >= 5:
            return 10000.0
        if count == 4:
            return 5000.0 if open_ends == 2 else 1200.0
        if count == 3:
            return 400.0 if open_ends == 2 else 120.0
        if count == 2:
            return 80.0 if open_ends == 2 else 30.0
        # Single stone with open space still worthwhile to stay connected
        return 15.0 if open_ends == 2 else 5.0

    def _adjacent_bonus(
        self,
        board: List[List[Optional[str]]],
        row: int,
        col: int,
        player: str
    ) -> float:
        """Give a small bonus for clustering with existing stones."""
        bonus = 0.0
        for di in [-1, 0, 1]:
            for dj in [-1, 0, 1]:
                if di == 0 and dj == 0:
                    continue
                ni, nj = row + di, col + dj
                if 0 <= ni < len(board) and 0 <= nj < len(board[0]):
                    if board[ni][nj] == player:
                        bonus += 8.0
        return bonus

    def _get_minimax_move(self, board: List[List[Optional[str]]], ai_player: str = 'O') -> Tuple[int, int]:
        """
        Get move using minimax algorithm (TODO: implement full minimax)
        """
        # For now, use smart move
        # TODO: Implement proper minimax with alpha-beta pruning
        # Preserve ai_player signature for future implementation
        # default to the provided ai_player
        return self._get_smart_move(board, ai_player)


# Singleton instance
ai_engine = CaroAI()


def get_ai_move(board: List[List[Optional[str]]], difficulty: str = 'medium', ai_player: str = 'O') -> Tuple[int, int]:
    """
    Get AI move for the given board state
    
    Args:
        board: Current board state
        difficulty: AI difficulty level
        ai_player: which symbol the AI is using ('X' or 'O')
    Returns:
        Tuple of (row, col) for the AI move
    """
    ai = CaroAI(difficulty)
    return ai.get_move(board, ai_player)
