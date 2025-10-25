from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet, UserRegistrationView, UserLoginView,
    FriendRequestViewSet, FriendshipViewSet, FriendInviteLinkViewSet,
    AcceptInviteLinkView, GameRoomViewSet, RoomInvitationViewSet
)

router = DefaultRouter()
router.register(r'', UserViewSet, basename='user')

# Friend system routes
friend_router = DefaultRouter()
friend_router.register(r'requests', FriendRequestViewSet, basename='friend-request')
friend_router.register(r'list', FriendshipViewSet, basename='friendship')
friend_router.register(r'invite-links', FriendInviteLinkViewSet, basename='invite-link')

# Room system routes
room_router = DefaultRouter()
room_router.register(r'', GameRoomViewSet, basename='game-room')
room_router.register(r'invitations', RoomInvitationViewSet, basename='room-invitation')

urlpatterns = [
    # User authentication
    path('register/', UserRegistrationView.as_view(), name='user-register'),
    path('login/', UserLoginView.as_view(), name='user-login'),
    
    # Friend system endpoints
    path('friends/', include(friend_router.urls)),
    path('friends/invite/<uuid:code>/', AcceptInviteLinkView.as_view(), name='accept-invite-link'),
    
    # Room system endpoints
    path('rooms/', include(room_router.urls)),
    
    # User endpoints (must be last to avoid conflicts)
    path('', include(router.urls)),
]
