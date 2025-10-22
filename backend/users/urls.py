from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, UserRegistrationView, UserLoginView

router = DefaultRouter()
router.register(r'', UserViewSet, basename='user')

urlpatterns = [
    path('register/', UserRegistrationView.as_view(), name='user-register'),
    path('login/', UserLoginView.as_view(), name='user-login'),
    path('', include(router.urls)),
]
