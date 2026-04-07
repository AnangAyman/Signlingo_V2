import os

from django.core.wsgi import get_wsgi_application


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "signlingo_django.settings")

application = get_wsgi_application()
