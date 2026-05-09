from django.urls import path

from . import views


urlpatterns = [
    path("save-session-results", views.save_session_results, name="save_session_results"),
    path("result-summary", views.result_summary, name="result_summary"),
    path("get-summary-results", views.get_summary_results, name="get_summary_results"),
    path("ml_game", views.ml_game, name="ml_game"),
    path("decrement_life", views.decrement_life, name="decrement_life"),
    path("gamepage", views.gamepage, name="gamepage"),
    path("get-question", views.get_question, name="get_question"),
    path("get-question-ml", views.get_question_ml, name="get_question_ml"),
    path("check-answer", views.check_answer, name="check_answer"),
    path("capture", views.capture_page, name="capture_page"),
    path("predict", views.predict, name="predict"),
    path("magic_touch", views.magic_touch, name="magic_touch"),
]
