from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.db.models import Q
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from .models import User, FriendRequest, Friendship
from .serializers import (
    UserSerializer, UserStatsSerializer, LeaderboardSerializer,
    UserRegistrationSerializer, UserLoginSerializer,
    FriendRequestSerializer, FriendshipSerializer,
    FriendRequestCreateByUsernameSerializer, InviteAcceptSerializer, UserSearchSerializer
)
from game.models import Match
from game.serializers import MatchSerializer


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for user operations
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'stats']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    @action(detail=False, methods=['get'])
    def profile(self, request):
        """Get current user profile"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Get user statistics"""
        user = self.get_object()
        
        # Calculate rank
        rank = User.objects.filter(elo_rating__gt=user.elo_rating).count() + 1
        
        serializer = UserStatsSerializer(user)
        data = serializer.data
        data['rank'] = rank
        
        return Response(data)

    @action(detail=True, methods=['get'])
    def matches(self, request, pk=None):
        """Get user match history"""
        user = self.get_object()
        limit = int(request.query_params.get('limit', 10))
        
        matches = Match.objects.filter(
            Q(black_player=user) | Q(white_player=user),
            status='completed'
        ).order_by('-updated_at')[:limit]
        
        serializer = MatchSerializer(matches, many=True)
        return Response(serializer.data)


class UserRegistrationView(generics.CreateAPIView):
    """
    API endpoint for user registration
    POST /api/users/register/
    """
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Create token for the new user
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'user': UserSerializer(user).data,
            'token': token.key,
            'message': 'Registration successful!'
        }, status=status.HTTP_201_CREATED)


class UserLoginView(generics.GenericAPIView):
    """
    API endpoint for user login
    POST /api/users/login/
    """
    serializer_class = UserLoginSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        
        # Find user by email
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({
                'error': 'Invalid email or password.'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Authenticate user
        user = authenticate(username=user.username, password=password)
        
        if user is None:
            return Response({
                'error': 'Invalid email or password.'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Get or create token
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'user': UserSerializer(user).data,
            'token': token.key,
            'message': 'Login successful!'
        }, status=status.HTTP_200_OK)


class LeaderboardViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for leaderboard
    """
    serializer_class = LeaderboardSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = User.objects.filter(
            wins__gt=0
        ).order_by('-elo_rating')
        
        filter_type = self.request.query_params.get('filter', 'all')
        limit = int(self.request.query_params.get('limit', 50))
        
        # TODO: Implement time-based filtering for 'week' and 'month'
        # This would require storing game timestamps and recalculating
        
        return queryset[:limit]

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        
        # Add rank to each user
        data = []
        for rank, user in enumerate(queryset, start=1):
            serializer = self.get_serializer(user)
            user_data = serializer.data
            user_data['rank'] = rank
            data.append(user_data)
        
        return Response(data)


# --- Friend endpoints ---
class FriendViewSet(viewsets.ViewSet):
    """ViewSet handling friend requests, invites and friendships"""
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """List current user's friends"""
        friendships = Friendship.objects.filter(user=request.user)
        serializer = FriendshipSerializer(friendships, many=True)
        return Response(serializer.data)

    def create(self, request):
        """Send friend request by username"""
        serializer = FriendRequestCreateByUsernameSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        to_username = serializer.validated_data['to_username']

        try:
            to_user = User.objects.get(username=to_username)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if to_user == request.user:
            return Response({'error': 'Cannot send friend request to yourself.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check existing friendship
        if Friendship.objects.filter(user=request.user, friend=to_user).exists():
            return Response({'error': 'Already friends.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check existing pending request
        if FriendRequest.objects.filter(from_user=request.user, to_user=to_user, status='pending').exists() or FriendRequest.objects.filter(from_user=to_user, to_user=request.user, status='pending').exists():
            return Response({'error': 'Friend request already pending.'}, status=status.HTTP_400_BAD_REQUEST)

        fr = FriendRequest.objects.create(from_user=request.user, to_user=to_user, via='username')
        return Response(FriendRequestSerializer(fr).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='invite')
    def create_invite(self, request):
        """Create an invite link (token)"""
        fr = FriendRequest.objects.create(from_user=request.user, via='link')
        fr.generate_token()
        return Response({'token': fr.token, 'expires_at': fr.expires_at}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='invite/accept')
    def accept_invite(self, request):
        """Accept invite by token"""
        serializer = InviteAcceptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data['token']

        try:
            fr = FriendRequest.objects.get(token=token)
        except FriendRequest.DoesNotExist:
            return Response({'error': 'Invalid token.'}, status=status.HTTP_404_NOT_FOUND)

        if fr.is_expired():
            fr.status = 'expired'
            fr.save()
            return Response({'error': 'Token expired.'}, status=status.HTTP_400_BAD_REQUEST)

        if fr.status != 'pending':
            return Response({'error': 'Invite already used or not pending.'}, status=status.HTTP_400_BAD_REQUEST)

        # If invite was created without a to_user, accept by current user
        to_user = request.user
        from_user = fr.from_user

        if to_user == from_user:
            return Response({'error': 'Cannot accept your own invite.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # create friendship both ways
            Friendship.objects.get_or_create(user=from_user, friend=to_user)
            Friendship.objects.get_or_create(user=to_user, friend=from_user)
            fr.status = 'accepted'
            fr.to_user = to_user
            fr.save()

        return Response({'status': 'accepted'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='accept')
    def accept_request(self, request, pk=None):
        """Accept a friend request by id (recipient only)"""
        try:
            fr = FriendRequest.objects.get(pk=pk)
        except FriendRequest.DoesNotExist:
            return Response({'error': 'Friend request not found.'}, status=status.HTTP_404_NOT_FOUND)

        if fr.to_user != request.user:
            return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

        if fr.status != 'pending':
            return Response({'error': 'Request not pending.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            Friendship.objects.get_or_create(user=fr.from_user, friend=fr.to_user)
            Friendship.objects.get_or_create(user=fr.to_user, friend=fr.from_user)
            fr.status = 'accepted'
            fr.save()

        return Response({'status': 'accepted'})

    @action(detail=True, methods=['post'], url_path='reject')
    def reject_request(self, request, pk=None):
        try:
            fr = FriendRequest.objects.get(pk=pk)
        except FriendRequest.DoesNotExist:
            return Response({'error': 'Friend request not found.'}, status=status.HTTP_404_NOT_FOUND)

        if fr.to_user != request.user:
            return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

        fr.status = 'rejected'
        fr.save()
        return Response({'status': 'rejected'})

    @action(detail=False, methods=['get'], url_path='search')
    def search_users(self, request):
        q = request.query_params.get('q', '')
        if not q:
            return Response({'results': []})

        qs = User.objects.filter(username__icontains=q).exclude(id=request.user.id)[:20]
        serializer = UserSearchSerializer(qs, many=True)
        return Response({'results': serializer.data})

    def destroy(self, request, pk=None):
        """Remove friend relationship with user id=pk"""
        try:
            friend = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Delete both friendship entries
        Friendship.objects.filter(user=request.user, friend=friend).delete()
        Friendship.objects.filter(user=friend, friend=request.user).delete()

        return Response(status=status.HTTP_204_NO_CONTENT)
