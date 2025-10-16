from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    total_games = serializers.ReadOnlyField()
    win_rate = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'elo_rating',
            'wins', 'losses', 'draws', 'total_games',
            'win_rate', 'current_streak', 'best_streak',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserStatsSerializer(serializers.ModelSerializer):
    """Serializer for user statistics"""
    total_games = serializers.ReadOnlyField()
    win_rate = serializers.ReadOnlyField()
    rank = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'elo_rating', 'rank',
            'wins', 'losses', 'draws', 'total_games',
            'win_rate', 'current_streak', 'best_streak'
        ]


class LeaderboardSerializer(serializers.ModelSerializer):
    """Serializer for leaderboard"""
    total_games = serializers.ReadOnlyField()
    win_rate = serializers.ReadOnlyField()
    rank = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = [
            'rank', 'username', 'elo_rating',
            'wins', 'losses', 'total_games', 'win_rate'
        ]
