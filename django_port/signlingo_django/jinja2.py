from django.contrib.messages import get_messages
from django.templatetags.static import static
from django.urls import NoReverseMatch, reverse
from jinja2 import Environment, pass_context

from signlingo_django.language import get_request_language
from signlingo_django.translations import get_translation, SUPPORTED_LANGUAGES


def _normalize_endpoint(endpoint: str) -> str:
    return endpoint.replace(".", ":")


def _url_for(endpoint: str, **kwargs) -> str:
    if endpoint == "static":
        return static(kwargs.get("filename", ""))

    try:
        return reverse(_normalize_endpoint(endpoint), kwargs=kwargs or None)
    except NoReverseMatch:
        return "#"


@pass_context
def _get_flashed_messages(context, with_categories=False):
    request = context.get("request")
    if request is None:
        return []

    messages = [(message.tags or "info", message.message) for message in get_messages(request)]
    if with_categories:
        return messages
    return [message for _, message in messages]


@pass_context
def _current_language(context):
    return get_request_language(context.get("request"))


@pass_context
def _t(context, key: str, default: str | None = None):
    return get_translation(get_request_language(context.get("request")), key, default=default)


def environment(**options):
    env = Environment(**options)
    env.globals.update(
        url_for=_url_for,
        get_flashed_messages=_get_flashed_messages,
        current_language=_current_language,
        supported_languages=SUPPORTED_LANGUAGES,
        t=_t,
    )
    return env
