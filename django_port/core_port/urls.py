from django.urls import path

from . import views


urlpatterns = [
    path("", views.home, name="home"),
    path("health/", views.health, name="health"),
    path("dashboard", views.dashboard, name="dashboard"),
    path("start", views.start, name="start"),
    path("roadmap", views.roadmap, name="roadmap"),
]
