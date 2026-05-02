from django.urls import path

from . import views


urlpatterns = [
    path("register", views.register, name="register"),
    path("verify/<str:token>", views.verify_email, name="verify_email"),
    path("login", views.login, name="login"),
    path("login/google", views.google_login, name="google_login"),
    path("login/google/callback", views.google_callback, name="google_callback"),
    path("logout", views.logout, name="logout"),
    path("forgot-password", views.forgot_password, name="forgot_password"),
    path("reset_password/<str:token>", views.reset_password, name="reset_password"),
    path("edit-account", views.edit_account, name="edit_account"),
]
