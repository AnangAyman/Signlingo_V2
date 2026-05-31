from django.urls import include, path


app_name = "auth"


urlpatterns = [
    # Keep the project router thin and delegate feature URLs to dedicated apps.
    path("", include("core_port.urls")),
    path("", include("accounts_port.urls")),
    path("", include("social_port.urls")),
    path("", include("learning_port.urls")),
    path("", include("games_port.urls")),
    path("", include("commerce_port.urls")),
    # JSON API endpoints consumed by the Next.js frontend.
    path("", include("api_port.urls")),
]
