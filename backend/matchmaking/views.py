from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import MatchmakingQueue
from .matchmaker import Matchmaker
from game.serializers import MatchSerializer


class MatchmakingViewSet(viewsets.ViewSet):
    """
    ViewSet for matchmaking operations
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def join(self, request):
        """
        Join matchmaking queue
        """
        player = request.user
        
        # Add to queue
        queue_entry = Matchmaker.add_to_queue(player)
        
        # Try to find opponent
        opponent_queue = Matchmaker.find_opponent(player)
        
        if opponent_queue:
            # Create match
            match = Matchmaker.create_match(queue_entry, opponent_queue)
            
            return Response({
                'status': 'matched',
                'match': MatchSerializer(match).data
            }, status=status.HTTP_201_CREATED)
        
        return Response({
            'status': 'waiting',
            'message': 'Searching for opponent...'
        })
    
    @action(detail=False, methods=['post'])
    def leave(self, request):
        """
        Leave matchmaking queue
        """
        Matchmaker.remove_from_queue(request.user)
        
        return Response({
            'status': 'success',
            'message': 'Left matchmaking queue'
        })
    
    @action(detail=False, methods=['get'])
    def status(self, request):
        """
        Check matchmaking status
        """
        try:
            queue_entry = MatchmakingQueue.objects.get(player=request.user)
            
            if queue_entry.status == 'matched':
                # Find the match
                from game.models import Match
                match = Match.objects.filter(
                    status='in_progress'
                ).filter(
                    models.Q(black_player=request.user) | 
                    models.Q(white_player=request.user)
                ).order_by('-created_at').first()
                
                if match:
                    return Response({
                        'status': 'matched',
                        'match': MatchSerializer(match).data
                    })
            
            return Response({
                'status': queue_entry.status,
                'waiting_time': (timezone.now() - queue_entry.joined_at).seconds
            })
            
        except MatchmakingQueue.DoesNotExist:
            return Response({
                'status': 'not_in_queue'
            })
