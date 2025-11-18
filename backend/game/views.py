from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authentication import TokenAuthentication
from django.shortcuts import get_object_or_404
from users.authentication import CognitoAuthentication
from .models import Match
from ai.engine import get_ai_move
from .serializers import MatchSerializer, MakeMoveSerializer, GameResultSerializer


class GameViewSet(viewsets.ModelViewSet):
    """
    ViewSet for game operations
    """
    queryset = Match.objects.all()
    serializer_class = MatchSerializer
    authentication_classes = [CognitoAuthentication, TokenAuthentication]  # Add Cognito auth!
    permission_classes = [AllowAny]  # Allow both authenticated and anonymous users

    def create(self, request):
        """Create a new game"""
        mode = request.data.get('mode', 'local')
        
        # Debug logging
        print(f"\n🎮 Game Create Request:")
        print(f"  - Mode: {mode}")
        print(f"  - User authenticated: {request.user.is_authenticated}")
        print(f"  - User: {request.user}")
        print(f"  - Auth header: {request.META.get('HTTP_AUTHORIZATION', 'None')[:50]}...")
        
        # Determine black_player based on mode and authentication
        black_player = None
        if mode in ['online', 'ai']:
            # For online/ai modes, require authenticated user
            if request.user.is_authenticated:
                black_player = request.user
                print(f"✅ Using authenticated user: {black_player.username}")
            else:
                print(f"❌ User not authenticated for {mode} mode")
                return Response(
                    {'error': 'Authentication required for online/AI games'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        
        match = Match.objects.create(
            mode=mode,
            black_player=black_player,
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
                
                print(f"🎮 PLAYER WON! Player: {player}, Result: {result}, Winning line: {winning_line}")
                
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
        
        # Use AI engine to compute move
        difficulty = request.data.get('difficulty', 'medium')

        # If board is full, return error
        empty_exists = any(cell is None for r in match.board_state for cell in r)
        if not empty_exists:
            return Response(
                {'error': 'No empty cells'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get AI move (AI should play the current_turn symbol)
        try:
            row, col = get_ai_move(match.board_state, difficulty, ai_player=match.current_turn)
        except Exception as e:
            return Response({'error': f'AI engine error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            # Save AI player before make_move (because current_turn will switch)
            ai_player = match.current_turn
            
            # Apply AI move
            match.make_move(row, col, ai_player)

            # Check for winner (use saved ai_player, not match.current_turn which switched)
            winning_line = match.check_winner(row, col, ai_player)
            if winning_line:
                result = 'black_win' if ai_player == 'X' else 'white_win'
                match.winning_line = winning_line
                match.finish_game(result)
                
                print(f"🎮 AI WON! Player: {ai_player}, Result: {result}, Winning line: {winning_line}")

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
                'match': MatchSerializer(match).data,
                'move': {'row': row, 'col': col}
            })
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

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
        
        # Store old ranks before finishing game
        old_ranks = {}
        if match.mode == 'online' and match.black_player and match.white_player:
            old_ranks['black'] = match.black_player.get_leaderboard_rank()
            old_ranks['white'] = match.white_player.get_leaderboard_rank()
        
        match.finish_game(result)
        
        # Build response with ELO changes and rank changes
        response_data = {
            'status': 'success',
            'match': MatchSerializer(match).data
        }
        
        # Add ELO change data for online matches
        if match.mode == 'online' and match.black_player and match.white_player:
            response_data['elo_changes'] = {
                'black_player': {
                    'user_id': match.black_player.id,
                    'username': match.black_player.username,
                    'old_elo': match.black_elo_before,
                    'new_elo': match.black_player.elo_rating,
                    'change': match.black_elo_change,
                    'old_rank': old_ranks['black'],
                    'new_rank': match.black_player.get_leaderboard_rank()
                },
                'white_player': {
                    'user_id': match.white_player.id,
                    'username': match.white_player.username,
                    'old_elo': match.white_elo_before,
                    'new_elo': match.white_player.elo_rating,
                    'change': match.white_elo_change,
                    'old_rank': old_ranks['white'],
                    'new_rank': match.white_player.get_leaderboard_rank()
                }
            }
        
        return Response(response_data)
    
    @action(detail=True, methods=['post'])
    def forfeit(self, request, pk=None):
        """Forfeit game - player loses by timeout or surrender"""
        match = self.get_object()
        
        # Determine who is forfeiting
        if match.black_player and match.black_player.id == request.user.id:
            result = 'white_win'  # Black forfeits, white wins
        elif match.white_player and match.white_player.id == request.user.id:
            result = 'black_win'  # White forfeits, black wins
        else:
            return Response(
                {'error': 'You are not a player in this match'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Store old ranks before finishing game (only for online mode)
        old_ranks = {}
        if match.mode == 'online' and match.black_player and match.white_player:
            old_ranks['black'] = match.black_player.get_leaderboard_rank()
            old_ranks['white'] = match.white_player.get_leaderboard_rank()
        
        match.finish_game(result)
        
        # Build response
        response_data = {
            'status': 'success',
            'result': result,
            'match': MatchSerializer(match).data
        }
        
        # Add ELO change data for online matches
        if match.mode == 'online' and match.black_player and match.white_player:
            response_data['elo_changes'] = {
                'black_player': {
                    'user_id': match.black_player.id,
                    'username': match.black_player.username,
                    'old_elo': match.black_elo_before,
                    'new_elo': match.black_player.elo_rating,
                    'change': match.black_elo_change,
                    'old_rank': old_ranks['black'],
                    'new_rank': match.black_player.get_leaderboard_rank()
                },
                'white_player': {
                    'user_id': match.white_player.id,
                    'username': match.white_player.username,
                    'old_elo': match.white_elo_before,
                    'new_elo': match.white_player.elo_rating,
                    'change': match.white_elo_change,
                    'old_rank': old_ranks['white'],
                    'new_rank': match.white_player.get_leaderboard_rank()
                }
            }
        
        return Response(response_data)

