from django.contrib import messages
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect
from django.views.decorators.csrf import csrf_exempt

from legacy_port.models import User
from shared_port.view_helpers import _leaderboard_lists, _render, _require_user, _user_shell_context, _wants_json_response


# ----------------------------------- Leaderboards page ----------------------------------------
def leaderboard(request):
    # Social ranking views are grouped here instead of sharing a monolithic route file.
    user, redirect_response = _require_user(request)
    if redirect_response:
        return redirect_response

    # 1. Get friends leaderboard (including the current user in the list).
    # 2. Get league leaderboard.
    friends_leaderboard, league_users = _leaderboard_lists(user)
    context = _user_shell_context(user)
    context.update(
        {
            "leaderboard_users": league_users,
            "friends_leaderboard": friends_leaderboard,
            "league_users": league_users,
            "league_name": user.league,
            "current_user": user,
        }
    )
    return _render(request, "leaderboard.html", context)


# ----------------------------------- FRIENDS & USERS LIST -----------------------------------
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
    # Return JSON for async UI flows, but keep redirect support for regular form posts.
    user, redirect_response = _require_user(request)
    if redirect_response:
        return redirect_response

    friend = get_object_or_404(User, id=friend_id)
    user.add_friend(friend)
    message = f"You are now friends with {friend.name}!"
    if _wants_json_response(request):
        return JsonResponse(
            {
                "success": True,
                "message": message,
                "friend": {"id": friend.id, "name": friend.name, "points": friend.points},
            }
        )
    messages.success(request, message)
    return redirect("auth:list_users")


@csrf_exempt
def remove_friend(request, friend_id):
    user, redirect_response = _require_user(request)
    if redirect_response:
        return redirect_response

    friend = get_object_or_404(User, id=friend_id)
    user.remove_friend(friend)
    message = f"You have removed {friend.name} from your friends."
    if _wants_json_response(request):
        return JsonResponse({"success": True, "message": message})
    messages.info(request, message)
    return redirect("auth:list_users")


def search_users(request):
    user, redirect_response = _require_user(request)
    if redirect_response:
        return JsonResponse({"error": "unauthorized"}, status=401)

    query = request.GET.get("q", "").strip()
    if len(query) < 2:
        # Return an empty list if the query is too short.
        return JsonResponse([], safe=False)

    # Search for users whose name, email, or username contains the query string.
    users = User.objects.exclude(id=user.id)
    if query:
        users = users.filter(Q(name__icontains=query) | Q(email__icontains=query) | Q(username__icontains=query))
    payload = [{"id": item.id, "name": item.name} for item in users[:10]]
    return JsonResponse(payload, safe=False)
