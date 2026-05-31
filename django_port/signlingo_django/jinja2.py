from django.contrib.messages import get_messages
from django.templatetags.static import static
from django.urls import NoReverseMatch, reverse
from jinja2 import Environment, pass_context


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


def environment(**options):
    env = Environment(**options)
    env.globals.update(
        url_for=_url_for,
        get_flashed_messages=_get_flashed_messages,
    )
    return env
