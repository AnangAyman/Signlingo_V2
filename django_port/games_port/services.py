import json
import os
from pathlib import Path


# Game-owned data and ML helpers live here so camera/prediction routes stay out of legacy_port.
PROJECT_ROOT = Path(__file__).resolve().parents[2]
QUESTIONS_PATH = PROJECT_ROOT / "questions.json"
ML_QUESTIONS_PATH = PROJECT_ROOT / "ml_questions.json"
MODEL_PATH = PROJECT_ROOT / "models" / "bisindo_static_model.h5"

_ML_RUNTIME = None
_MODEL_CACHE = None


def load_json(path: Path):
    with path.open(encoding="utf-8") as stream:
        return json.load(stream)


def load_questions():
    return load_json(QUESTIONS_PATH)


def load_ml_questions():
    return load_json(ML_QUESTIONS_PATH)


def _load_ml_runtime():
    global _ML_RUNTIME
    if _ML_RUNTIME is not None:
        return _ML_RUNTIME

    # Load bisindo static (MediaPipe keypoint) model dependencies lazily so local setup stays lighter.
    matplotlib_dir = PROJECT_ROOT / "django_instance" / ".matplotlib"
    matplotlib_dir.mkdir(parents=True, exist_ok=True)
    os.environ.setdefault("MPLCONFIGDIR", str(matplotlib_dir))
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
    # Normalize landmarks relative to wrist (index 0) and hand scale.
    # This matches the normalization applied during bisindo_static_model training.
    wrist = landmarks[0].copy()
    landmarks = landmarks - wrist
    scale = np_module.linalg.norm(landmarks[9])
    if scale > 0:
        landmarks = landmarks / scale
    return landmarks


def _extract_keypoints(hand_landmarks_list, np_module):
    # Flatten up to 2 hands x 21 landmarks x 3 coords into a (1, 126) tensor.
    # Missing second hand is zero-padded.
    keypoints = []
    for index in range(2):
        if index < len(hand_landmarks_list):
            landmarks = hand_landmarks_list[index].landmark
            array = np_module.array([[landmark.x, landmark.y, landmark.z] for landmark in landmarks], dtype=np_module.float32)
            array = _normalize_landmarks(array, np_module)
            keypoints.extend(array.flatten().tolist())
        else:
            keypoints.extend([0.0] * (21 * 3))  # zero-pad missing hand
    return np_module.array(keypoints, dtype=np_module.float32).reshape(1, 126)


def _build_bisindo_model(runtime, model_path):
    # The original Flask route rebuilt the model manually because the saved Keras config
    # was not compatible with the container runtime. Preserve that workaround here.
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

    # Load weights layer-by-layer from the h5 model_weights group.
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

    # Read image bytes into an OpenCV frame.
    frame = cv2.imdecode(np_module.frombuffer(file_bytes, np_module.uint8), cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("Invalid image payload")

    # Detect hands from the uploaded frame.
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    with mp.solutions.hands.Hands(static_image_mode=True, max_num_hands=2, min_detection_confidence=0.3) as hands_detector:
        results = hands_detector.process(rgb_frame)

    if not results.multi_hand_landmarks:
        raise ValueError("No hand detected")

    # Preprocess and predict.
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
        # Combine landmarks of both hands into one bounding box for debug output.
        for hand_landmarks in results.multi_hand_landmarks:
            all_xs.extend([landmark.x for landmark in hand_landmarks.landmark])
            all_ys.extend([landmark.y for landmark in hand_landmarks.landmark])
            mp.solutions.drawing_utils.draw_landmarks(debug_frame, hand_landmarks, mp.solutions.hands.HAND_CONNECTIONS)

        xmin = max(0, int(min(all_xs) * w) - 20)
        ymin = max(0, int(min(all_ys) * h) - 20)
        xmax = min(w, int(max(all_xs) * w) + 20)
        ymax = min(h, int(max(all_ys) * h) + 20)
        # Save debug images so QA can inspect the model input and hand overlay.
        crop = frame[ymin:ymax, xmin:xmax]
        if crop.size > 0:
            cv2.imwrite(str(debug_crop_path), crop)
            payload["debug_crop_url"] = "/static/uploads/last_crop.jpg"
        cv2.imwrite(str(debug_overlay_path), debug_frame)
        payload["debug_overlay_url"] = "/static/uploads/last_debug.jpg"

    return payload
