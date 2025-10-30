"""
Session Management Middleware
Forces single session per user - logout old sessions when logging in from new device
"""

from django.utils import timezone
from rest_framework.authtoken.models import Token
import logging

logger = logging.getLogger(__name__)


class SingleSessionMiddleware:
    """
    Middleware to enforce single active session per user.
    When user logs in from a new device, old session is invalidated.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Check before processing request
        if hasattr(request, 'user') and request.user.is_authenticated:
            # Get session key from request (could be from token or session)
            current_session = self._get_session_key(request)
            
            if current_session:
                # Check if this is the active session
                if request.user.active_session_key and request.user.active_session_key != current_session:
                    # Different session detected - user logged in elsewhere
                    logger.info(f"User {request.user.username} session invalidated - logged in elsewhere")
                    
                    # Add header to response to notify frontend
                    response = self.get_response(request)
                    response['X-Session-Expired'] = 'true'
                    response['X-Session-Reason'] = 'logged_in_elsewhere'
                    return response
        
        response = self.get_response(request)
        return response
    
    def _get_session_key(self, request):
        """Extract session key from request"""
        # Try to get from Authorization header (Token auth)
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Token '):
            token_key = auth_header.replace('Token ', '').strip()
            return f'token:{token_key}'
        
        # Try to get from session
        if hasattr(request, 'session') and request.session.session_key:
            return f'session:{request.session.session_key}'
        
        return None


class SessionHeartbeatMiddleware:
    """
    Middleware to update user's last active timestamp.
    Helps track online users.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Update last_login_at on each request (heartbeat)
        if hasattr(request, 'user') and request.user.is_authenticated:
            # Only update every 30 seconds to reduce DB writes
            if not request.user.last_login_at or \
               (timezone.now() - request.user.last_login_at).seconds > 30:
                request.user.last_login_at = timezone.now()
                request.user.save(update_fields=['last_login_at'])
        
        response = self.get_response(request)
        return response
