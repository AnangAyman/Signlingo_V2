from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path("api/auth/login", views.api_login, name="api_login"),
    path("api/auth/register", views.api_register, name="api_register"),
    path("api/auth/logout", views.api_logout, name="api_logout"),
    path("api/auth/me", views.api_me, name="api_me"),
    # Gamification — persist earned XP to the database
    path("api/add-xp", views.api_add_xp, name="api_add_xp"),
    path("api/game-score", views.api_game_score, name="api_game_score"),
    # Dashboard
    path("api/dashboard", views.api_dashboard, name="api_dashboard"),
    # Leaderboard
    path("api/leaderboard", views.api_leaderboard, name="api_leaderboard"),
    # Lessons
    path("api/lessons", views.api_lessons, name="api_lessons"),
    path("api/lessons/mark-status", views.api_mark_lesson, name="api_mark_lesson"),
    # Social / Friends
    path("api/friends/<int:friend_id>/add", views.api_add_friend, name="api_add_friend"),
    path("api/friends/<int:friend_id>/remove", views.api_remove_friend, name="api_remove_friend"),
    path("api/users/search", views.api_search_users, name="api_search_users"),
]
