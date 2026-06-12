import random
from datetime import timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from django.core import signing
from django.shortcuts import redirect, render
from django.utils import timezone

from legacy_port.models import Lesson, User
from legacy_port.services import ensure_seed_data
from legacy_port.services import get_initials
from signlingo_django.language import get_request_language
from signlingo_django.translations import DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES


# Shared helpers live here so feature apps can stay focused on their own endpoints.
PROJECT_ROOT = Path(__file__).resolve().parents[2]
UPLOAD_DIR = PROJECT_ROOT / "static" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
JAKARTA_TIMEZONE = ZoneInfo("Asia/Jakarta")


def _current_user(request):
    # Centralize session-to-user lookup so every app resolves auth state the same way.
    user_id = request.session.get("user_id")
    if not user_id:
        return None
    return User.objects.filter(id=user_id).first()


def _require_user(request):
    user = _current_user(request)
    if user is None:
        return None, redirect("auth:login")
    return user, None


def _render(request, template_name, context=None):
    context = context or {}
    context.setdefault("session", request.session)
    context.setdefault("ui_language", get_request_language(request))
    context.setdefault("default_language", DEFAULT_LANGUAGE)
    context.setdefault("supported_languages", SUPPORTED_LANGUAGES)
    return render(request, template_name, context)


def _user_shell_context(user):
    full_name = user.name
    first_name, initials = get_initials(full_name)
    return {
        "user": user,
        "full_name": full_name,
        "first_name": first_name,
        "initials": initials,
        "login_today": True,
    }


def _lesson_context(user):
    # Build the lesson progress snapshot once and reuse it across dashboard, course, and game pages.
    # Fetch all defined lessons from the database. This assumes the Lesson table has been seeded.
    ensure_seed_data()
    lessons = list(Lesson.objects.order_by("order"))
    current_lesson = None
    completed_lessons_count = 0
    current_statuses = {status.lesson_id: status for status in user.lesson_statuses.select_related("lesson")}
    for lesson in lessons:
        status = current_statuses.get(lesson.id)
        lesson.status = status.status if status else "not_started"
        if lesson.status == "completed":
            completed_lessons_count += 1
        if current_lesson is None and lesson.status != "completed":
            current_lesson = lesson

    # Recalculate overall progress for the module based on user-specific lesson statuses.
    total_lessons_count = len(lessons)
    module_progress_percent = (completed_lessons_count / total_lessons_count) * 100 if total_lessons_count else 0
    return (
        lessons,
        current_lesson or (lessons[0] if lessons else None),
        completed_lessons_count,
        total_lessons_count,
        module_progress_percent,
    )


def _build_streak_data(user):
    # ----------------- WEEKLY STREAK (Monday -> Sunday of current week) -----------------
    # Preserve the original Flask routes.py behavior, which calculated streaks in Asia/Jakarta.
    today = timezone.localtime(timezone.now(), JAKARTA_TIMEZONE).date()
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)
    active_dates = set()
    for status in user.lesson_statuses.only("last_updated"):
        activity_date = timezone.localtime(status.last_updated, JAKARTA_TIMEZONE).date()
        if monday <= activity_date <= sunday:
            active_dates.add(activity_date)

    # Build streak data for this week.
    streak_data = []
    current_streak = 0
    for index in range(7):
        check_date = monday + timedelta(days=index)
        is_active = check_date in active_dates
        streak_data.append({"day": check_date.strftime("%a")[0], "date": check_date, "is_active": is_active})

    # Correct current_streak counting (backward) so future dates do not break the streak.
    for entry in reversed(streak_data):
        if entry["date"] > today:
            continue
        if entry["is_active"]:
            current_streak += 1
        else:
            break
    return today, streak_data, current_streak


def _store_session_results(request, payload):
    # Persist game/ML session summaries in the session for the combined result page.
    session_type = payload.get("type")
    if session_type in {"game", "ml"}:
        request.session[f"{session_type}_results"] = {
            "xp": payload.get("xp", 0),
            "accuracy": payload.get("accuracy", 0),
            "skipped": payload.get("skipped", False),
        }
    request.session["result_summary"] = payload
    request.session.modified = True


def _pick_question(request, question_key, questions):
    # Rotate questions through the session so users do not immediately see repeats.
    # This is the Django counterpart to tracking asked questions in the Flask session helper.
    asked_key = f"{question_key}_asked"
    asked = request.session.get(asked_key, [])
    if len(asked) >= min(10, len(questions)):
        asked = []
    available = [question for question in questions if question["id"] not in asked]
    question = random.choice(available or questions)
    asked.append(question["id"])
    request.session[asked_key] = asked
    request.session.modified = True
    return question


def _make_signed_token(payload, salt):
    return signing.dumps(payload, salt=salt)


def _load_signed_token(token, salt, max_age=300):
    return signing.loads(token, salt=salt, max_age=max_age)


def _wants_json_response(request):
    accept_header = request.headers.get("Accept", "")
    content_type = request.headers.get("Content-Type", "")
    requested_with = request.headers.get("X-Requested-With", "")
    return (
        "application/json" in accept_header
        or "application/json" in content_type
        or requested_with.lower() == "xmlhttprequest"
    )


def _leaderboard_lists(user):
    friends = [friendship.friend for friendship in user.friendships.select_related("friend")]
    friends_leaderboard = sorted(friends + [user], key=lambda item: (-item.points, item.id))
    league_users = [item for item in User.objects.order_by("-points", "id") if item.league == user.league]
    return friends_leaderboard, league_users


def _normalize_plan(plan):
    # Keep package selection constrained to the plans the existing templates understand.
    return plan if plan in {"family", "yearly", "monthly"} else "yearly"
