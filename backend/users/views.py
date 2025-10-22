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
