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
from django.utils import timezone
from .models import (
    User, FriendRequest, Friendship, FriendInviteLink,
    GameRoom, RoomParticipant, RoomInvitation
)
from .serializers import (
    UserSerializer, UserStatsSerializer, LeaderboardSerializer,
    UserRegistrationSerializer, UserLoginSerializer,
    FriendRequestSerializer, FriendshipSerializer, FriendInviteLinkSerializer,
    GameRoomSerializer, RoomParticipantSerializer, RoomInvitationSerializer
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
        
        Public actions: list, retrieve, stats, matches
        Protected actions: create, update, delete, profile
        
        Returns:
            list: List of permission class instances
        """
        if self.action in ['list', 'retrieve', 'stats', 'matches']:
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
            - Includes opponent_username for easy display
            
        Example:
            GET /api/users/5/matches/?limit=20
            
            Response 200:
            [
                {
                    "id": 100,
                    "black_player": 5,
                    "white_player": 8,
                    "winner": 5,
                    "opponent_username": "player2",
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
        data = serializer.data
        
        # Add opponent_username to each match
        for i, match_obj in enumerate(matches):
            if match_obj.black_player and match_obj.black_player.id == user.id:
                # User is black player, opponent is white
                opponent = match_obj.white_player
            else:
                # User is white player, opponent is black
                opponent = match_obj.black_player
            
            data[i]['opponent_username'] = opponent.username if opponent else 'AI' if match_obj.mode == 'ai' else 'Unknown'
        
        return Response(data)


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
            - All active users (including those with no games played)
        
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
            is_active=True  # Show all active users
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


# ============================================================================
# Friend System Views
# ============================================================================

class FriendRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for friend request operations.
    
    Endpoints:
        GET    /api/friends/requests/         - List user's friend requests (received)
        POST   /api/friends/requests/         - Send a friend request
        GET    /api/friends/requests/sent/    - List sent friend requests
        POST   /api/friends/requests/{id}/accept/ - Accept friend request
        POST   /api/friends/requests/{id}/reject/ - Reject friend request
        DELETE /api/friends/requests/{id}/     - Cancel sent request
    
    Permissions:
        - All actions require authentication
        - Users can only manage their own requests
    
    Example Usage:
        # Send request
        POST /api/friends/requests/
        {
            "to_user_id": 2,
            "message": "Let's play together!"
        }
        
        # Accept request
        POST /api/friends/requests/5/accept/
        
        # List received requests
        GET /api/friends/requests/?status=pending
    """
    serializer_class = FriendRequestSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_context(self):
        """Add request to serializer context."""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def get_queryset(self):
        """Get friend requests where user is recipient."""
        status_filter = self.request.query_params.get('status', None)
        queryset = FriendRequest.objects.filter(to_user=self.request.user)
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset.select_related('from_user', 'to_user').order_by('-created_at')
    
    def perform_create(self, serializer):
        """Create friend request from authenticated user."""
        # Serializer's create() method gets from_user from request context
        serializer.save()
    
    @action(detail=False, methods=['get'])
    def sent(self, request):
        """
        List friend requests sent by current user.
        
        GET /api/friends/requests/sent/?status=pending
        
        Returns:
            List of friend requests sent by user
        """
        status_filter = request.query_params.get('status', None)
        queryset = FriendRequest.objects.filter(from_user=request.user)
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        queryset = queryset.select_related('from_user', 'to_user').order_by('-created_at')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """
        Accept a friend request.
        
        POST /api/friends/requests/{id}/accept/
        
        Creates bidirectional friendship between users.
        
        Returns:
            200: Request accepted, friendship created
            404: Request not found
            400: Request already responded to or invalid
        """
        try:
            friend_request = FriendRequest.objects.get(
                id=pk,
                to_user=request.user,
                status='pending'
            )
        except FriendRequest.DoesNotExist:
            return Response(
                {'error': 'Friend request not found or already responded to.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Accept the request (creates Friendship entries)
        friend_request.accept()
        
        return Response(
            {'message': 'Friend request accepted.'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Reject a friend request.
        
        POST /api/friends/requests/{id}/reject/
        
        Returns:
            200: Request rejected
            404: Request not found
            400: Request already responded to
        """
        try:
            friend_request = FriendRequest.objects.get(
                id=pk,
                to_user=request.user,
                status='pending'
            )
        except FriendRequest.DoesNotExist:
            return Response(
                {'error': 'Friend request not found or already responded to.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        friend_request.reject()
        
        return Response(
            {'message': 'Friend request rejected.'},
            status=status.HTTP_200_OK
        )
    
    def destroy(self, request, pk=None):
        """
        Cancel a sent friend request.
        
        DELETE /api/friends/requests/{id}/
        
        Only sender can cancel their own requests.
        """
        try:
            friend_request = FriendRequest.objects.get(
                id=pk,
                from_user=request.user,
                status='pending'
            )
        except FriendRequest.DoesNotExist:
            return Response(
                {'error': 'Friend request not found or cannot be cancelled.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        friend_request.cancel()
        
        return Response(
            {'message': 'Friend request cancelled.'},
            status=status.HTTP_200_OK
        )


class FriendshipViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing friends list.
    
    Endpoints:
        GET /api/friends/              - List user's friends
        GET /api/friends/{id}/         - Get friend details
        GET /api/friends/search/?q=username - Search users by username
    
    Permissions:
        - All actions require authentication
        - Users can only see their own friends
    
    Example Response:
        [
            {
                "id": 1,
                "friend": {
                    "id": 2,
                    "username": "player2",
                    "elo_rating": 1300,
                    "wins": 15
                },
                "social_source": "direct",
                "created_at": "2024-01-15T10:30:00Z"
            }
        ]
    """
    serializer_class = FriendshipSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get user's friends, excluding blocked ones."""
        return Friendship.objects.filter(
            user=self.request.user,
            is_blocked=False
        ).select_related('friend').order_by('-created_at')
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Search for users by username to add as friends.
        
        GET /api/friends/search/?q=username
        
        Filters out:
        - Current user
        - Already friends
        
        Returns:
            List of users matching search query with friend request status
        """
        query = request.query_params.get('q', '')
        
        if not query or len(query) < 2:
            return Response(
                {'error': 'Search query must be at least 2 characters.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get current user's friend IDs
        friend_ids = Friendship.objects.filter(
            user=request.user
        ).values_list('friend_id', flat=True)
        
        # Get pending sent requests (to show "Request Pending" status)
        pending_sent_requests = {}
        sent_requests = FriendRequest.objects.filter(
            from_user=request.user,
            status='pending'
        ).values('to_user_id', 'id')
        for req in sent_requests:
            pending_sent_requests[req['to_user_id']] = req['id']
        
        # Get pending received requests
        pending_received_ids = set(
            FriendRequest.objects.filter(
                to_user=request.user,
                status='pending'
            ).values_list('from_user_id', flat=True)
        )
        
        # Search users excluding self and existing friends
        users = User.objects.filter(
            username__icontains=query
        ).exclude(
            id=request.user.id
        ).exclude(
            id__in=friend_ids
        )[:10]  # Limit to 10 results
        
        # Serialize users and add friend request status
        serializer = UserSerializer(users, many=True)
        data = serializer.data
        
        # Add friendship status to each user
        for user_data in data:
            user_id = user_data['id']
            if user_id in pending_sent_requests:
                user_data['friend_request_status'] = 'sent'
                user_data['friend_request_id'] = pending_sent_requests[user_id]
            elif user_id in pending_received_ids:
                user_data['friend_request_status'] = 'received'
            else:
                user_data['friend_request_status'] = 'none'
        
        return Response(data)


class FriendInviteLinkViewSet(viewsets.ModelViewSet):
    """
    ViewSet for friend invite links.
    
    Endpoints:
        GET    /api/friends/invite-links/        - List user's invite links
        POST   /api/friends/invite-links/        - Create new invite link
        DELETE /api/friends/invite-links/{id}/   - Deactivate invite link
        POST   /api/friends/invite/{code}/       - Accept invite via code
    
    Permissions:
        - Creating/listing links requires authentication
        - Accepting invite requires authentication
    
    Example Usage:
        # Create link
        POST /api/friends/invite-links/
        {
            "expires_at": "2024-12-31T23:59:59Z",
            "max_uses": 10
        }
        
        # Accept invite
        POST /api/friends/invite/abc-123-def/
    """
    serializer_class = FriendInviteLinkSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'code'
    
    def get_queryset(self):
        """Get user's active invite links."""
        return FriendInviteLink.objects.filter(
            user=self.request.user,
            is_active=True
        ).order_by('-created_at')
    
    def destroy(self, request, code=None):
        """
        Deactivate an invite link.
        
        DELETE /api/friends/invite-links/{code}/
        """
        try:
            invite_link = FriendInviteLink.objects.get(
                code=code,
                user=request.user
            )
        except FriendInviteLink.DoesNotExist:
            return Response(
                {'error': 'Invite link not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        invite_link.is_active = False
        invite_link.save()
        
        return Response(
            {'message': 'Invite link deactivated.'},
            status=status.HTTP_200_OK
        )


class AcceptInviteLinkView(generics.GenericAPIView):
    """
    View for accepting friend invites via invite link.
    
    Endpoint:
        POST /api/friends/invite/{code}/
    
    Permissions:
        - Requires authentication
        - Cannot use own invite link
    
    Example:
        POST /api/friends/invite/abc-123-def/
        
    Returns:
        200: Friendship created
        400: Invalid or expired link
        404: Link not found
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, code):
        """
        Accept friend invitation via code.
        
        Validates link and creates friendship if valid.
        """
        try:
            invite_link = FriendInviteLink.objects.select_related('user').get(code=code)
        except FriendInviteLink.DoesNotExist:
            return Response(
                {'error': 'Invite link not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user is trying to use their own link
        if invite_link.user == request.user:
            return Response(
                {'error': 'You cannot use your own invite link.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if link is valid
        if not invite_link.is_valid():
            return Response(
                {'error': 'This invite link is expired or has reached its usage limit.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if already friends
        if Friendship.are_friends(request.user, invite_link.user):
            return Response(
                {'error': 'You are already friends with this user.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create friendship
        Friendship.create_friendship(
            user1=request.user,
            user2=invite_link.user,
            social_source='invite_link'
        )
        
        # Increment usage count
        invite_link.use()
        
        return Response(
            {
                'message': f'You are now friends with {invite_link.user.username}!',
                'friend': UserSerializer(invite_link.user).data
            },
            status=status.HTTP_200_OK
        )


# ============================================================================
# Game Room Views
# ============================================================================

class GameRoomViewSet(viewsets.ModelViewSet):
    """
    ViewSet for game room operations.
    
    Endpoints:
        GET    /api/rooms/              - List user's rooms
        POST   /api/rooms/              - Create new room
        GET    /api/rooms/{code}/       - Get room details
        POST   /api/rooms/{code}/join/  - Join room via code
        POST   /api/rooms/{code}/ready/ - Toggle ready status
        POST   /api/rooms/{code}/start/ - Start game (host only)
        DELETE /api/rooms/{code}/       - Close room (host only)
        POST   /api/rooms/{code}/leave/ - Leave room
    
    Permissions:
        - All actions require authentication
    
    Example Usage:
        # Create room
        POST /api/rooms/
        {
            "name": "My Private Room",
            "is_public": false,
            "max_players": 2
        }
    """
    serializer_class = GameRoomSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'code'
    
    def get_queryset(self):
        """
        Get rooms where user is host or participant, plus public rooms.
        
        Filters:
        - status: Filter by room status (waiting/ready/active/finished)
        - public: Show only public rooms
        - my_rooms: If 'true', show only user's own rooms (default behavior)
        """
        status_filter = self.request.query_params.get('status', None)
        show_public = self.request.query_params.get('public', None)
        my_rooms_only = self.request.query_params.get('my_rooms', 'false')
        
        if my_rooms_only == 'true' or show_public != 'true':
            # Default: rooms where user is participant or host
            queryset = GameRoom.objects.filter(
                Q(host=self.request.user) |
                Q(participants__user=self.request.user, participants__has_left=False)
            ).distinct()
        else:
            # Show all public rooms that are joinable
            queryset = GameRoom.objects.filter(
                Q(is_public=True) |
                Q(host=self.request.user) |
                Q(participants__user=self.request.user, participants__has_left=False)
            ).distinct()
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset.select_related('host').prefetch_related(
            'participants__user'
        ).order_by('-created_at')
    
    def list(self, request, *args, **kwargs):
        """
        List rooms and automatically clean up empty rooms.
        
        Empty rooms (all participants left) are deleted automatically.
        """
        queryset = self.get_queryset()
        
        # Clean up empty rooms before listing
        rooms_to_delete = []
        for room in queryset:
            # Check if all participants have left
            active_participants = room.participants.filter(has_left=False).count()
            if active_participants == 0:
                rooms_to_delete.append(room.id)
        
        # Delete empty rooms
        if rooms_to_delete:
            GameRoom.objects.filter(id__in=rooms_to_delete).delete()
            # Re-fetch queryset after deletion
            queryset = self.get_queryset()
        
        # Serialize and return
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def join(self, request, code=None):
        """
        Join a room via code.
        
        POST /api/rooms/{code}/join/
        
        Returns:
            200: Successfully joined
            400: Room full, already in room, or invalid status
            404: Room not found
        """
        try:
            room = GameRoom.objects.get(code=code)
        except GameRoom.DoesNotExist:
            return Response(
                {'error': 'Room not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user is already in room (active participant)
        existing_participant = RoomParticipant.objects.filter(
            room=room,
            user=request.user
        ).first()
        
        if existing_participant:
            if not existing_participant.has_left:
                # Already in room and active
                return Response(
                    {'error': 'You are already in this room.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            else:
                # Was in room but left - rejoin by resetting has_left flag
                # Allow rejoining even if game is active (user was disconnected)
                existing_participant.has_left = False
                existing_participant.is_ready = False
                existing_participant.joined_at = timezone.now()
                existing_participant.save()
                
                # Return updated room data
                serializer = self.get_serializer(room)
                return Response(serializer.data, status=status.HTTP_200_OK)
        
        # For NEW participants (not rejoining), enforce status and capacity rules
        # Check if room is joinable
        if room.status not in ['waiting', 'ready']:
            return Response(
                {'error': 'This room is not accepting new players.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if room is full
        if room.is_full():
            return Response(
                {'error': 'This room is full.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # New participant - create record
        RoomParticipant.objects.create(
            room=room,
            user=request.user
        )
        
        # Return updated room data
        serializer = self.get_serializer(room)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def ready(self, request, code=None):
        """
        Toggle ready status in room.
        
        POST /api/rooms/{code}/ready/
        
        Returns:
            200: Ready status toggled
            400: Not in room
            404: Room not found
        """
        try:
            room = GameRoom.objects.get(code=code)
        except GameRoom.DoesNotExist:
            return Response(
                {'error': 'Room not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get participant
        try:
            participant = RoomParticipant.objects.get(
                room=room,
                user=request.user,
                has_left=False
            )
        except RoomParticipant.DoesNotExist:
            return Response(
                {'error': 'You are not in this room.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Toggle ready status
        participant.is_ready = not participant.is_ready
        participant.save()
        
        # Update room status if all players are ready
        if room.can_start():
            room.status = 'ready'
            room.save()
        elif room.status == 'ready':
            room.status = 'waiting'
            room.save()
        
        # Return updated room data
        serializer = self.get_serializer(room)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def start(self, request, code=None):
        """
        Start the game (host only).
        
        POST /api/rooms/{code}/start/
        
        Creates a Match and updates room status to 'active'.
        
        Returns:
            200: Game started with match data
            400: Not enough players or not all ready
            403: Only host can start game
            404: Room not found
        """
        try:
            room = GameRoom.objects.get(code=code)
        except GameRoom.DoesNotExist:
            return Response(
                {'error': 'Room not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user is host
        if room.host != request.user:
            return Response(
                {'error': 'Only the host can start the game.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if game can start
        if not room.can_start():
            return Response(
                {'error': 'Cannot start game. Make sure room is full and all players are ready.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Start the game (creates Match)
        match = room.start_game()
        
        # Return match data
        from game.serializers import MatchSerializer
        return Response(
            {
                'message': 'Game started!',
                'match': MatchSerializer(match).data,
                'room': self.get_serializer(room).data
            },
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def leave(self, request, code=None):
        """
        Leave a room.
        
        POST /api/rooms/{code}/leave/
        
        If host leaves, room is closed.
        
        Returns:
            200: Successfully left
            400: Not in room
            404: Room not found
        """
        try:
            room = GameRoom.objects.get(code=code)
        except GameRoom.DoesNotExist:
            return Response(
                {'error': 'Room not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get participant
        try:
            participant = RoomParticipant.objects.get(
                room=room,
                user=request.user,
                has_left=False
            )
        except RoomParticipant.DoesNotExist:
            return Response(
                {'error': 'You are not in this room.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Mark as left
        participant.has_left = True
        participant.save()
        
        # Check if all participants have left
        remaining_participants = room.participants.filter(has_left=False)
        remaining_count = remaining_participants.count()
        
        if remaining_count == 0:
            # All participants have left - delete the room
            room_name = room.name
            room.delete()
            return Response(
                {'message': f'You left the room. Room "{room_name}" has been deleted as all participants left.'},
                status=status.HTTP_200_OK
            )
        
        # If current user was the host, transfer host to remaining participant
        if room.host == request.user and remaining_count > 0:
            new_host = remaining_participants.first().user
            room.host = new_host
            room.status = 'waiting'  # Reset to waiting status for new host to invite others
            room.save()
            return Response(
                {'message': f'You left the room. {new_host.username} is now the host.'},
                status=status.HTTP_200_OK
            )
        
        # Regular participant left, room status back to waiting
        if room.status == 'ready':
            room.status = 'waiting'
            room.save()
        
        return Response(
            {'message': 'You left the room.'},
            status=status.HTTP_200_OK
        )
    
    def destroy(self, request, code=None):
        """
        Close a room (host only).
        
        DELETE /api/rooms/{code}/
        
        Only host can close the room.
        """
        try:
            room = GameRoom.objects.get(code=code)
        except GameRoom.DoesNotExist:
            return Response(
                {'error': 'Room not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user is host
        if room.host != request.user:
            return Response(
                {'error': 'Only the host can close the room.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        room.close()
        
        return Response(
            {'message': 'Room closed.'},
            status=status.HTTP_200_OK
        )


class RoomInvitationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for room invitation operations.
    
    Endpoints:
        GET    /api/rooms/invitations/         - List received invitations
        POST   /api/rooms/invitations/         - Send invitation
        POST   /api/rooms/invitations/{id}/accept/ - Accept invitation
        POST   /api/rooms/invitations/{id}/reject/ - Reject invitation
    
    Permissions:
        - All actions require authentication
    
    Example Usage:
        # Send invitation
        POST /api/rooms/invitations/
        {
            "room_id": 1,
            "to_user_id": 2,
            "message": "Join my game!"
        }
    """
    serializer_class = RoomInvitationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get invitations received by user."""
        status_filter = self.request.query_params.get('status', 'pending')
        queryset = RoomInvitation.objects.filter(to_user=self.request.user)
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset.select_related(
            'room', 'from_user', 'to_user'
        ).order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """
        Accept a room invitation.
        
        POST /api/rooms/invitations/{id}/accept/
        
        Joins user to the room automatically.
        
        Returns:
            200: Invitation accepted, joined room
            404: Invitation not found
            400: Invalid or expired invitation
        """
        try:
            invitation = RoomInvitation.objects.select_related('room').get(
                id=pk,
                to_user=request.user,
                status='pending'
            )
        except RoomInvitation.DoesNotExist:
            return Response(
                {'error': 'Invitation not found or already responded to.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if invitation is still valid
        if invitation.is_expired():
            return Response(
                {'error': 'This invitation has expired.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Accept invitation (adds user to room)
        invitation.accept()
        
        # Return room data
        room_serializer = GameRoomSerializer(invitation.room)
        return Response(
            {
                'message': 'Invitation accepted. You have joined the room!',
                'room': room_serializer.data
            },
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Reject a room invitation.
        
        POST /api/rooms/invitations/{id}/reject/
        
        Returns:
            200: Invitation rejected
            404: Invitation not found
        """
        try:
            invitation = RoomInvitation.objects.get(
                id=pk,
                to_user=request.user,
                status='pending'
            )
        except RoomInvitation.DoesNotExist:
            return Response(
                {'error': 'Invitation not found or already responded to.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        invitation.reject()
        
        return Response(
            {'message': 'Invitation rejected.'},
            status=status.HTTP_200_OK
        )
