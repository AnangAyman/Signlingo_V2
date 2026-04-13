import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from legacy_port.models import ShopItem, UserItem
from shared_port.view_helpers import _current_user, _normalize_plan, _render, _require_user, _user_shell_context


# ----------------------------------- SHOP Functionality --------------------------------------------
def premium(request):
    # Premium and shop flows are separated from core learning pages for cleaner ownership.
    user, redirect_response = _require_user(request)
    if redirect_response:
        return redirect_response
    return _render(request, "premium.html", _user_shell_context(user))


@csrf_exempt
def package(request):
    # Persist the selected plan in session so payment can render the same choice on the next page.
    user, redirect_response = _require_user(request)
    if redirect_response:
        return redirect_response
    context = _user_shell_context(user)
    selected_plan = _normalize_plan(request.session.get("selected_plan"))
    if request.method == "POST":
        # Store the plan in the session so the payment page can reuse it.
        selected_plan = _normalize_plan(request.POST.get("plan"))
        request.session["selected_plan"] = selected_plan
        request.session.modified = True
        context["plan"] = selected_plan
        return _render(request, "payment.html", context)
    context["plan"] = selected_plan
    return _render(request, "package.html", context)


def payment(request):
    user = _current_user(request)
    context = _user_shell_context(user) if user else {}
    context["plan"] = _normalize_plan(request.session.get("selected_plan"))
    return _render(request, "payment.html", context)


def shop(request):
    user, redirect_response = _require_user(request)
    if redirect_response:
        return redirect_response

    # The Flask version recalculated some sidebar state inline here.
    # In Django that shared shell/progress context is centralized instead of duplicated per page.
    # Create a quick lookup of inventory quantities: {item_id: quantity}.
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
    # Buying logic stays JSON-first because the current UI treats the shop like an interactive panel.
    user, redirect_response = _require_user(request)
    if redirect_response:
        return JsonResponse({"error": "unauthorized"}, status=401)

    payload = json.loads(request.body or "{}")
    item = None
    if payload.get("item_id"):
        item = ShopItem.objects.filter(id=payload.get("item_id")).first()
    if item is None and payload.get("itemKey"):
        item = ShopItem.objects.filter(item_key=payload.get("itemKey")).first()
    if item is None:
        return JsonResponse({"success": False, "message": "Item not found."}, status=404)

    if item.item_key == "refill_hearts" and user.lives >= 5:
        return JsonResponse({"success": False, "message": "Your health is already full!"}, status=400)
    # Check if the user has enough points.
    if user.points < item.price:
        return JsonResponse({"success": False, "message": "Not enough points."}, status=400)

    # Deduct points first, then apply the item effect.
    user.points -= item.price
    if item.item_key == "refill_hearts":
        user.lives = 5  # Max lives.
        user.save(update_fields=["points", "lives"])
        return JsonResponse(
            {
                "success": True,
                "message": f"Successfully purchased {item.name}!",
                "new_balance": user.points,
                "new_lives": user.lives,
            }
        )

    user.save(update_fields=["points"])
    # Add non-heart items into inventory.
    inventory, _ = UserItem.objects.get_or_create(user=user, item=item, defaults={"quantity": 0})
    inventory.quantity += 1
    inventory.save(update_fields=["quantity"])
    return JsonResponse(
        {
            "success": True,
            "message": f"Successfully purchased {item.name}!",
            "new_balance": user.points,
            "new_lives": user.lives,
            "quantity": inventory.quantity,
        }
    )
