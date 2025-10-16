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
    
    def get_move(self, board: List[List[Optional[str]]]) -> Tuple[int, int]:
        """
        Get AI move based on current board state
        
        Args:
            board: 2D list representing the game board
            
        Returns:
            Tuple of (row, col) for the move
        """
        if self.difficulty == 'easy':
            return self._get_random_move(board)
        elif self.difficulty == 'medium':
            return self._get_smart_move(board)
        else:  # hard
            return self._get_minimax_move(board)
    
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
    
    def _get_smart_move(self, board: List[List[Optional[str]]]) -> Tuple[int, int]:
        """
        Get a smart move (check for winning moves and blocks)
        """
        # Check for winning move
        winning_move = self._find_winning_move(board, 'O')
        if winning_move:
            return winning_move
        
        # Check for blocking move
        blocking_move = self._find_winning_move(board, 'X')
        if blocking_move:
            return blocking_move
        
        # Look for strategic position
        strategic_move = self._find_strategic_move(board)
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
    
    def _find_strategic_move(self, board: List[List[Optional[str]]]) -> Optional[Tuple[int, int]]:
        """
        Find a strategic move (near existing stones)
        """
        # Look for cells adjacent to existing stones
        candidates = []
        
        for i in range(len(board)):
            for j in range(len(board[0])):
                if board[i][j] is not None:
                    # Check adjacent cells
                    for di in [-1, 0, 1]:
                        for dj in [-1, 0, 1]:
                            ni, nj = i + di, j + dj
                            if (0 <= ni < len(board) and 
                                0 <= nj < len(board[0]) and 
                                board[ni][nj] is None):
                                candidates.append((ni, nj))
        
        return random.choice(candidates) if candidates else None
    
    def _get_minimax_move(self, board: List[List[Optional[str]]]) -> Tuple[int, int]:
        """
        Get move using minimax algorithm (TODO: implement full minimax)
        """
        # For now, use smart move
        # TODO: Implement proper minimax with alpha-beta pruning
        return self._get_smart_move(board)


# Singleton instance
ai_engine = CaroAI()


def get_ai_move(board: List[List[Optional[str]]], difficulty: str = 'medium') -> Tuple[int, int]:
    """
    Get AI move for the given board state
    
    Args:
        board: Current board state
        difficulty: AI difficulty level
        
    Returns:
        Tuple of (row, col) for the AI move
    """
    ai = CaroAI(difficulty)
    return ai.get_move(board)
