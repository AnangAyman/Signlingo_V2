from django.urls import path

from . import views


urlpatterns = [
    path("leaderboard", views.leaderboard, name="leaderboard"),
    path("users", views.list_users, name="list_users"),
    path("add_friend/<int:friend_id>", views.add_friend, name="add_friend"),
    path("remove_friend/<int:friend_id>", views.remove_friend, name="remove_friend"),
    path("search-users", views.search_users, name="search_users"),
]
