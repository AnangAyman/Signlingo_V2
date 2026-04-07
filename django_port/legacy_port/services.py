import json
import random
from pathlib import Path

from .models import Course, Lesson, Module, ShopItem, Unit, User


PROJECT_ROOT = Path(__file__).resolve().parents[2]
LESSONS_PATH = PROJECT_ROOT / "lessons.json"
QUESTIONS_PATH = PROJECT_ROOT / "questions.json"
ML_QUESTIONS_PATH = PROJECT_ROOT / "ml_questions.json"
MODEL_PATH = PROJECT_ROOT / "models" / "bisindo_static_model.h5"

_ML_RUNTIME = None
_MODEL_CACHE = None


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


def _load_ml_runtime():
    global _ML_RUNTIME
    if _ML_RUNTIME is not None:
        return _ML_RUNTIME

    import cv2
    import h5py
    import mediapipe as mp
    import numpy as np
    from tensorflow.keras.layers import BatchNormalization, Dense, Dropout, Input
    from tensorflow.keras.models import Sequential

    _ML_RUNTIME = {
        "cv2": cv2,
        "h5py": h5py,
        "mp": mp,
        "np": np,
        "BatchNormalization": BatchNormalization,
        "Dense": Dense,
        "Dropout": Dropout,
        "Input": Input,
        "Sequential": Sequential,
    }
    return _ML_RUNTIME


def _normalize_landmarks(landmarks, np_module):
    wrist = landmarks[0].copy()
    landmarks = landmarks - wrist
    scale = np_module.linalg.norm(landmarks[9])
    if scale > 0:
        landmarks = landmarks / scale
    return landmarks


def _extract_keypoints(hand_landmarks_list, np_module):
    keypoints = []
    for index in range(2):
        if index < len(hand_landmarks_list):
            landmarks = hand_landmarks_list[index].landmark
            array = np_module.array([[landmark.x, landmark.y, landmark.z] for landmark in landmarks], dtype=np_module.float32)
            array = _normalize_landmarks(array, np_module)
            keypoints.extend(array.flatten().tolist())
        else:
            keypoints.extend([0.0] * (21 * 3))
    return np_module.array(keypoints, dtype=np_module.float32).reshape(1, 126)


def _build_bisindo_model(runtime, model_path):
    model = runtime["Sequential"](
        [
            runtime["Input"](shape=(126,)),
            runtime["Dense"](256, activation="relu"),
            runtime["BatchNormalization"](momentum=0.99, epsilon=0.001),
            runtime["Dropout"](0.4),
            runtime["Dense"](128, activation="relu"),
            runtime["BatchNormalization"](momentum=0.99, epsilon=0.001),
            runtime["Dropout"](0.3),
            runtime["Dense"](64, activation="relu"),
            runtime["Dropout"](0.2),
            runtime["Dense"](26, activation="softmax"),
        ]
    )
    model.compile(optimizer="adam", loss="categorical_crossentropy")

    with runtime["h5py"].File(model_path, "r") as file_handle:
        weight_group = file_handle["model_weights"]
        layer_names = [name.decode("utf-8") if isinstance(name, bytes) else name for name in weight_group.attrs.get("layer_names", [])]
        keras_layers = [layer for layer in model.layers if layer.weights]
        layer_index = 0
        for layer_name in layer_names:
            if layer_name not in weight_group:
                continue
            group = weight_group[layer_name]
            weight_names = [name.decode("utf-8") if isinstance(name, bytes) else name for name in group.attrs.get("weight_names", [])]
            weights = [group[weight_name][()] for weight_name in weight_names]
            if weights and layer_index < len(keras_layers):
                keras_layers[layer_index].set_weights(weights)
                layer_index += 1
    return model


def get_bisindo_model(model_path=MODEL_PATH):
    global _MODEL_CACHE
    if _MODEL_CACHE is not None:
        return _MODEL_CACHE
    runtime = _load_ml_runtime()
    if not model_path.exists():
        raise FileNotFoundError(f"Missing model file: {model_path}")
    _MODEL_CACHE = _build_bisindo_model(runtime, model_path)
    return _MODEL_CACHE


def predict_bisindo_image(file_bytes, upload_dir=None, model_path=MODEL_PATH):
    runtime = _load_ml_runtime()
    model = get_bisindo_model(model_path=model_path)

    cv2 = runtime["cv2"]
    mp = runtime["mp"]
    np_module = runtime["np"]

    frame = cv2.imdecode(np_module.frombuffer(file_bytes, np_module.uint8), cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("Invalid image payload")

    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    with mp.solutions.hands.Hands(static_image_mode=True, max_num_hands=2, min_detection_confidence=0.3) as hands_detector:
        results = hands_detector.process(rgb_frame)

    if not results.multi_hand_landmarks:
        raise ValueError("No hand detected")

    input_tensor = _extract_keypoints(results.multi_hand_landmarks, np_module)
    prediction = model.predict(input_tensor, verbose=0)
    classes = [chr(code) for code in range(ord("A"), ord("Z") + 1)]
    letter = classes[int(np_module.argmax(prediction, axis=1)[0])]
    confidence = float(np_module.max(prediction))

    payload = {
        "result": letter,
        "confidence": confidence,
    }

    if upload_dir is not None:
        upload_dir.mkdir(parents=True, exist_ok=True)
        debug_crop_path = upload_dir / "last_crop.jpg"
        debug_overlay_path = upload_dir / "last_debug.jpg"
        h, w, _ = frame.shape
        all_xs, all_ys = [], []
        debug_frame = frame.copy()
        for hand_landmarks in results.multi_hand_landmarks:
            all_xs.extend([landmark.x for landmark in hand_landmarks.landmark])
            all_ys.extend([landmark.y for landmark in hand_landmarks.landmark])
            mp.solutions.drawing_utils.draw_landmarks(debug_frame, hand_landmarks, mp.solutions.hands.HAND_CONNECTIONS)

        xmin = max(0, int(min(all_xs) * w) - 20)
        ymin = max(0, int(min(all_ys) * h) - 20)
        xmax = min(w, int(max(all_xs) * w) + 20)
        ymax = min(h, int(max(all_ys) * h) + 20)
        crop = frame[ymin:ymax, xmin:xmax]
        if crop.size > 0:
            cv2.imwrite(str(debug_crop_path), crop)
            payload["debug_crop_url"] = "/static/uploads/last_crop.jpg"
        cv2.imwrite(str(debug_overlay_path), debug_frame)
        payload["debug_overlay_url"] = "/static/uploads/last_debug.jpg"

    return payload


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
