from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from django.db import models
from django.utils import timezone
from users.authentication import CognitoAuthentication
from .models import MatchmakingQueue
from .matchmaker import Matchmaker
from game.serializers import MatchSerializer
import logging

logger = logging.getLogger(__name__)


class MatchmakingViewSet(viewsets.ViewSet):
    """
    ViewSet for matchmaking operations
    """
    # Add authentication classes
    authentication_classes = [CognitoAuthentication, TokenAuthentication]
    permission_classes = []
    
    @action(detail=False, methods=['post'])
    def join(self, request):
        """
        Join matchmaking queue and try to find a match immediately
        """
        # Check if user is authenticated
        if not request.user.is_authenticated:
            return Response({
                'status': 'error',
                'message': 'Authentication required'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        player = request.user
        logger.info(f"Player {player.username} attempting to join matchmaking")
        
        # Check if already in queue
        existing = MatchmakingQueue.objects.filter(player=player).first()
        if existing and existing.status == 'waiting':
            logger.info(f"Player {player.username} already in queue")
            return Response({
                'status': 'already_in_queue',
                'message': 'You are already in matchmaking queue'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Add to queue
        queue_entry = Matchmaker.add_to_queue(player)
        
        # Try to find opponent immediately
        opponent_queue = Matchmaker.find_opponent(player, queue_entry)
        
        if opponent_queue:
            # Create match
            match = Matchmaker.create_match(queue_entry, opponent_queue)
            
            logger.info(f"Instant match created: {player.username} vs {opponent_queue.player.username}")
            
            return Response({
                'status': 'matched',
                'match': MatchSerializer(match).data,
                'opponent': {
                    'username': opponent_queue.player.username,
                    'elo_rating': opponent_queue.player.elo_rating
                }
            }, status=status.HTTP_201_CREATED)
        
        # Get queue stats
        stats = Matchmaker.get_queue_stats()
        
        return Response({
            'status': 'waiting',
            'message': 'Searching for opponent...',
            'queue_stats': stats,
            'your_elo': player.elo_rating
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'])
    def leave(self, request):
        """
        Leave matchmaking queue
        """
        # Check if user is authenticated
        if not request.user.is_authenticated:
            return Response({
                'status': 'error',
                'message': 'Authentication required'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        player = request.user
        deleted = Matchmaker.remove_from_queue(player)
        
        if deleted > 0:
            return Response({
                'status': 'success',
                'message': 'Left matchmaking queue'
            }, status=status.HTTP_200_OK)
        else:
            # Return 200 even if not in queue - idempotent operation
            return Response({
                'status': 'not_in_queue',
                'message': 'You are not in matchmaking queue'
            }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def status(self, request):
        """
        Check matchmaking status (for polling)
        Also cleans up stale entries (older than 5 minutes)
        """
        # Check if user is authenticated
        if not request.user.is_authenticated:
            return Response({
                'status': 'error',
                'message': 'Authentication required'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        player = request.user
        
        # Cleanup stale entries (older than 5 minutes with no activity)
        stale_time = timezone.now() - timezone.timedelta(minutes=5)
        stale_count = MatchmakingQueue.objects.filter(
            status='waiting',
            joined_at__lt=stale_time
        ).delete()[0]
        
        if stale_count > 0:
            logger.info(f"Cleaned up {stale_count} stale matchmaking entries")
        
        try:
            queue_entry = MatchmakingQueue.objects.get(player=player, status='waiting')
            
            # Update last_active timestamp to show player is still here
            queue_entry.last_active = timezone.now()
            queue_entry.save(update_fields=['last_active'])
            
            # Try to find opponent with expanded range
            opponent_queue = Matchmaker.find_opponent(player, queue_entry)
            
            if opponent_queue:
                # Create match
                match = Matchmaker.create_match(queue_entry, opponent_queue)
                
                logger.info(f"Match found during polling: {player.username} vs {opponent_queue.player.username}")
                
                return Response({
                    'status': 'matched',
                    'match': MatchSerializer(match).data,
                    'opponent': {
                        'username': opponent_queue.player.username,
                        'elo_rating': opponent_queue.player.elo_rating
                    }
                }, status=status.HTTP_200_OK)
            
            # Still waiting
            waiting_time = (timezone.now() - queue_entry.joined_at).seconds
            stats = Matchmaker.get_queue_stats()
            
            return Response({
                'status': 'waiting',
                'waiting_time': waiting_time,
                'queue_stats': stats,
                'your_elo': player.elo_rating
            }, status=status.HTTP_200_OK)
            
        except MatchmakingQueue.DoesNotExist:
            # Check if already matched
            from game.models import Match
            recent_match = Match.objects.filter(
                status='in_progress',
                created_at__gte=timezone.now() - timezone.timedelta(minutes=5)
            ).filter(
                models.Q(black_player=player) | models.Q(white_player=player)
            ).order_by('-created_at').first()
            
            if recent_match:
                opponent = recent_match.white_player if recent_match.black_player == player else recent_match.black_player
                return Response({
                    'status': 'matched',
                    'match': MatchSerializer(recent_match).data,
                    'opponent': {
                        'username': opponent.username,
                        'elo_rating': opponent.elo_rating
                    }
                }, status=status.HTTP_200_OK)
            
            return Response({
                'status': 'not_in_queue',
                'message': 'You are not in matchmaking queue'
            }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def queue_info(self, request):
        """
        Get current queue information
        """
        stats = Matchmaker.get_queue_stats()
        
        # Get ELO distribution
        queue_entries = MatchmakingQueue.objects.filter(status='waiting').values_list('elo_rating', flat=True)
        
        return Response({
            'total_waiting': stats['total_waiting'],
            'average_elo': stats['average_elo'],
            'elo_range': {
                'min': min(queue_entries) if queue_entries else 0,
                'max': max(queue_entries) if queue_entries else 0
            }
        }, status=status.HTTP_200_OK)
