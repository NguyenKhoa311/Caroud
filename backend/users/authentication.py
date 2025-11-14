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
        
        # Debug logging
        print(f"🔍 [CognitoAuth] Auth Header: {auth_header[:50] if auth_header else 'None'}...")
        
        if not auth_header.startswith('Bearer '):
            print("❌ [CognitoAuth] No Bearer token found, skipping Cognito auth")
            return None

        token = auth_header.split(' ')[1]
        print(f"🔑 [CognitoAuth] Token received (first 20 chars): {token[:20]}...")

        try:
            # Get JWKS from Cognito
            jwks_url = settings.AWS_COGNITO_JWKS_URL
            print(f"🔗 [CognitoAuth] Fetching JWKS from: {jwks_url}")
            
            jwks_response = requests.get(jwks_url)
            jwks = jwks_response.json()
            print(f"✅ [CognitoAuth] JWKS fetched successfully")

            # Decode token header to get kid
            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header['kid']
            print(f"🔑 [CognitoAuth] Token kid: {kid}")

            # Find the correct key
            key = None
            for jwk in jwks['keys']:
                if jwk['kid'] == kid:
                    key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(jwk))
                    print(f"✅ [CognitoAuth] Found matching key for kid: {kid}")
                    break

            if key is None:
                print(f"❌ [CognitoAuth] Public key not found for kid: {kid}")
                raise exceptions.AuthenticationFailed('Public key not found')

            # Verify and decode the token
            # id_token uses 'aud' claim, access_token doesn't
            # Try to decode with audience verification first
            print(f"🔐 [CognitoAuth] Attempting to decode token...")
            try:
                payload = jwt.decode(
                    token,
                    key,
                    algorithms=['RS256'],
                    audience=settings.AWS_COGNITO_APP_CLIENT_ID,
                    options={'verify_exp': True}
                )
                print(f"✅ [CognitoAuth] Token decoded with audience verification")
            except jwt.InvalidAudienceError:
                print(f"⚠️  [CognitoAuth] Audience verification failed, trying without...")
                # If audience verification fails, try without it (for access tokens)
                payload = jwt.decode(
                    token,
                    key,
                    algorithms=['RS256'],
                    options={'verify_exp': True, 'verify_aud': False}
                )
                print(f"✅ [CognitoAuth] Token decoded without audience verification")

            # Get user info from token
            cognito_id = payload.get('sub')
            email = payload.get('email')
            username = payload.get('cognito:username') or email.split('@')[0] if email else 'cognito_user'
            
            print(f"✅ [CognitoAuth] Token verified - Cognito ID: {cognito_id}, Email: {email}")

            # Try to find user by cognito_id first (most reliable)
            try:
                user = User.objects.get(cognito_id=cognito_id)
                print(f"✅ [CognitoAuth] Found user by cognito_id: {user.username}")
            except User.DoesNotExist:
                print(f"⚠️  [CognitoAuth] User not found by cognito_id, trying email...")
                # If not found, try by email (for users created by Lambda before first login)
                if email:
                    try:
                        user = User.objects.get(email=email)
                        print(f"✅ [CognitoAuth] Found user by email: {user.username}")
                        # Update cognito_id if it was empty
                        if not user.cognito_id:
                            user.cognito_id = cognito_id
                            user.save(update_fields=['cognito_id'])
                            print(f"✅ [CognitoAuth] Updated user cognito_id")
                    except User.DoesNotExist:
                        print(f"⚠️  [CognitoAuth] User not found by email, creating new user...")
                        # Create new user if not exists at all
                        user = User.objects.create(
                            cognito_id=cognito_id,
                            username=username,
                            email=email,
                            password='COGNITO_USER_PASSWORD_DISABLED',  # Match Lambda trigger
                        )
                        print(f"✅ [CognitoAuth] Created new user: {user.username}")
                else:
                    print(f"⚠️  [CognitoAuth] No email in token, creating minimal user...")
                    # No email in token, create minimal user
                    user = User.objects.create(
                        cognito_id=cognito_id,
                        username=username or f'cognito_{cognito_id[:8]}',
                        password='COGNITO_USER_PASSWORD_DISABLED',
                    )
                    print(f"✅ [CognitoAuth] Created minimal user: {user.username}")

            print(f"🎉 [CognitoAuth] Authentication successful for user: {user.username}")
            return (user, token)

        except jwt.ExpiredSignatureError:
            print("❌ [CognitoAuth] Token expired")
            raise exceptions.AuthenticationFailed('Token has expired')
        except jwt.InvalidTokenError as e:
            print(f"❌ [CognitoAuth] Invalid token: {str(e)}")
            raise exceptions.AuthenticationFailed('Invalid token')
        except Exception as e:
            print(f"❌ [CognitoAuth] Authentication error: {type(e).__name__}: {str(e)}")
            import traceback
            traceback.print_exc()
            raise exceptions.AuthenticationFailed(f'Authentication failed: {str(e)}')
