"""
Redis-based Matchmaking ViewSet
Uses Redis for real-time queue, PostgreSQL for match history
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .redis_queue import RedisMatchmakingQueue
from .models import MatchmakingQueue
from game.models import Match
from game.serializers import MatchSerializer
import logging

logger = logging.getLogger(__name__)


class RedisMatchmakingViewSet(viewsets.ViewSet):
    """
    Redis-powered matchmaking with PostgreSQL backup
    """
    authentication_classes = []
    permission_classes = []
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        try:
            self.redis_queue = RedisMatchmakingQueue()
        except Exception as e:
            logger.error(f"❌ Failed to initialize Redis queue: {e}")
            self.redis_queue = None
    
    @action(detail=False, methods=['post'])
    def join(self, request):
        """
        Join matchmaking queue using Redis
        
        POST /api/matchmaking/join/
        Headers: Authorization: Token <token>
        
        Returns:
            - status: 'matched' if instant match found
            - status: 'searching' if added to queue
        """
        # Extract user from token
        token = request.headers.get('Authorization', '').replace('Token ', '')
        
        if not token:
            return Response({
                'status': 'error',
                'message': 'Authentication required'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            from rest_framework.authtoken.models import Token as AuthToken
            auth_token = AuthToken.objects.get(key=token)
            player = auth_token.user
        except AuthToken.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Invalid token'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        logger.info(f"🎮 {player.username} joining matchmaking (ELO: {player.elo_rating})")
        
        # Fallback to PostgreSQL if Redis unavailable
        if not self.redis_queue:
            return self._fallback_join(player)
        
        try:
            # Add to Redis queue
            success = self.redis_queue.join_queue(
                user_id=player.id,
                elo_rating=player.elo_rating,
                user_data={'username': player.username}
            )
            
            if not success:
                return Response({
                    'status': 'error',
                    'message': 'Failed to join queue'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Also add to PostgreSQL (backup)
            queue_entry, created = MatchmakingQueue.objects.get_or_create(
                player=player,
                defaults={
                    'status': 'waiting',
                    'last_active': timezone.now()
                }
            )
            
            if not created:
                queue_entry.status = 'waiting'
                queue_entry.last_active = timezone.now()
                queue_entry.save()
            
            # Try to find match immediately
            opponent = self.redis_queue.find_match(
                user_id=player.id,
                elo_rating=player.elo_rating
            )
            
            if opponent:
                # Match found! Create game
                match = self._create_match(player, opponent)
                
                if match:
                    logger.info(f"✅ Instant match: {player.username} vs {opponent.get('username')}")
                    
                    return Response({
                        'status': 'matched',
                        'match': MatchSerializer(match).data,
                        'opponent': {
                            'username': opponent.get('username'),
                            'elo_rating': opponent.get('elo_rating')
                        }
                    }, status=status.HTTP_201_CREATED)
            
            # No match yet, return queue status
            queue_stats = self.redis_queue.get_queue_stats()
            position = self.redis_queue.get_queue_position(player.id)
            
            return Response({
                'status': 'searching',
                'message': 'Searching for opponent...',
                'queue_position': position if position is not None else 0,
                'queue_size': queue_stats.get('current_size', 0),
                'elo_range': f"{player.elo_rating - 100} - {player.elo_rating + 100}"
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"❌ Error in Redis matchmaking: {e}")
            return self._fallback_join(player)
    
    @action(detail=False, methods=['post'])
    def leave(self, request):
        """
        Leave matchmaking queue
        
        POST /api/matchmaking/leave/
        Headers: Authorization: Token <token>
        """
        token = request.headers.get('Authorization', '').replace('Token ', '')
        
        if not token:
            return Response({
                'status': 'error',
                'message': 'Authentication required'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            from rest_framework.authtoken.models import Token as AuthToken
            auth_token = AuthToken.objects.get(key=token)
            player = auth_token.user
        except AuthToken.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Invalid token'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        logger.info(f"🚪 {player.username} leaving matchmaking")
        
        # Remove from Redis
        if self.redis_queue:
            self.redis_queue.leave_queue(player.id)
        
        # Remove from PostgreSQL
        MatchmakingQueue.objects.filter(player=player).delete()
        
        return Response({
            'status': 'success',
            'message': 'Left matchmaking queue'
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def status(self, request):
        """
        Check matchmaking status (poll endpoint)
        
        GET /api/matchmaking/status/
        Headers: Authorization: Token <token>
        
        Returns:
            - status: 'searching' if still waiting
            - status: 'matched' if opponent found
        """
        token = request.headers.get('Authorization', '').replace('Token ', '')
        
        if not token:
            return Response({
                'status': 'error',
                'message': 'Authentication required'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            from rest_framework.authtoken.models import Token as AuthToken
            auth_token = AuthToken.objects.get(key=token)
            player = auth_token.user
        except AuthToken.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Invalid token'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if not self.redis_queue:
            return self._fallback_status(player)
        
        try:
            # Update heartbeat
            self.redis_queue.update_heartbeat(player.id)
            
            # Also update PostgreSQL
            MatchmakingQueue.objects.filter(player=player).update(
                last_active=timezone.now()
            )
            
            # Try to find match
            opponent = self.redis_queue.find_match(
                user_id=player.id,
                elo_rating=player.elo_rating
            )
            
            if opponent:
                # Match found!
                match = self._create_match(player, opponent)
                
                if match:
                    logger.info(f"✅ Match found: {player.username} vs {opponent.get('username')}")
                    
                    return Response({
                        'status': 'matched',
                        'match': MatchSerializer(match).data,
                        'opponent': {
                            'username': opponent.get('username'),
                            'elo_rating': opponent.get('elo_rating')
                        }
                    }, status=status.HTTP_200_OK)
            
            # Still searching
            queue_stats = self.redis_queue.get_queue_stats()
            position = self.redis_queue.get_queue_position(player.id)
            
            return Response({
                'status': 'searching',
                'queue_position': position if position is not None else 0,
                'queue_size': queue_stats.get('current_size', 0),
                'elo_range': f"{player.elo_rating - 100} - {player.elo_rating + 100}"
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"❌ Error checking status: {e}")
            return self._fallback_status(player)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get matchmaking queue statistics
        
        GET /api/matchmaking/stats/
        
        Returns queue size, ELO distribution, etc.
        """
        if not self.redis_queue:
            return Response({
                'status': 'error',
                'message': 'Redis unavailable'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        try:
            stats = self.redis_queue.get_queue_stats()
            
            return Response({
                'status': 'success',
                'stats': stats
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"❌ Error getting stats: {e}")
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _create_match(self, player, opponent_data):
        """
        Create a Match in database when two players matched
        
        Args:
            player: User model instance
            opponent_data: Dict with opponent info from Redis
            
        Returns:
            Match instance or None
        """
        try:
            from users.models import User
            
            # Get opponent User object
            opponent_id = opponent_data.get('user_id')
            opponent = User.objects.get(id=opponent_id)
            
            # Create match in database
            match = Match.objects.create(
                black_player=player,
                white_player=opponent,
                status='in_progress'
            )
            
            # Update queue entries in PostgreSQL
            MatchmakingQueue.objects.filter(
                player__in=[player, opponent]
            ).update(status='matched')
            
            # Create match record in Redis (optional)
            if self.redis_queue:
                self.redis_queue.create_match(player.id, opponent_id)
            
            logger.info(f"🎮 Match created: ID={match.id}")
            return match
            
        except Exception as e:
            logger.error(f"❌ Error creating match: {e}")
            return None
    
    def _fallback_join(self, player):
        """Fallback to PostgreSQL-based matchmaking"""
        logger.warning(f"⚠️ Using PostgreSQL fallback for {player.username}")
        
        from .matchmaker import Matchmaker
        
        queue_entry = Matchmaker.add_to_queue(player)
        opponent_queue = Matchmaker.find_opponent(player, queue_entry)
        
        if opponent_queue:
            match = Matchmaker.create_match(queue_entry, opponent_queue)
            
            return Response({
                'status': 'matched',
                'match': MatchSerializer(match).data,
                'opponent': {
                    'username': opponent_queue.player.username,
                    'elo_rating': opponent_queue.player.elo_rating
                }
            }, status=status.HTTP_201_CREATED)
        
        stats = Matchmaker.get_queue_stats()
        
        return Response({
            'status': 'searching',
            'message': 'Searching for opponent...',
            'queue_size': stats['total_waiting']
        }, status=status.HTTP_200_OK)
    
    def _fallback_status(self, player):
        """Fallback status check using PostgreSQL"""
        from .matchmaker import Matchmaker
        
        queue_entry = MatchmakingQueue.objects.filter(
            player=player,
            status='waiting'
        ).first()
        
        if not queue_entry:
            return Response({
                'status': 'not_in_queue',
                'message': 'Not in matchmaking queue'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Update last_active
        queue_entry.last_active = timezone.now()
        queue_entry.save()
        
        # Try to find match
        opponent_queue = Matchmaker.find_opponent(player, queue_entry)
        
        if opponent_queue:
            match = Matchmaker.create_match(queue_entry, opponent_queue)
            
            return Response({
                'status': 'matched',
                'match': MatchSerializer(match).data,
                'opponent': {
                    'username': opponent_queue.player.username,
                    'elo_rating': opponent_queue.player.elo_rating
                }
            }, status=status.HTTP_200_OK)
        
        stats = Matchmaker.get_queue_stats()
        
        return Response({
            'status': 'searching',
            'queue_size': stats['total_waiting']
        }, status=status.HTTP_200_OK)
