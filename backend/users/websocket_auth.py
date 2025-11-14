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
        # Try to get token from database (DRF Token)
        token = Token.objects.get(key=token_string)
        user = token.user
        logger.info(f"✅ Authenticated user: {user.username} (ID: {user.id})")
        return user
    except Token.DoesNotExist:
        # Token might be Cognito JWT or custom JWT
        try:
            import jwt
            import requests
            from django.conf import settings
            
            # First, try to decode as Cognito JWT (RS256)
            try:
                # Cognito JWKS URL
                region = 'ap-southeast-1'
                user_pool_id = 'ap-southeast-1_MffQbWHoJ'
                jwks_url = f'https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json'
                
                # Fetch JWKS
                jwks_response = requests.get(jwks_url)
                jwks = jwks_response.json()
                
                # Get token header to find the key
                unverified_header = jwt.get_unverified_header(token_string)
                kid = unverified_header.get('kid')
                
                # Find the matching key
                key = None
                for jwk_key in jwks['keys']:
                    if jwk_key['kid'] == kid:
                        key = jwt.algorithms.RSAAlgorithm.from_jwk(jwk_key)
                        break
                
                if not key:
                    raise Exception('Matching key not found in JWKS')
                
                # Decode and verify Cognito JWT
                client_id = '7r5jtsi7pmgvpuu3hroso4qm7m'
                
                # Try with audience verification first
                try:
                    payload = jwt.decode(
                        token_string, 
                        key, 
                        algorithms=['RS256'],
                        audience=client_id,
                        options={'verify_exp': True}
                    )
                except jwt.InvalidAudienceError:
                    # If audience check fails, try without it (for id_token)
                    payload = jwt.decode(
                        token_string, 
                        key, 
                        algorithms=['RS256'],
                        options={'verify_exp': True, 'verify_aud': False}
                    )
                
                # Get Cognito user ID
                cognito_id = payload.get('sub')
                email = payload.get('email')
                
                logger.info(f"✅ Cognito JWT verified - sub: {cognito_id}, email: {email}")
                
                # Find or create user
                try:
                    user = User.objects.get(cognito_id=cognito_id)
                    logger.info(f"✅ Found user by cognito_id: {user.username}")
                    return user
                except User.DoesNotExist:
                    # Try by email
                    if email:
                        try:
                            user = User.objects.get(email=email)
                            logger.info(f"✅ Found user by email: {user.username}")
                            return user
                        except User.DoesNotExist:
                            pass
                    
                    logger.warning(f"❌ User not found for cognito_id: {cognito_id}")
                    return AnonymousUser()
                    
            except Exception as cognito_error:
                logger.warning(f"⚠️ Not a valid Cognito JWT: {cognito_error}")
                
                # Fall back to trying Django JWT (HS256)
                payload = jwt.decode(token_string, settings.SECRET_KEY, algorithms=['HS256'])
                user_id = payload.get('user_id')
                
                if user_id:
                    user = User.objects.get(id=user_id)
                    logger.info(f"✅ Authenticated user (Django JWT): {user.username} (ID: {user.id})")
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
