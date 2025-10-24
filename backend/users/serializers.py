"""
Django REST Framework Serializers for User Authentication and Profile Management

This module contains serializers for:
- User registration with validation
- User login authentication
- User profile data serialization
- User statistics and leaderboard
"""

from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import User


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration endpoint.
    
    Handles:
    - Username validation (min 3 chars, unique)
    - Email validation (valid format, unique)
    - Password strength validation (Django's built-in validators)
    - Password confirmation matching
    - Secure password hashing using create_user()
    
    Fields:
        username: User's unique identifier (3-150 chars)
        email: User's email address (must be unique)
        password: User's password (min 8 chars, write-only)
        password_confirm: Password confirmation field (write-only)
    
    Example Usage:
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            # User created with default ELO 1200
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        min_length=8,
        help_text="Password must be at least 8 characters"
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        help_text="Re-enter password for confirmation"
    )
    email = serializers.EmailField(
        required=True,
        help_text="Valid email address required"
    )
    username = serializers.CharField(
        required=True,
        min_length=3,
        max_length=150,
        help_text="Username between 3-150 characters"
    )

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm']

    def validate_username(self, value):
        """
        Validate username uniqueness.
        
        Args:
            value (str): Username to validate
            
        Returns:
            str: Validated username
            
        Raises:
            ValidationError: If username already exists
        """
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists.")
        return value

    def validate_email(self, value):
        """
        Validate email uniqueness.
        
        Args:
            value (str): Email to validate
            
        Returns:
            str: Validated email
            
        Raises:
            ValidationError: If email already exists
        """
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists.")
        return value

    def validate(self, attrs):
        """
        Validate password match and strength requirements.
        
        Uses Django's built-in password validators to ensure:
        - Passwords match
        - Password is not too common
        - Password is not entirely numeric
        - Password meets minimum length requirement
        
        Args:
            attrs (dict): Dictionary of field values
            
        Returns:
            dict: Validated attributes
            
        Raises:
            ValidationError: If passwords don't match or don't meet requirements
        """
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                "password": "Password fields didn't match."
            })
        
        # Validate password strength using Django validators
        try:
            validate_password(attrs['password'])
        except ValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})
        
        return attrs

    def create(self, validated_data):
        """
        Create new user with hashed password and default values.
        
        Default values set by User model:
        - elo_rating: 1200 (standard starting ELO)
        - wins, losses, draws: 0
        - current_streak, best_streak: 0
        
        Args:
            validated_data (dict): Validated registration data
            
        Returns:
            User: Created user instance with hashed password
            
        Note:
            Uses create_user() to ensure password is properly hashed
        """
        # Remove password_confirm as it's not needed for user creation
        validated_data.pop('password_confirm')
        
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']  # Will be hashed by create_user()
        )
        return user


class UserLoginSerializer(serializers.Serializer):
    """
    Serializer for user login endpoint.
    
    Validates user credentials (email + password).
    Does not perform authentication - that's handled in the view.
    
    Fields:
        email: User's email address
        password: User's password (write-only, not returned in response)
    
    Example Usage:
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']
            # Authenticate in view using authenticate()
    """
    email = serializers.EmailField(
        required=True,
        help_text="User's registered email address"
    )
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
        help_text="User's password"
    )


class UserSerializer(serializers.ModelSerializer):
    """
    General serializer for User model.
    
    Used for:
    - Profile display
    - User data in API responses
    - Profile updates
    
    Computed Fields:
        total_games: Sum of wins + losses + draws
        win_rate: (wins / total_games) * 100, or 0 if no games played
    
    Read-only Fields:
        id, created_at, updated_at: Automatically set by Django
        total_games, win_rate: Computed properties from User model
    
    Example Response:
        {
            "id": 1,
            "username": "player1",
            "email": "player1@example.com",
            "elo_rating": 1250,
            "wins": 10,
            "losses": 5,
            "draws": 2,
            "total_games": 17,
            "win_rate": 58.82,
            "current_streak": 3,
            "best_streak": 5
        }
    """
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
    """
    Serializer for user statistics display.
    
    Focused on game statistics without sensitive data (no email).
    Used in profile pages and stats endpoints.
    
    Fields:
        rank: User's current ranking position (must be added in view)
        total_games: Computed total of all games played
        win_rate: Win percentage (0-100)
    
    Note:
        'rank' field must be annotated in the view queryset.
        It's not a model field but calculated based on ELO ranking.
    
    Example Usage in View:
        users = User.objects.annotate(
            rank=Window(expression=RowNumber(), order_by=F('elo_rating').desc())
        )
        serializer = UserStatsSerializer(users, many=True)
    """
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
    """
    Serializer for leaderboard display.
    
    Minimal fields for public leaderboard.
    Excludes sensitive information like email and user ID.
    
    Fields:
        rank: Position in leaderboard (1 = highest ELO)
        username: Player's display name
        elo_rating: Current ELO rating
        wins, losses, total_games, win_rate: Game statistics
    
    Sorting:
        Default sort by elo_rating (descending) in view
        Rank is calculated using Window function
    
    Example Response:
        [
            {
                "rank": 1,
                "username": "GrandMaster",
                "elo_rating": 1850,
                "wins": 100,
                "losses": 20,
                "total_games": 120,
                "win_rate": 83.33
            },
            ...
        ]
    """
    total_games = serializers.ReadOnlyField()
    win_rate = serializers.ReadOnlyField()
    rank = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = [
            'rank', 'username', 'elo_rating',
            'wins', 'losses', 'total_games', 'win_rate'
        ]
