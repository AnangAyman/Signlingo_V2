from django.contrib import admin
from django.urls import include, path


urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include(("signlingo_django.app_urls", "auth"), namespace="auth")),
]
