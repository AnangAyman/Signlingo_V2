from __future__ import annotations

from signlingo_django.translations import DEFAULT_LANGUAGE, normalize_language


SESSION_KEY = "ui_language"


def get_request_language(request) -> str:
    if request is None:
        return DEFAULT_LANGUAGE
    return normalize_language(request.session.get(SESSION_KEY, DEFAULT_LANGUAGE))


def set_request_language(request, language: str) -> str:
    normalized = normalize_language(language)
    request.session[SESSION_KEY] = normalized
    return normalized
