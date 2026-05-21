from django.apps import AppConfig


class GamesPortConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "games_port"

    def ready(self):
        import logging
        import os
        import sys

        if os.environ.get("SIGNLINGO_WARM_ML_ON_STARTUP", "").lower() != "true":
            return

        # Management commands should stay lightweight and deterministic.
        if any(command in sys.argv for command in ("migrate", "makemigrations", "collectstatic", "test", "shell", "bootstrap_legacy_data")):
            return

        try:
            from games_port.services import warmup_bisindo_runtime

            warmup_bisindo_runtime()
        except Exception as exc:
            # Startup should not crash the whole app if the optional ML runtime
            # is unavailable in a non-ML environment.
            logging.getLogger(__name__).warning("BISINDO ML warmup skipped: %s", exc)
