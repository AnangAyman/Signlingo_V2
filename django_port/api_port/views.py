"""JSON API endpoints for the Next.js frontend.

All responses are application/json.  Session-based authentication is used
(same mechanism as the legacy HTML views) so the frontend must send
credentials: "include" on every fetch call.

URL prefix: /api/
"""

import json

from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from legacy_port.models import User, UserLessonStatus
from legacy_port.services import generate_username, get_initials
from shared_port.view_helpers import (
    _current_user,
    _leaderboard_lists,
    _lesson_context,
    compute_current_streak,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _user_to_json(user: User) -> dict:
    """Serialise a User instance to the shape the Next.js frontend expects."""
    return {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
        "xp": user.points,
        "bestGameScore": user.best_game_score,
        "level": max(1, user.points // 500 + 1),
        "league": user.league.lower(),
        "dailyStreak": compute_current_streak(user),
        "lives": user.lives,
        "username": user.username or "",
        "lessonsCompleted": UserLessonStatus.objects.filter(
            user=user, status="completed"
        ).count(),
        "quizzesCompleted": user.quizzes_completed,
        "aiPracticesCompleted": user.ai_practices_completed,
    }


def _parse_json_body(request) -> dict:
    try:
        return json.loads(request.body or b"{}")
    except json.JSONDecodeError:
        return {}


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

@csrf_exempt
def api_login(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    data = _parse_json_body(request)
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = User.objects.filter(email=email).first()
    if user is None or not user.check_password(password, upgrade_legacy=True):
        return JsonResponse({"error": "Invalid email or password."}, status=401)

    user.is_verified = True
    user.last_login_date = timezone.localdate()
    # Keep API login aligned with the Django account views, including legacy password upgrades.
    update_fields = ["is_verified", "last_login_date"]
    if user.password_is_hashed():
        update_fields.append("password")
    user.save(update_fields=update_fields)

    request.session["user_id"] = user.id
    request.session["user"] = user.email

    return JsonResponse({"user": _user_to_json(user)})


@csrf_exempt
def api_register(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    data = _parse_json_body(request)
    name = (data.get("name") or "").strip() or "New Learner"
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return JsonResponse({"error": "Email and password are required."}, status=400)

    if User.objects.filter(email=email).exists():
        return JsonResponse({"error": "Email already registered."}, status=400)

    first_name, _ = get_initials(name)
    user = User(
        name=name,
        email=email,
        username=generate_username(first_name),
        is_verified=True,
        last_login_date=timezone.localdate(),
    )
    user.set_password(password)
    user.save()

    request.session["user_id"] = user.id
    request.session["user"] = user.email

    return JsonResponse({"user": _user_to_json(user)}, status=201)


@csrf_exempt
def api_logout(request):
    request.session.flush()
    return JsonResponse({"success": True})


def api_me(request):
    user = _current_user(request)
    if user is None:
        return JsonResponse({"error": "Not authenticated"}, status=401)
    return JsonResponse({"user": _user_to_json(user)})


@csrf_exempt
def api_add_xp(request):
    """Persist earned XP to the user's points so it survives navigation/reload.

    XP shown in the app is `user.points`; client-side gamification gains were not
    written back, so they reset whenever the store re-synced from the server.
    This endpoint commits a gain to the database.
    """
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    user = _current_user(request)
    if user is None:
        return JsonResponse({"error": "Not authenticated"}, status=401)

    data = _parse_json_body(request)
    try:
        amount = int(data.get("amount", 0))
    except (TypeError, ValueError):
        amount = 0
    # Clamp to a sane per-call range to avoid runaway or abusive values.
    amount = max(0, min(amount, 1000))

    user.points = (user.points or 0) + amount
    user.save(update_fields=["points"])
    return JsonResponse({"success": True, "xp": user.points})


@csrf_exempt
def api_reset_progress(request):
    """Reset the current user's gamification state to a clean slate.

    Backs the "reset demo state" button so a fresh demo recording starts from
    zero (XP, best game score, streak) instead of injecting fake demo numbers.
    Lesson completion history is intentionally left untouched.
    """
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    user = _current_user(request)
    if user is None:
        return JsonResponse({"error": "Not authenticated"}, status=401)

    user.points = 0
    user.best_game_score = 0
    user.streak = 0
    user.quizzes_completed = 0
    user.ai_practices_completed = 0
    user.save(update_fields=[
        "points", "best_game_score", "streak", "quizzes_completed", "ai_practices_completed",
    ])
    # Also clear lesson progress so a demo run starts from a fully clean slate.
    UserLessonStatus.objects.filter(user=user).delete()
    return JsonResponse({"success": True, "user": _user_to_json(user)})


@csrf_exempt
def api_quiz_completed(request):
    """Increment the user's completed-quiz counter (drives the quiz badge)."""
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    user = _current_user(request)
    if user is None:
        return JsonResponse({"error": "Not authenticated"}, status=401)

    user.quizzes_completed = (user.quizzes_completed or 0) + 1
    user.save(update_fields=["quizzes_completed"])
    return JsonResponse({"success": True, "quizzesCompleted": user.quizzes_completed})


@csrf_exempt
def api_ai_practice_completed(request):
    """Increment the AI camera practice counter (drives the AI Explorer badge)."""
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    user = _current_user(request)
    if user is None:
        return JsonResponse({"error": "Not authenticated"}, status=401)

    user.ai_practices_completed = (user.ai_practices_completed or 0) + 1
    user.save(update_fields=["ai_practices_completed"])
    return JsonResponse({"success": True, "aiPracticesCompleted": user.ai_practices_completed})


@csrf_exempt
def api_spend_xp(request):
    """Deduct XP from the user's points when redeeming a reward in the shop.

    Mirror of `api_add_xp`: the rewards shop decrements XP client-side, but that
    gain was never written back, so the spend reverted on the next server re-sync.
    This commits the deduction (never below zero).
    """
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    user = _current_user(request)
    if user is None:
        return JsonResponse({"error": "Not authenticated"}, status=401)

    data = _parse_json_body(request)
    try:
        amount = int(data.get("amount", 0))
    except (TypeError, ValueError):
        amount = 0
    amount = max(0, min(amount, 1000))

    current = user.points or 0
    if amount > current:
        return JsonResponse({"error": "Not enough XP", "xp": current}, status=400)

    user.points = current - amount
    user.save(update_fields=["points"])
    return JsonResponse({"success": True, "xp": user.points})


@csrf_exempt
def api_game_score(request):
    """Record the best Magic Touch game score (shown next to XP on the leaderboard)."""
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    user = _current_user(request)
    if user is None:
        return JsonResponse({"error": "Not authenticated"}, status=401)

    data = _parse_json_body(request)
    try:
        score = int(data.get("score", 0))
    except (TypeError, ValueError):
        score = 0
    score = max(0, min(score, 1_000_000))

    if score > (user.best_game_score or 0):
        user.best_game_score = score
        user.save(update_fields=["best_game_score"])
    return JsonResponse({"success": True, "bestGameScore": user.best_game_score})


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

def api_dashboard(request):
    user = _current_user(request)
    if user is None:
        return JsonResponse({"error": "Not authenticated"}, status=401)

    lessons, current_lesson, completed_count, total_count, progress_pct = _lesson_context(user)
    global_rank_ids = list(User.objects.order_by("-points", "id").values_list("id", flat=True))
    user_rank = (global_rank_ids.index(user.id) + 1) if user.id in global_rank_ids else None

    return JsonResponse({
        "user": _user_to_json(user),
        "rank": user_rank,
        "currentStreak": user.streak,
        "completedLessons": completed_count,
        "totalLessons": total_count,
        "moduleProgressPercent": round(progress_pct, 1),
        "currentLesson": (
            {"id": current_lesson.id, "title": current_lesson.title, "url": current_lesson.url}
            if current_lesson else None
        ),
    })


# ---------------------------------------------------------------------------
# Leaderboard
# ---------------------------------------------------------------------------

def api_leaderboard(request):
    user = _current_user(request)
    if user is None:
        return JsonResponse({"error": "Not authenticated"}, status=401)

    view_type = request.GET.get("type", "global")

    # Pre-fetch friend IDs so we avoid N+1 queries in the loop.
    friend_ids: set = set(user.friendships.values_list("friend_id", flat=True))

    if view_type == "friends":
        _, _ = _leaderboard_lists(user)  # we only use friends_board
        friends_board, _ = _leaderboard_lists(user)
        source = friends_board
    else:
        source = list(User.objects.order_by("-points", "id"))

    entries = [
        {
            "id": str(u.id),
            "rank": i + 1,
            "username": u.username or u.name,
            "xp": u.points,
            "weeklyXp": u.points,
            "bestGameScore": u.best_game_score,
            "isCurrentUser": u.id == user.id,
            "isFriend": u.id in friend_ids,
            "league": u.league.lower(),
            "isOnline": False,
            "weeklyChange": "same",
        }
        for i, u in enumerate(source)
    ]

    return JsonResponse({"entries": entries})


# ---------------------------------------------------------------------------
# Lessons
# ---------------------------------------------------------------------------

def api_lessons(request):
    user = _current_user(request)
    if user is None:
        return JsonResponse({"error": "Not authenticated"}, status=401)

    lessons, current_lesson, completed_count, total_count, progress_pct = _lesson_context(user)

    lesson_list = [
        {
            "id": lesson.id,
            "key": lesson.lesson_key,
            "title": lesson.title,
            "url": lesson.url,
            "status": getattr(lesson, "status", "not_started"),
            "isCurrent": bool(current_lesson and lesson.id == current_lesson.id),
        }
        for lesson in lessons
    ]

    return JsonResponse({
        "lessons": lesson_list,
        "completed": completed_count,
        "total": total_count,
        "progress": round(progress_pct, 1),
    })


@csrf_exempt
def api_mark_lesson(request):
    """Delegate to the existing JSON-capable view in learning_port."""
    from learning_port.views import mark_lesson_status
    return mark_lesson_status(request)


# ---------------------------------------------------------------------------
# Social / Friends
# ---------------------------------------------------------------------------

@csrf_exempt
def api_add_friend(request, friend_id):
    from social_port.views import add_friend
    # Ensure the response is JSON by injecting the Accept header.
    request.META.setdefault("HTTP_ACCEPT", "application/json")
    return add_friend(request, friend_id)


@csrf_exempt
def api_remove_friend(request, friend_id):
    from social_port.views import remove_friend
    request.META.setdefault("HTTP_ACCEPT", "application/json")
    return remove_friend(request, friend_id)


def api_search_users(request):
    from social_port.views import search_users
    return search_users(request)
