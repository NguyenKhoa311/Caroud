import json
import jwt
import requests
from django.conf import settings
from rest_framework import authentication, exceptions
from .models import User


class CognitoAuthentication(authentication.BaseAuthentication):
    """
    Authentication backend for AWS Cognito JWT tokens
    """

    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if not auth_header.startswith('Bearer '):
            return None

        token = auth_header.split(' ')[1]

        try:
            # Get JWKS from Cognito
            jwks_url = settings.AWS_COGNITO_JWKS_URL
            jwks_response = requests.get(jwks_url)
            jwks = jwks_response.json()

            # Decode token header to get kid
            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header['kid']

            # Find the correct key
            key = None
            for jwk in jwks['keys']:
                if jwk['kid'] == kid:
                    key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(jwk))
                    break

            if key is None:
                raise exceptions.AuthenticationFailed('Public key not found')

            # Verify and decode the token
            payload = jwt.decode(
                token,
                key,
                algorithms=['RS256'],
                audience=settings.AWS_COGNITO_APP_CLIENT_ID,
                options={'verify_exp': True}
            )

            # Get or create user
            cognito_id = payload.get('sub')
            email = payload.get('email')
            username = payload.get('cognito:username') or email.split('@')[0]

            user, created = User.objects.get_or_create(
                cognito_id=cognito_id,
                defaults={
                    'username': username,
                    'email': email,
                }
            )

            return (user, token)

        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('Token has expired')
        except jwt.InvalidTokenError:
            raise exceptions.AuthenticationFailed('Invalid token')
        except Exception as e:
            raise exceptions.AuthenticationFailed(f'Authentication failed: {str(e)}')
