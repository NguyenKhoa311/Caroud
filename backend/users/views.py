"""
Django REST Framework Views for User Management and Authentication

This module provides API endpoints for:
- User registration with email/password
- User login with token generation
- User profile and statistics
- Match history per user
- Global leaderboard rankings

Authentication:
- Token-based authentication using DRF's Token model
- Tokens are generated on registration/login
- Include 'Authorization: Token <key>' header for authenticated requests
"""

from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.db.models import Q
from .models import User
from .serializers import (
    UserSerializer, UserStatsSerializer, LeaderboardSerializer,
    UserRegistrationSerializer, UserLoginSerializer
)
from game.models import Match
from game.serializers import MatchSerializer


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for user CRUD operations and custom actions.
    
    Endpoints:
        GET    /api/users/          - List all users
        POST   /api/users/          - Create user (use /register/ instead)
        GET    /api/users/{id}/     - Get user details
        PUT    /api/users/{id}/     - Update user (authenticated)
        DELETE /api/users/{id}/     - Delete user (authenticated)
        GET    /api/users/profile/  - Get current user profile (authenticated)
        GET    /api/users/{id}/stats/ - Get user statistics
        GET    /api/users/{id}/matches/ - Get user match history
    
    Permissions:
        - list, retrieve, stats: Anyone can view
        - create, update, delete: Authenticated users only
        - profile: Authenticated users only (their own profile)
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self):
        """
        Set permissions based on action.
        
        Public actions: list, retrieve, stats
        Protected actions: create, update, delete, profile
        
        Returns:
            list: List of permission class instances
        """
        if self.action in ['list', 'retrieve', 'stats']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    @action(detail=False, methods=['get'])
    def profile(self, request):
        """
        Get current authenticated user's profile.
        
        Endpoint: GET /api/users/profile/
        Authentication: Required
        
        Returns:
            Response: Full user profile with stats
            
        Example:
            GET /api/users/profile/
            Headers: Authorization: Token abc123...
            
            Response 200:
            {
                "id": 1,
                "username": "player1",
                "email": "player1@example.com",
                "elo_rating": 1250,
                "wins": 10,
                "losses": 5,
                ...
            }
        """
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """
        Get statistics for a specific user.
        
        Endpoint: GET /api/users/{id}/stats/
        Authentication: Not required (public)
        
        Args:
            pk: User ID
            
        Returns:
            Response: User stats including calculated rank
            
        Rank Calculation:
            Rank = (Number of users with higher ELO) + 1
            
        Example:
            GET /api/users/5/stats/
            
            Response 200:
            {
                "id": 5,
                "username": "player1",
                "elo_rating": 1300,
                "rank": 42,
                "wins": 15,
                "losses": 10,
                "total_games": 25,
                "win_rate": 60.0,
                ...
            }
        """
        user = self.get_object()
        
        # Calculate user's rank based on ELO
        # Count how many users have higher ELO, then add 1
        rank = User.objects.filter(elo_rating__gt=user.elo_rating).count() + 1
        
        serializer = UserStatsSerializer(user)
        data = serializer.data
        data['rank'] = rank
        
        return Response(data)

    @action(detail=True, methods=['get'])
    def matches(self, request, pk=None):
        """
        Get match history for a specific user.
        
        Endpoint: GET /api/users/{id}/matches/?limit=10
        Authentication: Not required (public)
        
        Args:
            pk: User ID
            
        Query Parameters:
            limit (int): Number of recent matches to return (default: 10)
            
        Returns:
            Response: List of completed matches where user participated
            
        Note:
            - Only returns completed matches (status='completed')
            - Sorted by most recent first (updated_at DESC)
            - User can be either black_player or white_player
            
        Example:
            GET /api/users/5/matches/?limit=20
            
            Response 200:
            [
                {
                    "id": 100,
                    "black_player": 5,
                    "white_player": 8,
                    "winner": 5,
                    "status": "completed",
                    ...
                },
                ...
            ]
        """
        user = self.get_object()
        limit = int(request.query_params.get('limit', 10))
        
        # Get matches where user is either black or white player
        matches = Match.objects.filter(
            Q(black_player=user) | Q(white_player=user),
            status='completed'
        ).order_by('-updated_at')[:limit]
        
        serializer = MatchSerializer(matches, many=True)
        return Response(serializer.data)


class UserRegistrationView(generics.CreateAPIView):
    """
    API endpoint for new user registration.
    
    Endpoint: POST /api/users/register/
    Authentication: Not required (public)
    
    Request Body:
        {
            "username": "string (3-150 chars)",
            "email": "string (valid email)",
            "password": "string (min 8 chars)",
            "password_confirm": "string (must match password)"
        }
    
    Validation:
        - Username: Unique, 3-150 characters
        - Email: Unique, valid email format
        - Password: Min 8 chars, not too common, not entirely numeric
        - password_confirm: Must match password
    
    On Success:
        - Creates new user with default values (ELO: 1200, wins/losses: 0)
        - Generates authentication token
        - Returns user data and token
    
    Response 201 (Success):
        {
            "user": {
                "id": 10,
                "username": "newplayer",
                "email": "new@example.com",
                "elo_rating": 1200,
                "wins": 0,
                ...
            },
            "token": "abc123def456...",
            "message": "Registration successful!"
        }
    
    Response 400 (Validation Error):
        {
            "username": ["Username already exists."],
            "email": ["Email already exists."],
            "password": ["This password is too common."]
        }
    """
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        """
        Handle user registration request.
        
        Steps:
        1. Validate input data using UserRegistrationSerializer
        2. Create new user with hashed password
        3. Generate authentication token
        4. Return user data + token
        
        Args:
            request: HTTP request with registration data
            
        Returns:
            Response: User data and token on success, errors on failure
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Create authentication token for the new user
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'user': UserSerializer(user).data,
            'token': token.key,
            'message': 'Registration successful!'
        }, status=status.HTTP_201_CREATED)


class UserLoginView(generics.GenericAPIView):
    """
    API endpoint for user login with email/password.
    
    Endpoint: POST /api/users/login/
    Authentication: Not required (public)
    
    Request Body:
        {
            "email": "string (valid email)",
            "password": "string"
        }
    
    Authentication Process:
        1. Validate email format
        2. Find user by email
        3. Authenticate using Django's authenticate() function
        4. Generate/retrieve authentication token
        5. Return user data and token
    
    Response 200 (Success):
        {
            "user": {
                "id": 5,
                "username": "player1",
                "email": "player1@example.com",
                ...
            },
            "token": "abc123def456...",
            "message": "Login successful!"
        }
    
    Response 401 (Failed):
        {
            "error": "Invalid email or password."
        }
    
    Note:
        - Error message is intentionally generic for security
        - Same error for "user not found" and "wrong password"
        - Token is persistent (doesn't expire unless manually deleted)
    """
    serializer_class = UserLoginSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        """
        Handle user login request.
        
        Steps:
        1. Validate email and password format
        2. Look up user by email
        3. Authenticate credentials
        4. Generate/get existing token
        5. Return user data + token
        
        Args:
            request: HTTP request with login credentials
            
        Returns:
            Response: User data and token on success, error on failure
            
        Security Notes:
            - Password is validated via Django's authenticate()
            - Password is never returned in response (write_only field)
            - Generic error message to prevent user enumeration
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        
        # Look up user by email
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Return generic error to prevent email enumeration
            return Response({
                'error': 'Invalid email or password.'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Authenticate using Django's authenticate function
        # Note: authenticate() requires username, so we pass user.username
        user = authenticate(username=user.username, password=password)
        
        if user is None:
            # Password incorrect
            return Response({
                'error': 'Invalid email or password.'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Get existing token or create new one
        # Tokens don't expire by default in DRF
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'user': UserSerializer(user).data,
            'token': token.key,
            'message': 'Login successful!'
        }, status=status.HTTP_200_OK)


class LeaderboardViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for global game leaderboard.
    
    Endpoints:
        GET /api/leaderboard/ - Get ranked list of top players
    
    Authentication: Not required (public)
    
    Query Parameters:
        limit (int): Number of top players to return (default: 50, max recommended: 100)
        filter (str): Time period filter - 'all', 'week', 'month' (currently only 'all' works)
    
    Sorting:
        - Primary: ELO rating (descending)
        - Only includes users with at least 1 win
    
    Response Format:
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
    
    Example:
        GET /api/leaderboard/?limit=10
        
    TODO:
        - Implement time-based filtering ('week', 'month')
        - Add pagination for large leaderboards
        - Cache results for performance
    """
    serializer_class = LeaderboardSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        """
        Get filtered and sorted queryset for leaderboard.
        
        Filters:
            - Users with at least 1 win (excludes inactive players)
        
        Query Parameters:
            - filter: 'all', 'week', 'month' (only 'all' implemented)
            - limit: Number of results (default: 50)
        
        Returns:
            QuerySet: Ordered by ELO rating (descending), limited
            
        TODO:
            Implement time-based filters:
            - 'week': Games played in last 7 days
            - 'month': Games played in last 30 days
            This requires tracking game timestamps and recalculating stats
        """
        queryset = User.objects.filter(
            wins__gt=0  # Only show players who have won at least once
        ).order_by('-elo_rating')
        
        filter_type = self.request.query_params.get('filter', 'all')
        limit = int(self.request.query_params.get('limit', 50))
        
        # TODO: Implement time-based filtering for 'week' and 'month'
        # This would require:
        # 1. Add 'last_game_date' field to User model
        # 2. Update field after each game
        # 3. Filter by date range here
        
        return queryset[:limit]

    def list(self, request, *args, **kwargs):
        """
        List top players with calculated rank numbers.
        
        Rank Calculation:
            Rank is calculated based on position in sorted list
            Rank 1 = highest ELO rating
        
        Args:
            request: HTTP request
            
        Returns:
            Response: List of users with rank field added
            
        Note:
            - Rank is calculated dynamically, not stored in database
            - Ties in ELO rating get sequential ranks (1, 2, 3...)
            - For true tie handling, implement Olympic ranking
        """
        queryset = self.get_queryset()
        
        # Add rank to each user based on their position
        data = []
        for rank, user in enumerate(queryset, start=1):
            serializer = self.get_serializer(user)
            user_data = serializer.data
            user_data['rank'] = rank
            data.append(user_data)
        
        return Response(data)
