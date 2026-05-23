import json
import os

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from legacy_port.models import Lesson, UserLessonStatus
from shared_port.view_helpers import _lesson_context, _render, _require_user, _user_shell_context


# ----------------------------------- GAME PAGE ------------------------------------------------
def video_learning(request):
    # Learning pages reuse the shared lesson snapshot so progress stays consistent across views.
    # This assumes the Lesson table has already been seeded during setup/bootstrap.
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
            "frontend_app_url": os.environ.get("FRONTEND_APP_URL", "").rstrip("/"),
        }
    )
    return _render(request, "video_learning.html", context)


@csrf_exempt
def mark_lesson_status(request):
    # Accept either lesson ID or lesson key so the front end can integrate flexibly.
    # Preserve the old Flask default: if the client omits status, treat it as completed.
    user, redirect_response = _require_user(request)
    if redirect_response:
        return JsonResponse({"error": "unauthorized"}, status=401)

    payload = json.loads(request.body or "{}")
    lesson = None
    if payload.get("lesson_id"):
        lesson = Lesson.objects.filter(id=payload.get("lesson_id")).first()
    if lesson is None and payload.get("lesson_key"):
        # Use the stable lesson_key when possible so front-end updates are not coupled to database IDs.
        lesson = Lesson.objects.filter(lesson_key=payload.get("lesson_key")).first()
    if lesson is None:
        return JsonResponse({"success": False, "error": "Lesson not found"}, status=404)

    item, _ = UserLessonStatus.objects.update_or_create(
        user=user,
        lesson=lesson,
        defaults={"status": payload.get("status", "completed"), "score": payload.get("score")},
    )
    return JsonResponse({"success": True, "id": item.id, "status": item.status, "message": f"Lesson {lesson.title} marked as {item.status}"})


def course(request):
    user, redirect_response = _require_user(request)
    if redirect_response:
        return redirect_response
    lessons, _, completed_lessons_count, total_lessons_count, module_progress_percent = _lesson_context(user)
    context = _user_shell_context(user)
    context.update(
        {
            "lessons": lessons,
            "completed_lessons_count": completed_lessons_count,
            "total_lessons_count": total_lessons_count,
            "module_progress_percent": module_progress_percent,
        }
    )
    return _render(request, "courses_final.html", context)
