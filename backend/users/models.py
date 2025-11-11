from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings

# Import friendship and room models
from .friendship_models import FriendRequest, Friendship, FriendInviteLink
from .room_models import GameRoom, RoomParticipant, RoomInvitation


class User(AbstractUser):
    """Custom user model with ELO rating"""
    cognito_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    email = models.EmailField(unique=True)
    elo_rating = models.IntegerField(default=settings.INITIAL_ELO_RATING)
    wins = models.IntegerField(default=0)
    losses = models.IntegerField(default=0)
    draws = models.IntegerField(default=0)
    current_streak = models.IntegerField(default=0)
    best_streak = models.IntegerField(default=0)
    
    # Session management for single login enforcement
    active_session_key = models.CharField(max_length=255, null=True, blank=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'
        ordering = ['-elo_rating']

    def __str__(self):
        return self.username

    @property
    def total_games(self):
        return self.wins + self.losses + self.draws

    @property
    def win_rate(self):
        if self.total_games == 0:
            return 0
        return (self.wins / self.total_games) * 100

    def update_stats(self, result, update_streak=True):
        """
        Update user statistics after a game
        
        Args:
            result: 'win', 'loss', or 'draw'
            update_streak: Whether to update streak (True for online, False for AI/local)
        """
        if result == 'win':
            self.wins += 1
            if update_streak:
                self.current_streak += 1
                if self.current_streak > self.best_streak:
                    self.best_streak = self.current_streak
        elif result == 'loss':
            self.losses += 1
            if update_streak:
                self.current_streak = 0
        elif result == 'draw':
            self.draws += 1
            if update_streak:
                self.current_streak = 0
        self.save()

    def update_elo(self, opponent_elo, result):
        """Update ELO rating based on game result"""
        expected_score = 1 / (1 + 10 ** ((opponent_elo - self.elo_rating) / 400))
        
        if result == 'win':
            actual_score = 1
        elif result == 'loss':
            actual_score = 0
        else:  # draw
            actual_score = 0.5
        
        elo_change = int(settings.ELO_K_FACTOR * (actual_score - expected_score))
        self.elo_rating += elo_change
        self.save()
        
        return elo_change

    def get_leaderboard_rank(self):
        """Get user's current rank on leaderboard (1-indexed)"""
        rank = User.objects.filter(elo_rating__gt=self.elo_rating).count() + 1
        return rank
