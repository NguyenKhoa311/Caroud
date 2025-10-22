from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import User


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        min_length=8
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    email = serializers.EmailField(required=True)
    username = serializers.CharField(required=True, min_length=3, max_length=150)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm']

    def validate_username(self, value):
        """Check if username already exists"""
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists.")
        return value

    def validate_email(self, value):
        """Check if email already exists"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists.")
        return value

    def validate(self, attrs):
        """Validate passwords match and meet requirements"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                "password": "Password fields didn't match."
            })
        
        # Validate password strength
        try:
            validate_password(attrs['password'])
        except ValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})
        
        return attrs

    def create(self, validated_data):
        """Create new user with hashed password"""
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user


class UserLoginSerializer(serializers.Serializer):
    """Serializer for user login"""
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )


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
