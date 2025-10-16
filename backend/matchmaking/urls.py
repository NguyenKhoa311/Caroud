from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MatchmakingViewSet

router = DefaultRouter()
router.register(r'', MatchmakingViewSet, basename='matchmaking')

urlpatterns = [
    path('', include(router.urls)),
]
