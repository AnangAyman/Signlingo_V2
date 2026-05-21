"""Simple CORS middleware for the Next.js frontend.

Allows requests from localhost:3000 during development without requiring the
django-cors-headers package.  For production, add your deployed frontend origin
to the CORS_ALLOWED_ORIGINS environment variable (comma-separated).
"""

import os

from django.http import HttpResponse

_DEFAULT_ALLOWED_ORIGINS = {
    "http://localhost:3000",
    "http://127.0.0.1:3000",
}

_ALLOW_HEADERS = "Content-Type, Accept, X-CSRFToken, X-Requested-With"
_ALLOW_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS"


class CorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Handle pre-flight requests without going through the view layer.
        if request.method == "OPTIONS":
            response = HttpResponse()
            self._add_cors_headers(response, request)
            return response

        response = self.get_response(request)
        self._add_cors_headers(response, request)
        return response

    # ------------------------------------------------------------------
    def _allowed_origins(self):
        extra = {
            o.strip()
            for o in os.environ.get("CORS_ALLOWED_ORIGINS", "").split(",")
            if o.strip()
        }
        return _DEFAULT_ALLOWED_ORIGINS | extra

    def _add_cors_headers(self, response, request):
        origin = request.META.get("HTTP_ORIGIN", "")
        if origin in self._allowed_origins():
            response["Access-Control-Allow-Origin"] = origin
        response["Access-Control-Allow-Credentials"] = "true"
        response["Access-Control-Allow-Methods"] = _ALLOW_METHODS
        response["Access-Control-Allow-Headers"] = _ALLOW_HEADERS
        response["Access-Control-Max-Age"] = "86400"
