"""
ASGI config for caroud project.
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'caroud.settings')

django_asgi_app = get_asgi_application()

# Import after Django is set up
from game.routing import websocket_urlpatterns
from users.websocket_auth import TokenAuthMiddlewareStack

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        TokenAuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        )
    ),
})
