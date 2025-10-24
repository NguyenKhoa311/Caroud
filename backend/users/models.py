from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import uuid


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


class FriendRequest(models.Model):
    """Model representing a friend request or invite link"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired'),
    ]

    VIA_CHOICES = [
        ('username', 'Username'),
        ('link', 'Invite Link'),
        ('social', 'Social'),
    ]

    id = models.BigAutoField(primary_key=True)
    from_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='friend_requests_sent'
    )
    to_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='friend_requests_received'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    token = models.CharField(max_length=128, unique=True, null=True, blank=True)
    via = models.CharField(max_length=20, choices=VIA_CHOICES, default='username')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'friend_requests'
        ordering = ['-created_at']

    def __str__(self):
        if self.to_user:
            return f"{self.from_user.username} -> {self.to_user.username} ({self.status})"
        return f"{self.from_user.username} -> [invite:{self.token}] ({self.status})"

    def generate_token(self, lifetime_days=7):
        self.token = uuid.uuid4().hex
        self.expires_at = timezone.now() + timedelta(days=lifetime_days)
        self.save()

    def is_expired(self):
        return self.expires_at and timezone.now() > self.expires_at


class Friendship(models.Model):
    """Symmetric friendship relation stored as two rows for simplicity"""
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='friends')
    friend = models.ForeignKey(User, on_delete=models.CASCADE, related_name='friend_of')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'friendships'
        unique_together = ('user', 'friend')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} <-> {self.friend.username}"
