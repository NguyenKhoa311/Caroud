from django.db import models
from users.models import User
import json


class Match(models.Model):
    """Model for a Caro game match"""
    
    STATUS_CHOICES = [
        ('waiting', 'Waiting'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('abandoned', 'Abandoned'),
    ]
    
    MODE_CHOICES = [
        ('local', 'Local Multiplayer'),
        ('online', 'Online Match'),
        ('ai', 'vs AI'),
    ]
    
    RESULT_CHOICES = [
        ('black_win', 'Black Wins'),
        ('white_win', 'White Wins'),
        ('draw', 'Draw'),
        (None, 'Ongoing'),
    ]
    
    mode = models.CharField(max_length=10, choices=MODE_CHOICES)
    black_player = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='black_matches'
    )
    white_player = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='white_matches'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='waiting')
    result = models.CharField(max_length=20, choices=RESULT_CHOICES, null=True, blank=True)
    board_state = models.JSONField(default=list)  # Store board as JSON
    move_history = models.JSONField(default=list)  # List of moves
    current_turn = models.CharField(max_length=1, default='X')  # X for black, O for white
    winning_line = models.JSONField(null=True, blank=True)
    black_elo_before = models.IntegerField(null=True, blank=True)
    white_elo_before = models.IntegerField(null=True, blank=True)
    black_elo_change = models.IntegerField(null=True, blank=True)
    white_elo_change = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'matches'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Match {self.id} - {self.mode} - {self.status}"
    
    def initialize_board(self, size=15):
        """Initialize empty board"""
        self.board_state = [[None for _ in range(size)] for _ in range(size)]
        self.save()
    
    def make_move(self, row, col, player):
        """Make a move on the board"""
        if self.board_state[row][col] is not None:
            raise ValueError("Cell already occupied")
        
        self.board_state[row][col] = player
        self.move_history.append({'row': row, 'col': col, 'player': player})
        self.current_turn = 'O' if player == 'X' else 'X'
        self.save()
    
    def check_winner(self, row, col, player):
        """Check if current move resulted in a win"""
        board = self.board_state
        size = len(board)
        directions = [
            [(0, 1), (0, -1)],   # horizontal
            [(1, 0), (-1, 0)],   # vertical
            [(1, 1), (-1, -1)],  # diagonal \
            [(1, -1), (-1, 1)]   # diagonal /
        ]
        
        for dir_pair in directions:
            line = [[row, col]]
            
            # Check in first direction
            for dr, dc in [dir_pair[0]]:
                r, c = row + dr, col + dc
                while 0 <= r < size and 0 <= c < size and board[r][c] == player:
                    line.append([r, c])
                    r += dr
                    c += dc
            
            # Check in opposite direction
            for dr, dc in [dir_pair[1]]:
                r, c = row + dr, col + dc
                while 0 <= r < size and 0 <= c < size and board[r][c] == player:
                    line.append([r, c])
                    r += dr
                    c += dc
            
            if len(line) >= 5:
                return line
        
        return None
    
    def finish_game(self, result):
        """Finish the game and update player stats"""
        self.status = 'completed'
        self.result = result
        
        # Update player stats and ELO if it's an online match
        if self.mode == 'online' and self.black_player and self.white_player:
            self.black_elo_before = self.black_player.elo_rating
            self.white_elo_before = self.white_player.elo_rating
            
            if result == 'black_win':
                self.black_elo_change = self.black_player.update_elo(
                    self.white_player.elo_rating, 'win'
                )
                self.white_elo_change = self.white_player.update_elo(
                    self.black_player.elo_rating, 'loss'
                )
                self.black_player.update_stats('win', update_streak=True)
                self.white_player.update_stats('loss', update_streak=True)
            elif result == 'white_win':
                self.black_elo_change = self.black_player.update_elo(
                    self.white_player.elo_rating, 'loss'
                )
                self.white_elo_change = self.white_player.update_elo(
                    self.black_player.elo_rating, 'win'
                )
                self.black_player.update_stats('loss', update_streak=True)
                self.white_player.update_stats('win', update_streak=True)
            elif result == 'draw':
                self.black_elo_change = self.black_player.update_elo(
                    self.white_player.elo_rating, 'draw'
                )
                self.white_elo_change = self.white_player.update_elo(
                    self.black_player.elo_rating, 'draw'
                )
                self.black_player.update_stats('draw', update_streak=True)
                self.white_player.update_stats('draw', update_streak=True)
        
        # Update player stats for AI mode (no ELO changes, just win/loss/draw count, NO streak)
        elif self.mode == 'ai' and self.black_player:
            if result == 'black_win':
                self.black_player.update_stats('win', update_streak=False)
            elif result == 'white_win':
                self.black_player.update_stats('loss', update_streak=False)
            elif result == 'draw':
                self.black_player.update_stats('draw', update_streak=False)
        
        self.save()
        
        # Auto-delete room if game was started from a room
        self._cleanup_room_after_game()
    
    def _cleanup_room_after_game(self):
        """Delete the room after game finishes (for friend matches)"""
        try:
            from users.room_models import GameRoom
            
            # Find room associated with this match
            room = GameRoom.objects.filter(game=self).first()
            if room:
                # Delete the room since game is finished
                room.delete()
                print(f"✅ Room {room.code} deleted after game {self.id} finished")
        except Exception as e:
            print(f"⚠️ Error cleaning up room after game: {e}")
