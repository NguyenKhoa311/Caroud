from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from .models import Match
from .serializers import MatchSerializer, MakeMoveSerializer, GameResultSerializer


class GameViewSet(viewsets.ModelViewSet):
    """
    ViewSet for game operations
    """
    queryset = Match.objects.all()
    serializer_class = MatchSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def create(self, request):
        """Create a new game"""
        mode = request.data.get('mode', 'local')
        
        match = Match.objects.create(
            mode=mode,
            black_player=request.user if mode in ['online', 'ai'] else None,
            status='waiting' if mode == 'online' else 'in_progress'
        )
        match.initialize_board()
        
        serializer = self.get_serializer(match)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def move(self, request, pk=None):
        """Make a move in the game"""
        match = self.get_object()
        serializer = MakeMoveSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        row = serializer.validated_data['row']
        col = serializer.validated_data['col']
        player = match.current_turn
        
        try:
            # Make the move
            match.make_move(row, col, player)
            
            # Check for winner
            winning_line = match.check_winner(row, col, player)
            if winning_line:
                result = 'black_win' if player == 'X' else 'white_win'
                match.winning_line = winning_line
                match.finish_game(result)
                
                return Response({
                    'status': 'game_over',
                    'result': result,
                    'winning_line': winning_line,
                    'match': MatchSerializer(match).data
                })
            
            # Check for draw
            is_full = all(all(cell is not None for cell in row) for row in match.board_state)
            if is_full:
                match.finish_game('draw')
                return Response({
                    'status': 'game_over',
                    'result': 'draw',
                    'match': MatchSerializer(match).data
                })
            
            return Response({
                'status': 'success',
                'match': MatchSerializer(match).data
            })
            
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def ai_move(self, request, pk=None):
        """Get AI move"""
        match = self.get_object()
        
        if match.mode != 'ai':
            return Response(
                {'error': 'This is not an AI game'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # TODO: Implement AI logic
        # For now, return random empty cell
        import random
        empty_cells = []
        for i, row in enumerate(match.board_state):
            for j, cell in enumerate(row):
                if cell is None:
                    empty_cells.append((i, j))
        
        if not empty_cells:
            return Response(
                {'error': 'No empty cells'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        row, col = random.choice(empty_cells)
        
        return Response({
            'row': row,
            'col': col
        })

    @action(detail=True, methods=['post'])
    def result(self, request, pk=None):
        """Submit game result"""
        match = self.get_object()
        serializer = GameResultSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        result = serializer.validated_data['result']
        winning_line = serializer.validated_data.get('winning_line')
        
        if winning_line:
            match.winning_line = winning_line
        
        match.finish_game(result)
        
        return Response({
            'status': 'success',
            'match': MatchSerializer(match).data
        })
