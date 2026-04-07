import json
import random
from pathlib import Path

from .models import Course, Lesson, Module, ShopItem, Unit, User


PROJECT_ROOT = Path(__file__).resolve().parents[2]
LESSONS_PATH = PROJECT_ROOT / "lessons.json"
QUESTIONS_PATH = PROJECT_ROOT / "questions.json"
ML_QUESTIONS_PATH = PROJECT_ROOT / "ml_questions.json"


def get_initials(full_name: str):
    name_parts = full_name.split()
    if not name_parts:
        return "User", "U"

    first_name = name_parts[0]
    last_initial = name_parts[1][0] if len(name_parts) > 1 else ""
    initials = (first_name[0] + last_initial).upper()
    return first_name, initials


def generate_username(name: str) -> str:
    base = name.replace(" ", "").lower() or "user"
    while True:
        username = f"@{base}{random.randint(1, 100)}"
        if not User.objects.filter(username=username).exists():
            return username


def load_json(path: Path):
    with path.open(encoding="utf-8") as stream:
        return json.load(stream)


def load_lessons():
    return load_json(LESSONS_PATH)


def load_questions():
    return load_json(QUESTIONS_PATH)


def load_ml_questions():
    return load_json(ML_QUESTIONS_PATH)


def seed_initial_data():
    course, _ = Course.objects.get_or_create(
        title="BISINDO Language",
        defaults={"description": "Learn the basics of BISINDO sign language."},
    )
    module, _ = Module.objects.get_or_create(title="Introduction", course=course, defaults={"order": 0})
    unit, _ = Unit.objects.get_or_create(title="Getting Started", module=module, defaults={"order": 0})

    for index, lesson_data in enumerate(load_lessons()):
        lesson_key = lesson_data["title"].lower().replace(" ", "_")
        Lesson.objects.update_or_create(
            lesson_key=lesson_key,
            defaults={
                "title": lesson_data["title"],
                "url": lesson_data.get("url"),
                "unit": unit,
                "order": index,
            },
        )

    shop_items = [
        {
            "name": "Refill Hearts",
            "description": "Restore all your hearts to continue learning",
            "price": 350,
            "icon_class": "fas fa-heart",
            "item_key": "refill_hearts",
            "icon_background_class": "item-icon heart-icon",
        },
        {
            "name": "Streak Freeze",
            "description": "Protect your streak for one day",
            "price": 200,
            "icon_class": "fas fa-snowflake",
            "item_key": "streak_freeze",
            "icon_background_class": "item-icon freeze-icon",
        },
        {
            "name": "XP Boost",
            "description": "Double XP for 15 minutes",
            "price": 500,
            "icon_class": "fas fa-rocket",
            "item_key": "xp_boost",
            "icon_background_class": "item-icon boost-icon",
        },
        {
            "name": "Timer Freeze",
            "description": "Stop the timer for 30 seconds in timed challenges",
            "price": 300,
            "icon_class": "fas fa-clock",
            "item_key": "timer_freeze",
            "icon_background_class": "item-icon timer-icon",
        },
    ]

    for item in shop_items:
        ShopItem.objects.update_or_create(item_key=item["item_key"], defaults=item)

    User.objects.get_or_create(
        email="admin@example.com",
        defaults={
            "name": "Admin",
            "age": 99,
            "password": "admin",
            "is_verified": True,
            "username": "@admin",
            "lives": 100000,
            "points": 10000,
        },
    )
