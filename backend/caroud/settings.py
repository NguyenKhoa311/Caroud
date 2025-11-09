"""
Django settings for caroud project.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Build paths inside the project
BASE_DIR = Path(__file__).resolve().parent.parent

# Security settings
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-change-this-in-production')
DEBUG = os.getenv('DEBUG', 'True') == 'True'

# Allow all hosts in development, restrict in production
if DEBUG:
    ALLOWED_HOSTS = ['*']
else:
    ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# Always include these hosts for CloudFront/Nginx integration
ALLOWED_HOSTS.extend([
    'api.caroud.click',
    '13.215.198.23',
    'localhost',
    '127.0.0.1',
])

# Nginx reverse proxy settings
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Application definition
INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party apps
    'rest_framework',
    'rest_framework.authtoken',  # Add token authentication
    'corsheaders',
    'channels',
    'drf_yasg',
    
    # Local apps
    'users',
    'game',
    'matchmaking',
    'ai',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'users.middleware.SingleSessionMiddleware',  # Single session enforcement
    'users.middleware.SessionHeartbeatMiddleware',  # Track last login
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'caroud.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'caroud.wsgi.application'
ASGI_APPLICATION = 'caroud.asgi.application'

# Database - PostgreSQL
DATABASES = {
    'default': {
        'ENGINE': os.getenv('DB_ENGINE', 'django.db.backends.postgresql'),
        'NAME': os.getenv('DB_NAME', 'caro_game_db'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD', 'postgres'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}

# Channels
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [os.getenv('REDIS_URL', 'redis://localhost:6379')],
        },
    },
}

# Redis Configuration (for caching and matchmaking)
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_PASSWORD = os.getenv('REDIS_PASSWORD', None)  # For ElastiCache with auth token
REDIS_URL = os.getenv('REDIS_URL', f'redis://{REDIS_HOST}:{REDIS_PORT}')

# Django Cache (using Redis)
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': REDIS_URL,
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'PASSWORD': REDIS_PASSWORD,
            'SOCKET_CONNECT_TIMEOUT': 5,
            'SOCKET_TIMEOUT': 5,
            'RETRY_ON_TIMEOUT': True,
            'MAX_CONNECTIONS': 50,
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 50,
                'retry_on_timeout': True,
            }
        },
        'KEY_PREFIX': 'caroud',
        'TIMEOUT': 300,  # Default cache timeout: 5 minutes
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS Settings
# In development: Allow all origins from local network
# In production: Should be restricted to specific domains
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOWED_ORIGINS = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://caroud.click',  # CloudFront production domain
        'https://d3qvzoyja2mw99.cloudfront.net',  # CloudFront direct domain
    ]

# Always allow these origins regardless of DEBUG mode
CORS_ALLOWED_ORIGINS = list(set([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://caroud.click',
    'https://d3qvzoyja2mw99.cloudfront.net',
]))
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',  # Token auth for email/password
        'users.authentication.CognitoAuthentication',  # Cognito auth for social login
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',  # Changed from IsAuthenticatedOrReadOnly to allow game access
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
}

# AWS Cognito Settings
AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')
AWS_COGNITO_USER_POOL_ID = os.getenv('AWS_COGNITO_USER_POOL_ID', '')
AWS_COGNITO_APP_CLIENT_ID = os.getenv('AWS_COGNITO_APP_CLIENT_ID', '')
AWS_COGNITO_JWKS_URL = os.getenv('AWS_COGNITO_JWKS_URL', '')

# Game Settings
INITIAL_ELO_RATING = int(os.getenv('INITIAL_ELO_RATING', '1200'))
ELO_K_FACTOR = int(os.getenv('ELO_K_FACTOR', '32'))
MATCHMAKING_ELO_RANGE = int(os.getenv('MATCHMAKING_ELO_RANGE', '100'))
MOVE_TIME_LIMIT = int(os.getenv('MOVE_TIME_LIMIT', '30'))

# Custom User Model
AUTH_USER_MODEL = 'users.User'

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}
