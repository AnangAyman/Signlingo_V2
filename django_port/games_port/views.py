import json
import os
import random

from django.http import JsonResponse
from django.shortcuts import redirect
from django.views.decorators.csrf import csrf_exempt

from games_port import services as game_services
from shared_port.view_helpers import (
    UPLOAD_DIR,
    _lesson_context,
    _pick_question,
    _render,
    _require_user,
    _store_session_results,
    _user_shell_context,
)


# ----------------------------------- RESULT SUMMARY SYSTEM -----------------------------------
@csrf_exempt
def save_session_results(request):
    # Store per-session results so the result page can summarize mixed game modes.
    user, redirect_response = _require_user(request)
    if redirect_response:
        return JsonResponse({"success": False, "error": "User not logged in"}, status=401)

    payload = json.loads(request.body or "{}")
    session_type = payload.get("type")  # 'game' or 'ml'
    if session_type not in {"game", "ml"}:
        return JsonResponse({"success": False, "error": "Invalid session type"}, status=400)

    _store_session_results(request, payload)
    return JsonResponse({"success": True, "message": f"{session_type} results saved.", "user_id": user.id})


def result_summary(request):
    user, redirect_response = _require_user(request)
    if redirect_response:
        return redirect_response
    return _render(request, "result_summary.html", _user_shell_context(user))


def get_summary_results(request):
    game_data = request.session.get("game_results", {"xp": 0, "accuracy": 0, "skipped": True})
    ml_data = request.session.get("ml_results", {"xp": 0, "accuracy": 0, "skipped": True})

    total_xp = 0
    total_accuracy = 0
    completed_count = 0
    for data in (game_data, ml_data):
        if not data.get("skipped", False):
            total_xp += data.get("xp", 0)
            total_accuracy += data.get("accuracy", 0)
            completed_count += 1

    average_accuracy = (total_accuracy / completed_count) if completed_count else 0
    return JsonResponse({"total_xp": total_xp, "average_accuracy": average_accuracy})


# ----------------------------------- GAME PAGE ------------------------------------------------
def ml_game(request):
    # Keep the ML game inside the same Django route tree as the rest of the product.
    # Lessons are expected to exist already from the bootstrap seed step.
    user, redirect_response = _require_user(request)
    if redirect_response:
        return redirect_response
    lessons, current_lesson, completed_lessons_count, total_lessons_count, module_progress_percent = _lesson_context(user)
    context = _user_shell_context(user)
    context.update(
        {
            "lessons": lessons,
            "current_lesson": current_lesson,
            "completed_lessons_count": completed_lessons_count,
            "total_lessons_count": total_lessons_count,
            "module_progress_percent": module_progress_percent,
        }
    )
    return _render(request, "ml_game.html", context)


@csrf_exempt
def decrement_life(request):
    user, redirect_response = _require_user(request)
    if redirect_response:
        return JsonResponse({"error": "unauthorized"}, status=401)

    # Return the new number of lives after decrementing.
    user.lives = max(user.lives - 1, 0)
    user.save(update_fields=["lives"])
    return JsonResponse({"success": True, "new_lives": user.lives})


def gamepage(request):
    # The sidebar progress data comes from shared lesson state, not from the per-question progress bar JS.
    # The existing progress bar inside the quiz card is still a separate front-end concern.
    user, redirect_response = _require_user(request)
    if redirect_response:
        return redirect_response
    lessons, current_lesson, completed_lessons_count, total_lessons_count, module_progress_percent = _lesson_context(user)
    context = _user_shell_context(user)
    context.update(
        {
            "lessons": lessons,
            "current_lesson": current_lesson,
            "completed_lessons_count": completed_lessons_count,
            "total_lessons_count": total_lessons_count,
            "module_progress_percent": module_progress_percent,
        }
    )
    return _render(request, "game_page.html", context)


def get_question(request):
    # Shuffle answer choices client-side consumers receive to avoid fixed ordering.
    question = dict(_pick_question(request, "quiz", game_services.load_questions()))
    if question.get("choices"):
        question["choices"] = random.sample(question["choices"], len(question["choices"]))  # Shuffle choices.
    return JsonResponse(question)


def get_question_ml(request):
    # Keep the correct answer in the payload so the existing client logic can score responses.
    return JsonResponse(_pick_question(request, "ml", game_services.load_ml_questions()))


@csrf_exempt
def check_answer(request):
    user, redirect_response = _require_user(request)
    if redirect_response:
        return JsonResponse({"error": "unauthorized"}, status=401)

    payload = json.loads(request.body or "{}")
    selected = payload.get("selectedAnswer", payload.get("selected"))
    expected = payload.get("correctAnswer", payload.get("correct"))
    correct = selected == expected
    if correct:
        # Add 10 points for a correct answer, matching the legacy gameplay reward.
        user.points = (user.points or 0) + 10
        user.save(update_fields=["points"])

    request.session["today_login"] = True
    return JsonResponse({"result": correct, "points": user.points})


def capture_page(request):
    # The old Flask capture page now routes users straight into the Django ML game flow.
    return redirect("auth:ml_game")


@csrf_exempt
def predict(request):
    # Receive image blob from the browser and hand it to the Django-side ML service layer.
    # If the ML runtime fails unexpectedly, surface a real error instead of inventing a fake prediction.
    file_obj = request.FILES.get("image")
    if not file_obj:
        return JsonResponse({"error": "No image provided"}, status=400)

    try:
        debug_upload_dir = UPLOAD_DIR if os.environ.get("SIGNLINGO_SAVE_PREDICTION_DEBUG", "").lower() == "true" else None
        payload = game_services.predict_bisindo_image(file_obj.read(), upload_dir=debug_upload_dir)
        request.session["today_login"] = True
        return JsonResponse(payload)
    except ValueError as exc:
        return JsonResponse({"error": str(exc)}, status=400)
    except Exception:
        return JsonResponse({"error": "Prediction failed due to an ML runtime error."}, status=500)


def magic_touch(request):
    user, redirect_response = _require_user(request)
    if redirect_response:
        return redirect_response
    context = _user_shell_context(user)
    context["frontend_dashboard_url"] = os.environ.get("FRONTEND_APP_URL", "").rstrip("/")
    return _render(request, "magic_touch_game.html", context)
