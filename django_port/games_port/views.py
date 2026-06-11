import json
import os
import random
from urllib.parse import urlparse

try:
    from google import genai
except ImportError:
    genai = None

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
from signlingo_django.language import get_request_language
from signlingo_django.translations import get_translation


# ----------------------------------- RESULT SUMMARY SYSTEM -----------------------------------
def _frontend_app_url(request):
    configured = os.environ.get("FRONTEND_APP_URL", "").rstrip("/")
    if configured:
        return configured

    referer = request.META.get("HTTP_REFERER", "")
    parsed = urlparse(referer)
    if parsed.scheme and parsed.netloc and parsed.netloc != request.get_host():
        return f"{parsed.scheme}://{parsed.netloc}".rstrip("/")
    return ""


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
            "frontend_app_url": _frontend_app_url(request),
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
            "frontend_app_url": _frontend_app_url(request),
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
    question = dict(_pick_question(request, "ml", game_services.load_ml_questions()))
    language = get_request_language(request)
    prompt_template = get_translation(language, "game.ml.prompt_template")
    question["question"] = prompt_template.format(letter=question.get("answer", ""))
    return JsonResponse(question)


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
    context["frontend_dashboard_url"] = _frontend_app_url(request)
    return _render(request, "magic_touch_game.html", context)


def magic_touch_advanced(request):
    user, redirect_response = _require_user(request)
    if redirect_response:
        return redirect_response
    context = _user_shell_context(user)
    context["frontend_dashboard_url"] = _frontend_app_url(request)
    return _render(request, "magic_touch_advanced.html", context)


@csrf_exempt
def predict_gru(request):
    try:
        payload = json.loads(request.body or "{}")
        sequence = payload.get("sequence")
        if not sequence or len(sequence) != 30:
            return JsonResponse({"error": "Invalid sequence provided, must be length 30."}, status=400)

        result = game_services.predict_gru_sequence(sequence)
        request.session["today_login"] = True
        return JsonResponse(result)
    except Exception as exc:
        print(f"Prediction Error: {exc}")
        return JsonResponse({"error": "Prediction failed due to an ML runtime error."}, status=500)


def translation_mode(request):
    user, redirect_response = _require_user(request)
    if redirect_response:
        return redirect_response
    context = _user_shell_context(user)
    context["frontend_dashboard_url"] = _frontend_app_url(request)
    return _render(request, "translation_mode.html", context)


@csrf_exempt
def translate_sequence(request):
    user, redirect_response = _require_user(request)
    if redirect_response:
        return JsonResponse({"error": "unauthorized"}, status=401)

    try:
        payload = json.loads(request.body or "{}")
        words = payload.get("words", [])
        if not words:
            return JsonResponse({"error": "No words provided."}, status=400)

        if not genai:
            return JsonResponse({"error": "google-genai library is not installed."}, status=500)

        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return JsonResponse({"error": "GEMINI_API_KEY environment variable is not set."}, status=500)

        client = genai.Client(api_key=api_key)
        prompt = (
            "You are given a list of words. Combine them into one natural Indonesian sentence.\n"
            "Add connecting words such as 'dan', 'karena', 'lalu', 'di', or 'ke' when needed. "
            "Do not just list the words.\n\n"
            "Examples:\n"
            "Words: Saya, Makan, Tidur\n"
            'Translation: {"translation": "Saya makan dan tidur."}\n\n'
            "Words: Saya, Makan, Tidur, Mereka, Bingung\n"
            'Translation: {"translation": "Mereka bingung karena saya makan dan tidur."}\n\n'
            "Words: Bapak, Beli, Baju, Celana\n"
            'Translation: {"translation": "Bapak membeli baju dan celana."}\n\n'
            "Now process this sequence:\n"
            f"Words: {', '.join(str(word) for word in words)}\n"
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={
                "system_instruction": (
                    'Respond only with a valid JSON object containing the "translation" key. '
                    "Never output markdown formatting or additional commentary."
                ),
                "response_mime_type": "application/json",
            },
        )

        raw_text = (response.text or "").strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        elif raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()

        try:
            response_data = json.loads(raw_text)
            translated_text = response_data.get("translation", raw_text)
        except Exception:
            import re

            json_match = re.search(r"\{.*\}", raw_text, re.DOTALL)
            if json_match:
                try:
                    response_data = json.loads(json_match.group())
                    translated_text = response_data.get("translation", raw_text)
                except Exception:
                    translated_text = raw_text
            else:
                translated_text = raw_text

        request.session["today_login"] = True
        return JsonResponse({"translated": translated_text, "user_id": user.id})
    except Exception as exc:
        print(f"Translation Error: {exc}")
        return JsonResponse({"error": "Translation failed due to an error."}, status=500)
