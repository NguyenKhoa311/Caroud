from django.conf import settings
from django.utils import timezone
from django.db import models
from datetime import timedelta
from .models import MatchmakingQueue
from users.models import User
from game.models import Match
import logging

logger = logging.getLogger(__name__)


class Matchmaker:
    """
    ELO-based matchmaking system with dynamic range expansion
    """
    
    @staticmethod
    def find_opponent(player, queue_entry=None, elo_range=None):
        """
        Find an opponent with similar ELO rating.
        Expands ELO range based on waiting time for better match rate.
        """
        if elo_range is None:
            elo_range = settings.MATCHMAKING_ELO_RANGE
        
        # If queue_entry provided, expand range based on waiting time
        if queue_entry:
            waiting_seconds = (timezone.now() - queue_entry.joined_at).seconds
            # Expand range by 10 every 10 seconds, max 500
            time_bonus = min((waiting_seconds // 10) * 10, 500)
            elo_range = elo_range + time_bonus
            logger.info(f"Player {player.username} waiting {waiting_seconds}s, ELO range: {elo_range}")
        
        # Look for waiting players within ELO range
        potential_opponents = MatchmakingQueue.objects.filter(
            status='waiting',
            elo_rating__gte=player.elo_rating - elo_range,
            elo_rating__lte=player.elo_rating + elo_range
        ).exclude(player=player).order_by('joined_at')
        
        if potential_opponents.exists():
            opponent = potential_opponents.first()
            logger.info(f"Match found: {player.username} (ELO: {player.elo_rating}) vs {opponent.player.username} (ELO: {opponent.elo_rating})")
            return opponent
        
        return None
    
    @staticmethod
    def create_match(player1_queue, player2_queue):
        """
        Create a match between two players
        """
        import random
        
        # Randomly assign black and white
        if random.choice([True, False]):
            black_player = player1_queue.player
            white_player = player2_queue.player
        else:
            black_player = player2_queue.player
            white_player = player1_queue.player
        
        logger.info(f"Creating match: {black_player.username} (Black) vs {white_player.username} (White)")
        
        # Create match
        match = Match.objects.create(
            mode='online',
            black_player=black_player,
            white_player=white_player,
            status='in_progress',
            black_elo_before=black_player.elo_rating,
            white_elo_before=white_player.elo_rating
        )
        match.initialize_board()
        
        # Update queue status
        player1_queue.status = 'matched'
        player1_queue.matched_with = player2_queue.player
        player1_queue.save()
        
        player2_queue.status = 'matched'
        player2_queue.matched_with = player1_queue.player
        player2_queue.save()
        
        logger.info(f"Match created successfully: ID={match.id}")
        
        return match
    
    @staticmethod
    def add_to_queue(player):
        """
        Add player to matchmaking queue
        """
        # Remove from queue if already in it
        MatchmakingQueue.objects.filter(player=player).delete()
        
        # Add to queue
        queue_entry = MatchmakingQueue.objects.create(
            player=player,
            elo_rating=player.elo_rating
        )
        
        logger.info(f"Player {player.username} (ELO: {player.elo_rating}) joined matchmaking queue")
        
        return queue_entry
    
    @staticmethod
    def remove_from_queue(player):
        """
        Remove player from matchmaking queue
        """
        deleted_count = MatchmakingQueue.objects.filter(player=player).delete()[0]
        if deleted_count > 0:
            logger.info(f"Player {player.username} left matchmaking queue")
        return deleted_count
    
    @staticmethod
    def get_queue_stats():
        """
        Get matchmaking queue statistics
        """
        total_waiting = MatchmakingQueue.objects.filter(status='waiting').count()
        avg_elo = MatchmakingQueue.objects.filter(status='waiting').aggregate(
            models.Avg('elo_rating')
        )['elo_rating__avg'] or 0
        
        return {
            'total_waiting': total_waiting,
            'average_elo': round(avg_elo, 0)
        }
    
    @staticmethod
    def clean_expired_queue(expiry_minutes=5):
        """
        Remove expired queue entries (players who joined but didn't cancel)
        """
        expiry_time = timezone.now() - timedelta(minutes=expiry_minutes)
        expired = MatchmakingQueue.objects.filter(
            status='waiting',
            joined_at__lt=expiry_time
        )
        count = expired.count()
        if count > 0:
            expired.update(status='expired')
            logger.info(f"Cleaned {count} expired queue entries")
        return count
