from django.conf import settings
from .models import MatchmakingQueue
from users.models import User
from game.models import Match


class Matchmaker:
    """
    ELO-based matchmaking system
    """
    
    @staticmethod
    def find_opponent(player, elo_range=None):
        """
        Find an opponent with similar ELO rating
        """
        if elo_range is None:
            elo_range = settings.MATCHMAKING_ELO_RANGE
        
        # Look for waiting players within ELO range
        potential_opponents = MatchmakingQueue.objects.filter(
            status='waiting',
            elo_rating__gte=player.elo_rating - elo_range,
            elo_rating__lte=player.elo_rating + elo_range
        ).exclude(player=player).order_by('joined_at')
        
        return potential_opponents.first()
    
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
        
        return queue_entry
    
    @staticmethod
    def remove_from_queue(player):
        """
        Remove player from matchmaking queue
        """
        MatchmakingQueue.objects.filter(player=player).delete()
