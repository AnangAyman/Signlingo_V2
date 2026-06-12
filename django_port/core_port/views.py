from django.http import JsonResponse

from legacy_port.models import User
from shared_port.view_helpers import _build_streak_data, _lesson_context, _render, _require_user, _user_shell_context
from signlingo_django.language import SESSION_KEY as LANGUAGE_SESSION_KEY


def home(request):
    # Keep the selected UI language while clearing transient game/result state.
    preserved_language = request.session.get(LANGUAGE_SESSION_KEY)
    for key in (
        "result_summary",
        "game_results",
        "ml_results",
        "google_oauth_state",
        "google_oauth_entry",
    ):
        request.session.pop(key, None)
    if preserved_language:
        request.session[LANGUAGE_SESSION_KEY] = preserved_language
    return _render(request, "landing_page.html", {"user": None})


def dashboard(request):
    # Aggregate the learner snapshot for the main signed-in home view.
    user, redirect_response = _require_user(request)
    if redirect_response:
        return redirect_response

    all_users = list(User.objects.order_by("-points", "id"))
    user_rank = next((index + 1 for index, row in enumerate(all_users) if row.id == user.id), None)
    today, streak_data, current_streak = _build_streak_data(user)
    lessons, current_lesson, completed_lessons_count, total_lessons_count, module_progress_percent = _lesson_context(user)
    context = _user_shell_context(user)
    context.update(
        {
            "user_id": user.id,
            "user_points": user.points,
            "user_league": user.league,
            "user_rank": user_rank,
            "streak_data": streak_data,
            "current_streak": current_streak,
            "today": today,
            "lessons": lessons,
            "current_lesson": current_lesson,
            "completed_lessons_count": completed_lessons_count,
            "total_lessons_count": total_lessons_count,
            "module_progress_percent": module_progress_percent,
            "module_complete": total_lessons_count > 0 and completed_lessons_count == total_lessons_count,
        }
    )
    return _render(request, "dashboard.html", context)


def start(request):
    return _render(request, "start.html")


def roadmap(request):
    # Reuse the same progress data model for the roadmap timeline page.
    user, redirect_response = _require_user(request)
    if redirect_response:
        return redirect_response

    all_users = list(User.objects.order_by("-points", "id"))
    user_rank = next((index + 1 for index, row in enumerate(all_users) if row.id == user.id), None)
    today, streak_data, current_streak = _build_streak_data(user)
    lessons, current_lesson, completed_lessons_count, total_lessons_count, module_progress_percent = _lesson_context(user)
    context = _user_shell_context(user)
    context.update(
        {
            "user_id": user.id,
            "user_points": user.points,
            "user_league": user.league,
            "user_rank": user_rank,
            "streak_data": streak_data,
            "current_streak": current_streak,
            "today": today,
            "lessons": lessons,
            "current_lesson": current_lesson,
            "completed_lessons_count": completed_lessons_count,
            "total_lessons_count": total_lessons_count,
            "module_progress_percent": module_progress_percent,
            "module_complete": total_lessons_count > 0 and completed_lessons_count == total_lessons_count,
        }
    )
    return _render(request, "roadmap.html", context)


def health(request):
    # Lightweight deployment probe used by Render and manual checks.
    return JsonResponse({"status": "ok", "framework": "django"})
