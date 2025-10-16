from django.db import models
from users.models import User


class MatchmakingQueue(models.Model):
    """Model for matchmaking queue"""
    
    STATUS_CHOICES = [
        ('waiting', 'Waiting'),
        ('matched', 'Matched'),
        ('expired', 'Expired'),
    ]
    
    player = models.OneToOneField(User, on_delete=models.CASCADE, related_name='queue')
    elo_rating = models.IntegerField()
    joined_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='waiting')
    matched_with = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='matched_opponent'
    )
    
    class Meta:
        db_table = 'matchmaking_queue'
        ordering = ['joined_at']
    
    def __str__(self):
        return f"{self.player.username} - {self.status}"
