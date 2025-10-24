from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, UserRegistrationView, UserLoginView, FriendViewSet

router = DefaultRouter()
router.register(r'', UserViewSet, basename='user')
router.register(r'friends', FriendViewSet, basename='friend')

urlpatterns = [
    path('register/', UserRegistrationView.as_view(), name='user-register'),
    path('login/', UserLoginView.as_view(), name='user-login'),
    path('', include(router.urls)),
]
