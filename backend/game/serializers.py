from rest_framework import serializers
from .models import Match
from users.serializers import UserSerializer


class MatchSerializer(serializers.ModelSerializer):
    """Serializer for Match model"""
    black_player_detail = UserSerializer(source='black_player', read_only=True)
    white_player_detail = UserSerializer(source='white_player', read_only=True)
    
    # Add computed fields for easier frontend consumption
    winner = serializers.SerializerMethodField()
    loser = serializers.SerializerMethodField()

    class Meta:
        model = Match
        fields = [
            'id', 'mode', 'status', 'result',
            'black_player', 'white_player',
            'black_player_detail', 'white_player_detail',
            'winner', 'loser',
            'board_state', 'move_history', 'current_turn',
            'winning_line', 'black_elo_before', 'white_elo_before',
            'black_elo_change', 'white_elo_change',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_winner(self, obj):
        """Get winner user ID based on result"""
        if obj.result == 'black_win':
            return obj.black_player.id if obj.black_player else None
        elif obj.result == 'white_win':
            return obj.white_player.id if obj.white_player else None
        return None
    
    def get_loser(self, obj):
        """Get loser user ID based on result"""
        if obj.result == 'black_win':
            return obj.white_player.id if obj.white_player else None
        elif obj.result == 'white_win':
            return obj.black_player.id if obj.black_player else None
        return None


class MakeMoveSerializer(serializers.Serializer):
    """Serializer for making a move"""
    row = serializers.IntegerField(min_value=0, max_value=14)
    col = serializers.IntegerField(min_value=0, max_value=14)


class GameResultSerializer(serializers.Serializer):
    """Serializer for game result"""
    result = serializers.ChoiceField(choices=['black_win', 'white_win', 'draw'])
    winning_line = serializers.ListField(
        child=serializers.ListField(
            child=serializers.IntegerField(),
            min_length=2,
            max_length=2
        ),
        required=False
    )
