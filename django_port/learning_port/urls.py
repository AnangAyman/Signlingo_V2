from django.urls import path

from . import views


urlpatterns = [
    path("video_learning", views.video_learning, name="video_learning"),
    path("mark-lesson-status", views.mark_lesson_status, name="mark_lesson_status"),
    path("course", views.course, name="course"),
]
