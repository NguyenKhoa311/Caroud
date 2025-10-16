from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings


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

    def update_stats(self, result):
        """Update user statistics after a game"""
        if result == 'win':
            self.wins += 1
            self.current_streak += 1
            if self.current_streak > self.best_streak:
                self.best_streak = self.current_streak
        elif result == 'loss':
            self.losses += 1
            self.current_streak = 0
        elif result == 'draw':
            self.draws += 1
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
