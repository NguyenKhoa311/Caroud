"""
WebSocket authentication middleware to extract token from query string
"""
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework.authtoken.models import Token
from users.models import User
import logging

logger = logging.getLogger(__name__)


@database_sync_to_async
def get_user_from_token(token_string):
    """Get user from token"""
    try:
        # Try to get token from database
        token = Token.objects.get(key=token_string)
        user = token.user
        logger.info(f"✅ Authenticated user: {user.username} (ID: {user.id})")
        return user
    except Token.DoesNotExist:
        # Token might be JWT or custom token - try to decode manually
        try:
            import jwt
            from django.conf import settings
            
            # Decode JWT token
            payload = jwt.decode(token_string, settings.SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
            
            if user_id:
                user = User.objects.get(id=user_id)
                logger.info(f"✅ Authenticated user (JWT): {user.username} (ID: {user.id})")
                return user
        except Exception as jwt_error:
            logger.warning(f"❌ JWT decode error: {jwt_error}")
        
        logger.warning(f"❌ Token not found in database")
        return AnonymousUser()
    except Exception as e:
        logger.error(f"❌ Error authenticating token: {e}")
        return AnonymousUser()


class TokenAuthMiddleware(BaseMiddleware):
    """
    Custom middleware that authenticates WebSocket connections using token from query string
    """
    
    async def __call__(self, scope, receive, send):
        # Get token from query string
        query_string = scope.get('query_string', b'').decode()
        query_params = dict(qp.split('=') for qp in query_string.split('&') if '=' in qp)
        token = query_params.get('token')
        
        if token:
            logger.info(f"🔑 Token found in query string: {token[:20]}...")
            scope['user'] = await get_user_from_token(token)
        else:
            logger.warning("⚠️ No token in query string")
            scope['user'] = AnonymousUser()
        
        return await super().__call__(scope, receive, send)


def TokenAuthMiddlewareStack(inner):
    """
    Helper function to wrap URLRouter with TokenAuthMiddleware
    """
    return TokenAuthMiddleware(inner)
