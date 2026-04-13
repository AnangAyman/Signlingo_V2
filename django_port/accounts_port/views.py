import time
from smtplib import SMTPException

from django.conf import settings
from django.contrib import messages
from django.core.mail import EmailMessage
from django.shortcuts import redirect
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from email_validator import EmailNotValidError, validate_email

from legacy_port.models import User
from legacy_port.services import generate_username, get_initials
from shared_port.view_helpers import (
    _current_user,
    _load_signed_token,
    _make_signed_token,
    _render,
    _require_user,
    _user_shell_context,
)


def safe_send_email(message: EmailMessage, retries: int = 3, delay: int = 3) -> bool:
    # Mirror the old Flask retry behavior so intermittent mail issues do not fail immediately.
    for attempt in range(1, retries + 1):
        try:
            message.send(fail_silently=False)
            return True
        except (OSError, SMTPException):
            if attempt < retries:
                time.sleep(delay)
            else:
                return False


def _real_email_delivery_enabled() -> bool:
    return bool(settings.EMAIL_HOST_USER and settings.EMAIL_HOST_PASSWORD)


# ----------------------------------- AUTHENTICATION ------------------------------------------------
@csrf_exempt
def register(request):
    # Keep registration logic in the accounts app so auth-related changes stay isolated.
    if request.method == "POST":
        name = request.POST.get("name") or "Anonymous Wanderer"
        age = request.POST.get("age") or None
        email = request.POST.get("email", "")
        password = request.POST.get("password", "")
        confirm_password = request.POST.get("confirm-password", "")

        if password != confirm_password:
            return _render(request, "sign_up.html", {"error": "Passwords do not match."})
        try:
            # Validate and normalize email.
            valid = validate_email(email, check_deliverability=False)
            email = valid.email  # normalized email (e.g. lowercase domain)
        except EmailNotValidError as exc:
            # The email is not valid.
            return _render(request, "sign_up.html", {"error": str(exc)})
        if User.objects.filter(email=email).exists():
            return _render(request, "sign_up.html", {"error": "Email already exists."})

        first_name, _ = get_initials(name)
        user = User.objects.create(
            name=name,
            age=int(age) if age else None,
            email=email,
            username=generate_username(first_name),
            # EMAIL VERIFICATION TEMPORARILY DISABLED
            is_verified=True,
        )
        user.set_password(password)
        user.save(update_fields=["password"])
        request.session["user"] = user.email
        request.session["user_id"] = user.id
        return redirect("auth:start")
    return _render(request, "sign_up.html")


def verify_email(request, token):
    # Verification links are signed and time-limited for safer onboarding.
    try:
        payload = _load_signed_token(token, salt="email-confirm", max_age=300)
        user = User.objects.get(email=payload["email"])
    except Exception:
        messages.error(request, "Invalid or expired verification link.")
        return redirect("auth:login")

    if not user.is_verified:
        user.is_verified = True
        user.save(update_fields=["is_verified"])

    messages.success(request, "Email verified successfully. You can now log in.")
    return redirect("auth:login")


@csrf_exempt
def login(request):
    # The current project still uses the legacy user table, but the request flow is now Django-based.
    if request.method == "POST":
        email = request.POST.get("email", "")
        password = request.POST.get("password", "")
        user = User.objects.filter(email=email).first()
        if user is None or not user.check_password(password, upgrade_legacy=True):
            return _render(request, "login.html", {"error": "Invalid credentials."})
        # EMAIL VERIFICATION TEMPORARILY DISABLED
        # Auto-verify existing unverified users so they are not blocked.
        user.is_verified = True
        user.last_login_date = timezone.localdate()
        update_fields = ["is_verified", "last_login_date"]
        if user.password_is_hashed():
            update_fields.append("password")
        user.save(update_fields=update_fields)
        request.session["user"] = user.email
        request.session["user_id"] = user.id
        return redirect("auth:dashboard")
    return _render(request, "login.html")


def logout(request):
    request.session.flush()
    return redirect("auth:home")


# ----------------------------------- FORGOT/RESET PASSWORD ROUTES ------------------------------------
@csrf_exempt
def forgot_password(request):
    # Keep the reset flow usable in development, but allow real email delivery when SMTP settings exist.
    # Later on, this can still move to a database-backed token table with expiry if the team wants.
    if request.method == "POST":
        email = request.POST.get("email", "")
        user = User.objects.filter(email=email).first()
        if user:
            token = _make_signed_token({"user_id": user.id}, salt="password-reset")
            reset_url = request.build_absolute_uri(f"/reset_password/{token}")
            if _real_email_delivery_enabled():
                message = EmailMessage(
                    subject="Password Reset Link",
                    body=f"Use this link to reset your SignLingo password: {reset_url}",
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[email],
                )
                if safe_send_email(message):
                    messages.success(request, f"If an account with {email} exists, a password reset link has been sent.")
                else:
                    messages.success(
                        request,
                        f"If an account with {email} exists, a reset link was generated for development: {reset_url}",
                    )
            else:
                messages.success(
                    request,
                    f"If an account with {email} exists, a reset link was generated for development: {reset_url}",
                )
        else:
            # Generic message for security.
            messages.success(request, f"If an account with {email} exists, a password reset link has been sent.")
        return redirect("auth:forgot_password")
    return _render(request, "forgot_password.html")


@csrf_exempt
def reset_password(request, token):
    try:
        payload = _load_signed_token(token, salt="password-reset", max_age=300)
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
            # Example: enforce minimum password length.
            messages.error(request, "Password must be at least 6 characters long.")
            return _render(request, "reset_password.html", {"token": token})
        user.set_password(new_password)
        user.save(update_fields=["password"])
        messages.success(request, "Your password has been successfully reset! Please log in.")
        return redirect("auth:login")

    return _render(request, "reset_password.html", {"token": token})


@csrf_exempt
def edit_account(request):
    # Profile updates stay here so account maintenance is not mixed into gameplay modules.
    user, redirect_response = _require_user(request)
    if redirect_response:
        return redirect_response

    current_user_data = {"name": user.name, "age": user.age, "email": user.email}
    context = _user_shell_context(user)
    if request.method == "POST":
        # Get data from form.
        name = request.POST.get("name", user.name)
        age = request.POST.get("age") or None
        email = request.POST.get("email", user.email)
        current_password = request.POST.get("current_password", "")
        new_password = request.POST.get("new_password", "")
        confirm_new_password = request.POST.get("confirm_new_password", "")

        # Keep the old Flask guardrails here so bad form data fails gracefully instead of crashing.
        try:
            normalized_age = int(age) if age else None
        except ValueError:
            messages.error(request, "Invalid age format.")
            context["current_user_data"] = {"name": name, "age": age, "email": email}
            return _render(request, "edit_account.html", context)

        # Email validation and update.
        if User.objects.exclude(id=user.id).filter(email=email).exists():
            messages.error(request, "That email address is already in use by another account.")
        else:
            # Match the legacy behavior: blank names fall back to Anonymous Wanderer.
            user.name = name if name else "Anonymous Wanderer"
            user.age = normalized_age
            user.email = email
            if new_password:
                # Some legacy accounts may still have plain-text passwords until they log in and get upgraded.
                if not user.check_password(current_password):
                    messages.error(request, "Incorrect current password.")
                    context["current_user_data"] = current_user_data
                    return _render(request, "edit_account.html", context)
                if new_password != confirm_new_password:
                    messages.error(request, "New passwords do not match.")
                    context["current_user_data"] = current_user_data
                    return _render(request, "edit_account.html", context)
                if len(new_password) < 6:
                    # Preserve the minimum-length rule the Flask route enforced.
                    messages.error(request, "New password must be at least 6 characters long.")
                    context["current_user_data"] = current_user_data
                    return _render(request, "edit_account.html", context)
                user.set_password(new_password)
            user.save()
            request.session["user"] = user.email
            messages.success(request, "Profile updated successfully!")
            return redirect("auth:edit_account")

    context["current_user_data"] = current_user_data
    return _render(request, "edit_account.html", context)
