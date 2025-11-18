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
from .models import (
    User, FriendRequest, Friendship, FriendInviteLink,
    GameRoom, RoomParticipant, RoomInvitation
)


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
            'id', 'cognito_id', 'username', 'email', 'elo_rating',
            'wins', 'losses', 'draws', 'total_games',
            'win_rate', 'current_streak', 'best_streak',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'cognito_id', 'created_at', 'updated_at']


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


# ============================================================================
# Friend System Serializers
# ============================================================================

class FriendRequestSerializer(serializers.ModelSerializer):
    """
    Serializer for friend request operations.
    
    Handles:
    - Sending friend requests with optional message
    - Listing pending/accepted/rejected requests
    - Displaying request details with user info
    
    Fields:
        id: Request ID
        from_user: User who sent the request (nested user data)
        to_user: User who received the request (nested user data)
        status: Current status (pending/accepted/rejected/cancelled)
        message: Optional message from sender
        created_at: When request was sent
        responded_at: When request was accepted/rejected (null if pending)
    
    Example Usage:
        # Send request
        serializer = FriendRequestSerializer(data={
            'to_user': 2,
            'message': 'Let\'s play!'
        }, context={'request': request})
        if serializer.is_valid():
            serializer.save()
        
        # List requests
        requests = FriendRequest.objects.filter(to_user=user)
        serializer = FriendRequestSerializer(requests, many=True)
    """
    from_user = UserSerializer(read_only=True)
    to_user_id = serializers.IntegerField(write_only=True)
    to_user = UserSerializer(read_only=True)
    
    class Meta:
        model = FriendRequest
        fields = [
            'id', 'from_user', 'to_user_id', 'to_user',
            'status', 'message', 'created_at', 'responded_at'
        ]
        read_only_fields = ['id', 'from_user', 'status', 'created_at', 'responded_at']
    
    def validate_to_user_id(self, value):
        """Validate that target user exists and is not self."""
        request = self.context.get('request')
        if request and request.user.id == value:
            raise serializers.ValidationError("You cannot send a friend request to yourself.")
        
        if not User.objects.filter(id=value).exists():
            raise serializers.ValidationError("User not found.")
        
        # Check if already friends
        if request and Friendship.are_friends(request.user, User.objects.get(id=value)):
            raise serializers.ValidationError("You are already friends with this user.")
        
        # Check if pending request exists
        if request and FriendRequest.objects.filter(
            from_user=request.user,
            to_user_id=value,
            status='pending'
        ).exists():
            raise serializers.ValidationError("You already sent a friend request to this user.")
        
        return value
    
    def create(self, validated_data):
        """Create friend request from authenticated user."""
        request = self.context.get('request')
        to_user_id = validated_data.pop('to_user_id')
        
        # Delete any old cancelled/rejected requests to allow resending
        FriendRequest.objects.filter(
            from_user=request.user,
            to_user_id=to_user_id,
            status__in=['cancelled', 'rejected']
        ).delete()
        
        return FriendRequest.objects.create(
            from_user=request.user,
            to_user_id=to_user_id,
            **validated_data
        )


class FriendshipSerializer(serializers.ModelSerializer):
    """
    Serializer for friendship display.
    
    Used to list user's friends with their profile information.
    Shows social connection source (direct/facebook/google/invite_link).
    
    Fields:
        id: Friendship ID
        friend: Friend's user profile (nested)
        social_source: How they became friends
        is_blocked: Whether user has blocked this friend
        created_at: When friendship was established
    
    Example Response:
        {
            "id": 1,
            "friend": {
                "id": 2,
                "username": "friend123",
                "elo_rating": 1300,
                "wins": 15,
                "total_games": 25
            },
            "social_source": "direct",
            "is_blocked": false,
            "created_at": "2024-01-15T10:30:00Z"
        }
    """
    friend = UserSerializer(read_only=True)
    
    class Meta:
        model = Friendship
        fields = ['id', 'friend', 'social_source', 'is_blocked', 'created_at']
        read_only_fields = ['id', 'friend', 'created_at']


class FriendInviteLinkSerializer(serializers.ModelSerializer):
    """
    Serializer for friend invite links.
    
    Handles:
    - Generating shareable invite links
    - Displaying link details and usage stats
    - Validating link expiration and usage limits
    
    Fields:
        id: Link ID
        user: User who created the link (nested)
        code: Unique UUID code for the link
        invite_url: Full URL to accept invitation (read-only)
        expires_at: Expiration date (null = never expires)
        max_uses: Maximum number of uses (null = unlimited)
        uses_count: Current number of uses
        is_active: Whether link can still be used
        created_at: When link was created
    
    Example Usage:
        # Create link
        serializer = FriendInviteLinkSerializer(data={
            'expires_at': '2024-12-31T23:59:59Z',
            'max_uses': 10
        }, context={'request': request})
        if serializer.is_valid():
            link = serializer.save()
            invite_url = link.get_invite_url()
    """
    user = UserSerializer(read_only=True)
    invite_url = serializers.SerializerMethodField()
    
    class Meta:
        model = FriendInviteLink
        fields = [
            'id', 'user', 'code', 'invite_url',
            'expires_at', 'max_uses', 'uses_count',
            'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'code', 'uses_count', 'created_at']
    
    def get_invite_url(self, obj):
        """Generate full invite URL."""
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(f'/api/friends/invite/{obj.code}/')
        return f'/api/friends/invite/{obj.code}/'
    
    def create(self, validated_data):
        """Create invite link for authenticated user."""
        request = self.context.get('request')
        return FriendInviteLink.objects.create(
            user=request.user,
            **validated_data
        )


# ============================================================================
# Game Room Serializers
# ============================================================================

class RoomParticipantSerializer(serializers.ModelSerializer):
    """
    Serializer for room participants.
    
    Shows who is in a room and their ready status.
    Used in room lobby display.
    
    Fields:
        id: Participant ID
        user: Participant's user profile (nested)
        joined_at: When they joined the room
        has_left: Whether they left the room
        is_ready: Whether they're ready to start
    
    Example Response:
        {
            "id": 1,
            "user": {
                "id": 2,
                "username": "player1",
                "elo_rating": 1250
            },
            "joined_at": "2024-01-15T10:30:00Z",
            "has_left": false,
            "is_ready": true
        }
    """
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = RoomParticipant
        fields = ['id', 'user', 'joined_at', 'has_left', 'is_ready']
        read_only_fields = ['id', 'user', 'joined_at']


class GameRoomSerializer(serializers.ModelSerializer):
    """
    Serializer for game room operations.
    
    Handles:
    - Creating private/public rooms
    - Displaying room details and participants
    - Room settings and status
    
    Fields:
        id: Room ID
        name: Room display name
        code: Unique join code
        host: Room creator (nested user data)
        is_public: Whether room is visible in public list
        max_players: Maximum number of players (default 2)
        status: Current room status (waiting/ready/active/finished/closed)
        participants: List of users in room (nested)
        settings: Custom room settings JSON (time limits, board size, etc.)
        join_url: Full URL to join via code (read-only)
        created_at: When room was created
    
    Example Usage:
        # Create room
        serializer = GameRoomSerializer(data={
            'name': 'My Room',
            'is_public': False,
            'max_players': 2
        }, context={'request': request})
        if serializer.is_valid():
            room = serializer.save()
    """
    host = UserSerializer(read_only=True)
    participants = RoomParticipantSerializer(many=True, read_only=True)
    join_url = serializers.SerializerMethodField()
    game = serializers.SerializerMethodField()
    
    class Meta:
        model = GameRoom
        fields = [
            'id', 'name', 'code', 'host', 'is_public',
            'max_players', 'status', 'participants',
            'settings', 'join_url', 'created_at', 'game'
        ]
        read_only_fields = ['id', 'code', 'host', 'status', 'created_at', 'game']
    
    def get_join_url(self, obj):
        """Generate full join URL."""
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(f'/api/rooms/{obj.code}/')
        return f'/api/rooms/{obj.code}/'
    
    def get_game(self, obj):
        """Return game info if exists."""
        if obj.game:
            return {
                'id': obj.game.id,
                'status': obj.game.status
            }
        return None
    
    def create(self, validated_data):
        """Create room with authenticated user as host."""
        request = self.context.get('request')
        room = GameRoom.objects.create(
            host=request.user,
            **validated_data
        )
        # Automatically add host as participant
        RoomParticipant.objects.create(
            room=room,
            user=request.user,
            is_ready=True  # Host is always ready
        )
        return room


class RoomInvitationSerializer(serializers.ModelSerializer):
    """
    Serializer for room invitations.
    
    Handles:
    - Inviting friends to private rooms
    - Displaying invitation details
    - Tracking invitation status
    
    Fields:
        id: Invitation ID
        room: Room details (nested)
        from_user: User who sent invitation (nested)
        to_user: User who received invitation (nested)
        status: Current status (pending/accepted/rejected/expired)
        message: Optional message from inviter
        created_at: When invitation was sent
        responded_at: When invitation was accepted/rejected
    
    Example Usage:
        # Send invitation
        serializer = RoomInvitationSerializer(data={
            'room_id': 1,
            'to_user_id': 2,
            'message': 'Join my game!'
        }, context={'request': request})
    """
    from_user = UserSerializer(read_only=True)
    to_user_id = serializers.IntegerField(write_only=True)
    to_user = UserSerializer(read_only=True)
    room_id = serializers.IntegerField(write_only=True)
    room = GameRoomSerializer(read_only=True)
    
    class Meta:
        model = RoomInvitation
        fields = [
            'id', 'room_id', 'room', 'from_user',
            'to_user_id', 'to_user', 'status', 'message',
            'created_at', 'responded_at'
        ]
        read_only_fields = ['id', 'from_user', 'status', 'created_at', 'responded_at']
    
    def validate(self, attrs):
        """Validate room and target user."""
        request = self.context.get('request')
        room_id = attrs.get('room_id')
        to_user_id = attrs.get('to_user_id')
        
        # Check room exists
        try:
            room = GameRoom.objects.get(id=room_id)
        except GameRoom.DoesNotExist:
            raise serializers.ValidationError({"room_id": "Room not found."})
        
        # Check user is host or participant
        if request.user != room.host and not RoomParticipant.objects.filter(
            room=room, user=request.user, has_left=False
        ).exists():
            raise serializers.ValidationError("You must be in the room to send invitations.")
        
        # Check room is not full
        if room.is_full():
            raise serializers.ValidationError("Room is full.")
        
        # Check room status
        if room.status not in ['waiting', 'ready']:
            raise serializers.ValidationError("Cannot invite to this room (game already started or finished).")
        
        # Check target user exists
        if not User.objects.filter(id=to_user_id).exists():
            raise serializers.ValidationError({"to_user_id": "User not found."})
        
        # Check not inviting self
        if request.user.id == to_user_id:
            raise serializers.ValidationError({"to_user_id": "You cannot invite yourself."})
        
        # Check if already invited
        if RoomInvitation.objects.filter(
            room=room,
            to_user_id=to_user_id,
            status='pending'
        ).exists():
            raise serializers.ValidationError({"to_user_id": "User already invited to this room."})
        
        # Check if already in room
        if RoomParticipant.objects.filter(
            room=room,
            user_id=to_user_id,
            has_left=False
        ).exists():
            raise serializers.ValidationError({"to_user_id": "User is already in this room."})
        
        attrs['room'] = room
        return attrs
    
    def create(self, validated_data):
        """Create room invitation from authenticated user."""
        request = self.context.get('request')
        room_id = validated_data.pop('room_id')
        to_user_id = validated_data.pop('to_user_id')
        return RoomInvitation.objects.create(
            room_id=room_id,
            from_user=request.user,
            to_user_id=to_user_id,
            **validated_data
        )