import json
import random
from datetime import timedelta

from django.contrib import messages
from django.core import signing
from django.db.models import F, Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from email_validator import EmailNotValidError, validate_email

from .models import Lesson, ShopItem, User, UserItem, UserLessonStatus
from .services import generate_username, get_initials, load_ml_questions, load_questions


def _current_user(request):
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
    lessons = list(Lesson.objects.order_by("order"))
    current_lesson = None
    current_statuses = {status.lesson_id: status for status in user.lesson_statuses.select_related("lesson")}
    for lesson in lessons:
        status = current_statuses.get(lesson.id)
        lesson.status = status.status if status else "not_started"
        if current_lesson is None and lesson.status != "completed":
            current_lesson = lesson
    return lessons, current_lesson or (lessons[0] if lessons else None)


def _build_streak_data(user):
    today = timezone.localdate()
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)
    statuses = user.lesson_statuses.filter(last_updated__date__gte=monday, last_updated__date__lte=sunday)
    active_dates = {status.last_updated.date() for status in statuses}

    streak_data = []
    current_streak = 0
    for index in range(7):
        check_date = monday + timedelta(days=index)
        is_active = check_date in active_dates
        streak_data.append({"day": check_date.strftime("%a")[0], "date": check_date, "is_active": is_active})

    for entry in reversed(streak_data):
        if entry["date"] > today:
            continue
        if entry["is_active"]:
            current_streak += 1
        else:
            break
    return today, streak_data, current_streak


def _store_session_results(request, payload):
    request.session["result_summary"] = payload
    request.session.modified = True


def _pick_question(request, question_key, questions):
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


def home(request):
    request.session.flush()
    return _render(request, "landing_page.html", {"user": None})


@csrf_exempt
def register(request):
    if request.method == "POST":
        name = request.POST.get("name") or "Anonymous Wanderer"
        age = request.POST.get("age") or None
        email = request.POST.get("email", "")
        password = request.POST.get("password", "")
        confirm_password = request.POST.get("confirm-password", "")

        if password != confirm_password:
            return _render(request, "sign_up.html", {"error": "Passwords do not match."})
        try:
            valid = validate_email(email, check_deliverability=False)
            email = valid.email
        except EmailNotValidError as exc:
            return _render(request, "sign_up.html", {"error": str(exc)})
        if User.objects.filter(email=email).exists():
            return _render(request, "sign_up.html", {"error": "Email already exists."})

        first_name, _ = get_initials(name)
        user = User.objects.create(
            name=name,
            age=int(age) if age else None,
            email=email,
            password=password,
            username=generate_username(first_name),
            is_verified=True,
        )
        request.session["user"] = user.email
        request.session["user_id"] = user.id
        return redirect("auth:start")
    return _render(request, "sign_up.html")


@csrf_exempt
def login(request):
    if request.method == "POST":
        email = request.POST.get("email", "")
        password = request.POST.get("password", "")
        user = User.objects.filter(email=email, password=password).first()
        if user is None:
            return _render(request, "login.html", {"error": "Invalid credentials."})
        user.is_verified = True
        user.last_login_date = timezone.localdate()
        user.save(update_fields=["is_verified", "last_login_date"])
        request.session["user"] = user.email
        request.session["user_id"] = user.id
        return redirect("auth:dashboard")
    return _render(request, "login.html")


def logout(request):
    request.session.flush()
    return redirect("auth:home")


def dashboard(request):
    user, redirect_response = _require_user(request)
    if redirect_response:
        return redirect_response

    all_users = list(User.objects.order_by("-points", "id"))
    user_rank = next((index + 1 for index, row in enumerate(all_users) if row.id == user.id), None)
    today, streak_data, current_streak = _build_streak_data(user)
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
        }
    )
    return _render(request, "dashboard.html", context)


def start(request):
    return _render(request, "start.html")


def roadmap(request):
    user, redirect_response = _require_user(request)
    if redirect_response:
        return redirect_response

    all_users = list(User.objects.order_by("-points", "id"))
    user_rank = next((index + 1 for index, row in enumerate(all_users) if row.id == user.id), None)
    today, streak_data, current_streak = _build_streak_data(user)
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
        }
    )
    return _render(request, "roadmap.html", context)


def premium(request):
    user, redirect_response = _require_user(request)
    if redirect_response:
        return redirect_response
    return _render(request, "premium.html", _user_shell_context(user))


@csrf_exempt
def package(request):
    user, redirect_response = _require_user(request)
    if redirect_response:
        return redirect_response
    context = _user_shell_context(user)
    if request.method == "POST":
        context["plan"] = request.POST.get("plan")
        return _render(request, "payment.html", context)
    return _render(request, "package.html", context)


def payment(request):
    user = _current_user(request)
    context = _user_shell_context(user) if user else {}
    return _render(request, "payment.html", context)


@csrf_exempt
def forgot_password(request):
    if request.method == "POST":
        email = request.POST.get("email", "")
        user = User.objects.filter(email=email).first()
        if user:
            token = signing.dumps({"user_id": user.id})
            messages.success(request, f"If an account with {email} exists, a reset token was generated for development: {token}")
        else:
            messages.success(request, f"If an account with {email} exists, a password reset link has been sent.")
        return redirect("auth:forgot_password")
    return _render(request, "forgot_password.html")


@csrf_exempt
def reset_password(request, token):
    try:
        payload = signing.loads(token, max_age=300)
        user = User.objects.get(id=payload["user_id"])
    except Exception:
        messages.error(request, "Invalid or expired password reset token.")
        return redirect("auth:forgot_password")

    if request.method == "POST":
        new_password = request.POST.get("password", "")
        confirm_password = request.POST.get("confirm_password", "")
        if new_password != confirm_password:
            messages.error(request, "Passwords do not match.")
            return _render(request, "reset_password.html", {"token": token})
        if len(new_password) < 6:
            messages.error(request, "Password must be at least 6 characters long.")
            return _render(request, "reset_password.html", {"token": token})
        user.password = new_password
        user.save(update_fields=["password"])
        messages.success(request, "Your password has been successfully reset! Please log in.")
        return redirect("auth:login")

    return _render(request, "reset_password.html", {"token": token})


def leaderboard(request):
    user, redirect_response = _require_user(request)
    if redirect_response:
        return redirect_response

    all_users = list(User.objects.order_by("-points", "id"))
    context = _user_shell_context(user)
    context.update({"leaderboard_users": all_users, "current_user": user})
    return _render(request, "leaderboard.html", context)


def list_users(request):
    user, redirect_response = _require_user(request)
    if redirect_response:
        return redirect_response

    all_users = User.objects.exclude(id=user.id).order_by("name")
    context = {"all_users": all_users, "current_user": user}
    context.update(_user_shell_context(user))
    return _render(request, "users.html", context)


@csrf_exempt
def add_friend(request, friend_id):
    user, redirect_response = _require_user(request)
    if redirect_response:
        return redirect_response

    friend = get_object_or_404(User, id=friend_id)
    user.add_friend(friend)
    messages.success(request, f"You are now friends with {friend.name}!")
    return redirect("auth:list_users")


@csrf_exempt
def remove_friend(request, friend_id):
    user, redirect_response = _require_user(request)
    if redirect_response:
        return redirect_response

    friend = get_object_or_404(User, id=friend_id)
    user.remove_friend(friend)
    messages.info(request, f"You have removed {friend.name} from your friends.")
    return redirect("auth:list_users")


def search_users(request):
    user, redirect_response = _require_user(request)
    if redirect_response:
        return JsonResponse({"error": "unauthorized"}, status=401)

    query = request.GET.get("q", "").strip()
    users = User.objects.exclude(id=user.id)
    if query:
        users = users.filter(Q(name__icontains=query) | Q(email__icontains=query) | Q(username__icontains=query))
    payload = [{"id": item.id, "name": item.name, "email": item.email, "username": item.username} for item in users[:10]]
    return JsonResponse(payload, safe=False)


@csrf_exempt
def save_session_results(request):
    payload = json.loads(request.body or "{}")
    _store_session_results(request, payload)
    return JsonResponse({"ok": True})


def result_summary(request):
    user, redirect_response = _require_user(request)
    if redirect_response:
        return redirect_response
    return _render(request, "result_summary.html", _user_shell_context(user))


def get_summary_results(request):
    return JsonResponse(request.session.get("result_summary", {}))


def ml_game(request):
    user, redirect_response = _require_user(request)
    if redirect_response:
        return redirect_response
    lessons, current_lesson = _lesson_context(user)
    context = _user_shell_context(user)
    context.update({"lessons": lessons, "current_lesson": current_lesson})
    return _render(request, "ml_game.html", context)


@csrf_exempt
def decrement_life(request):
    user, redirect_response = _require_user(request)
    if redirect_response:
        return JsonResponse({"error": "unauthorized"}, status=401)

    user.lives = max(user.lives - 1, 0)
    user.save(update_fields=["lives"])
    return JsonResponse({"lives": user.lives})


def video_learning(request):
    user, redirect_response = _require_user(request)
    if redirect_response:
        return redirect_response
    lessons, current_lesson = _lesson_context(user)
    context = _user_shell_context(user)
    context.update({"lessons": lessons, "current_lesson": current_lesson})
    return _render(request, "video_learning.html", context)


def gamepage(request):
    user, redirect_response = _require_user(request)
    if redirect_response:
        return redirect_response
    lessons, current_lesson = _lesson_context(user)
    context = _user_shell_context(user)
    context.update({"lessons": lessons, "current_lesson": current_lesson})
    return _render(request, "game_page.html", context)


@csrf_exempt
def mark_lesson_status(request):
    user, redirect_response = _require_user(request)
    if redirect_response:
        return JsonResponse({"error": "unauthorized"}, status=401)

    payload = json.loads(request.body or "{}")
    lesson = get_object_or_404(Lesson, id=payload.get("lesson_id"))
    item, _ = UserLessonStatus.objects.update_or_create(
        user=user,
        lesson=lesson,
        defaults={"status": payload.get("status", "not_started"), "score": payload.get("score")},
    )
    return JsonResponse({"id": item.id, "status": item.status})


def course(request):
    user, redirect_response = _require_user(request)
    if redirect_response:
        return redirect_response
    lessons, _ = _lesson_context(user)
    context = _user_shell_context(user)
    context.update({"lessons": lessons})
    return _render(request, "courses_final.html", context)


def get_question(request):
    return JsonResponse(_pick_question(request, "quiz", load_questions()))


def get_question_ml(request):
    return JsonResponse(_pick_question(request, "ml", load_ml_questions()))


@csrf_exempt
def check_answer(request):
    user, redirect_response = _require_user(request)
    if redirect_response:
        return JsonResponse({"error": "unauthorized"}, status=401)

    payload = json.loads(request.body or "{}")
    correct = payload.get("selectedAnswer") == payload.get("correctAnswer")
    if correct:
        user.points = (user.points or 0) + 100
        user.save(update_fields=["points"])

    request.session["today_login"] = True
    _store_session_results(
        request,
        {
            "question": payload.get("question"),
            "selectedAnswer": payload.get("selectedAnswer"),
            "correctAnswer": payload.get("correctAnswer"),
            "correct": correct,
            "points": user.points,
        },
    )
    return JsonResponse({"correct": correct, "points": user.points})


@csrf_exempt
def edit_account(request):
    user, redirect_response = _require_user(request)
    if redirect_response:
        return redirect_response

    current_user_data = {"name": user.name, "age": user.age, "email": user.email}
    context = _user_shell_context(user)
    if request.method == "POST":
        name = request.POST.get("name", user.name)
        age = request.POST.get("age") or None
        email = request.POST.get("email", user.email)
        current_password = request.POST.get("current_password", "")
        new_password = request.POST.get("new_password", "")
        confirm_new_password = request.POST.get("confirm_new_password", "")

        if User.objects.exclude(id=user.id).filter(email=email).exists():
            messages.error(request, "That email address is already in use by another account.")
        else:
            user.name = name
            user.age = int(age) if age else None
            user.email = email
            if new_password:
                if current_password != user.password:
                    messages.error(request, "Incorrect current password.")
                    context["current_user_data"] = current_user_data
                    return _render(request, "edit_account.html", context)
                if new_password != confirm_new_password:
                    messages.error(request, "New passwords do not match.")
                    context["current_user_data"] = current_user_data
                    return _render(request, "edit_account.html", context)
                user.password = new_password
            user.save()
            request.session["user"] = user.email
            messages.success(request, "Profile updated successfully!")
            return redirect("auth:edit_account")

    context["current_user_data"] = current_user_data
    return _render(request, "edit_account.html", context)


def shop(request):
    user, redirect_response = _require_user(request)
    if redirect_response:
        return redirect_response

    inventory = {item.item_id: item.quantity for item in user.inventory_items.select_related("item")}
    context = _user_shell_context(user)
    context.update(
        {
            "shop_items": ShopItem.objects.order_by("id"),
            "inventory": inventory,
            "user_inventory_map": inventory,
        }
    )
    return _render(request, "shop.html", context)


@csrf_exempt
def buy_item(request):
    user, redirect_response = _require_user(request)
    if redirect_response:
        return JsonResponse({"error": "unauthorized"}, status=401)

    payload = json.loads(request.body or "{}")
    item = get_object_or_404(ShopItem, item_key=payload.get("itemKey"))
    if user.points < item.price:
        return JsonResponse({"success": False, "message": "Not enough points."}, status=400)

    user.points -= item.price
    user.save(update_fields=["points"])
    inventory, _ = UserItem.objects.get_or_create(user=user, item=item, defaults={"quantity": 0})
    inventory.quantity += 1
    inventory.save(update_fields=["quantity"])
    return JsonResponse({"success": True, "points": user.points, "quantity": inventory.quantity})


def magic_touch(request):
    user, redirect_response = _require_user(request)
    if redirect_response:
        return redirect_response
    return _render(request, "magic_touch_game.html", _user_shell_context(user))


def health(request):
    return JsonResponse({"status": "ok", "framework": "django"})
