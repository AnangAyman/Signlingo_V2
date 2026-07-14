import os
import json
import time
import argparse
import warnings
warnings.filterwarnings("ignore")

import numpy as np

try:
    import cv2
except ImportError:
    raise SystemExit(
        "opencv-python is required for this script. Install with:\n"
        "  pip install opencv-python"
    )

try:
    import mediapipe as mp
except ImportError:
    raise SystemExit(
        "mediapipe is required for this script. Install with:\n"
        "  pip install mediapipe"
    )

import tensorflow as tf
from tensorflow.keras.models import load_model

SEQUENCE_LENGTH = 30
COUNTDOWN_SECONDS = 5.0  # matches test_webcam_trigger.py exactly

mp_holistic = mp.solutions.holistic
mp_drawing  = mp.solutions.drawing_utils

# ============================================================
# Exact extraction logic from extraction.py / test_webcam_trigger.py
# ============================================================
SELECTED_FACE_IDS = [
    # Lips (For mouthing/shape)
    0, 13, 14, 17, 37, 39, 40, 61, 78, 80, 81, 82, 84, 87, 88, 91, 95, 146,
    178, 181, 191, 267, 269, 270, 291, 308, 310, 311, 312, 314, 317, 318,
    321, 324, 375, 402, 405, 415,
    # Eyebrows
    46, 52, 53, 55, 65, 70, 105, 107, 276, 282, 283, 285, 295, 300, 334, 336,
    # Left Cheek Zone
    50, 118, 123, 137, 205, 206, 207, 212, 214, 216,
    # Right Cheek Zone
    280, 347, 352, 366, 425, 426, 427, 432, 434, 436
]


def extract_and_normalize_keypoints(results):
    """Verbatim from test_webcam_trigger.py / extraction.py."""
    cx, cy, cz = 0.0, 0.0, 0.0
    scale = 1.0

    if results.pose_landmarks:
        l_sh = results.pose_landmarks.landmark[11]
        r_sh = results.pose_landmarks.landmark[12]
        cx, cy, cz = (l_sh.x + r_sh.x) / 2, (l_sh.y + r_sh.y) / 2, (l_sh.z + r_sh.z) / 2
        shoulder_dist = np.linalg.norm([l_sh.x - r_sh.x, l_sh.y - r_sh.y, l_sh.z - r_sh.z])
        if shoulder_dist > 0:
            scale = shoulder_dist

    def norm(lm_list, is_face=False):
        if not lm_list:
            return np.zeros(len(SELECTED_FACE_IDS) * 3) if is_face else np.zeros(21 * 3)
        data = []
        for i, lm in enumerate(lm_list.landmark):
            if is_face and i not in SELECTED_FACE_IDS:
                continue
            data.extend([(lm.x - cx) / scale, (lm.y - cy) / scale, (lm.z - cz) / scale])
        return np.array(data)

    lh, rh = norm(results.left_hand_landmarks), norm(results.right_hand_landmarks)
    face = norm(results.face_landmarks, is_face=True)

    if results.pose_landmarks:
        pose = np.array([[(lm.x - cx) / scale, (lm.y - cy) / scale, (lm.z - cz) / scale]
                          for lm in results.pose_landmarks.landmark]).flatten()
    else:
        pose = np.zeros(33 * 3)

    return np.concatenate([pose, face, lh, rh])


# ============================================================
# Live capture loop (mirrors test_webcam_trigger.py's state machine)
# ============================================================
def capture_one_sequence(holistic):
    """Runs the SPACE -> countdown -> RECORDING flow exactly like
    test_webcam_trigger.py. Returns (sequence, processing_ms, wallclock_ms)
    or None if the user quit."""
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        raise RuntimeError("Could not open webcam (source 0).")

    state = "IDLE"
    countdown_start_time = 0
    sequence = []
    processing_time_ms = 0.0   # MediaPipe + normalization compute only
    wallclock_start = None

    print("Press SPACE to start recording, 'q' to quit.")

    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                print("Failed to read from webcam.")
                return None

            image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            image.flags.writeable = False

            if state == "RECORDING":
                t0 = time.perf_counter()
                results = holistic.process(image)
                keypoints = extract_and_normalize_keypoints(results)
                t1 = time.perf_counter()
                processing_time_ms += (t1 - t0) * 1000
                sequence.append(keypoints)
            else:
                results = holistic.process(image)  # still needed to draw / for UX

            image.flags.writeable = True
            image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
            mp_drawing.draw_landmarks(image, results.left_hand_landmarks, mp_holistic.HAND_CONNECTIONS)
            mp_drawing.draw_landmarks(image, results.right_hand_landmarks, mp_holistic.HAND_CONNECTIONS)
            mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_holistic.POSE_CONNECTIONS)

            if state == "RECORDING":
                cv2.rectangle(image, (0, 0), (640, 40), (0, 0, 255), -1)
                cv2.putText(image, f'RECORDING: {len(sequence)}/{SEQUENCE_LENGTH} frames',
                            (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2, cv2.LINE_AA)
                if len(sequence) == SEQUENCE_LENGTH:
                    wallclock_ms = (time.perf_counter() - wallclock_start) * 1000
                    cap.release()
                    cv2.destroyAllWindows()
                    return np.array(sequence, dtype=np.float32), processing_time_ms, wallclock_ms

            elif state == "IDLE":
                cv2.rectangle(image, (0, 0), (640, 40), (245, 117, 16), -1)
                cv2.putText(image, "Press SPACE to start recording", (10, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2, cv2.LINE_AA)

            elif state == "COUNTDOWN":
                time_left = COUNTDOWN_SECONDS - (time.time() - countdown_start_time)
                if time_left <= 0:
                    state = "RECORDING"
                    sequence = []
                    processing_time_ms = 0.0
                    wallclock_start = time.perf_counter()
                else:
                    cv2.rectangle(image, (0, 0), (640, 80), (0, 165, 255), -1)
                    cv2.putText(image, f"GET READY: {int(time_left) + 1}", (10, 50),
                                cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 0), 3, cv2.LINE_AA)

            cv2.imshow('SignLingo Latency Benchmark', image)
            key = cv2.waitKey(10) & 0xFF
            if key == ord('q'):
                cap.release()
                cv2.destroyAllWindows()
                return None
            elif key == ord(' ') and state == "IDLE":
                state = "COUNTDOWN"
                countdown_start_time = time.time()
    finally:
        cap.release()
        cv2.destroyAllWindows()


# ============================================================
# Model timing (same captured sequence, every format)
# ============================================================
def time_keras_predict(h5_path, sequence, n_repeats=5):
    model = load_model(h5_path)
    inp = np.expand_dims(sequence, axis=0)
    latencies = []
    for _ in range(n_repeats):
        t0 = time.perf_counter()
        model.predict(inp, verbose=0)
        t1 = time.perf_counter()
        latencies.append((t1 - t0) * 1000)
    return float(np.mean(latencies))


def time_tflite_predict(tflite_path, sequence, n_repeats=5):
    interpreter = tf.lite.Interpreter(model_path=tflite_path)
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    inp = sequence[np.newaxis, ...].astype(np.float32)

    latencies = []
    for _ in range(n_repeats):
        t0 = time.perf_counter()
        interpreter.set_tensor(input_details[0]["index"], inp)
        interpreter.invoke()
        _ = interpreter.get_tensor(output_details[0]["index"])
        t1 = time.perf_counter()
        latencies.append((t1 - t0) * 1000)
    return float(np.mean(latencies))


# ============================================================
# Main
# ============================================================
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--n_sequences", type=int, default=1,
                        help="Number of live sequences to capture and average over")
    parser.add_argument("--h5_model", default="models/signlingo_gru_best.h5",
                        help="Path to the raw Keras .h5 model")
    args = parser.parse_args()

    candidates_tflite = [
        ("Float32 (baseline)", "signlingo_fp32.tflite"),
        ("Float16",            "signlingo_fp16.tflite"),
        ("Dynamic Range",      "signlingo_dynamic.tflite"),
        ("Full INT8",          "signlingo_int8.tflite"),
    ]

    processing_times, wallclock_times, sequences = [], [], []

    with mp_holistic.Holistic(min_detection_confidence=0.5,
                               min_tracking_confidence=0.5) as holistic:
        for i in range(args.n_sequences):
            print(f"\n--- Capturing sequence {i + 1}/{args.n_sequences} ---")
            result = capture_one_sequence(holistic)
            if result is None:
                print("Quit before completing capture.")
                return
            seq, proc_ms, wall_ms = result
            sequences.append(seq)
            processing_times.append(proc_ms)
            wallclock_times.append(wall_ms)
            print(f"  Extraction processing time: {proc_ms:.2f} ms  |  "
                  f"Capture wall-clock: {wall_ms:.2f} ms")

    mean_processing = float(np.mean(processing_times))
    mean_wallclock  = float(np.mean(wallclock_times))

    print(f"\nMean extraction processing time (compute only): {mean_processing:.2f} ms")
    print(f"Mean capture wall-clock time (incl. camera pacing): {mean_wallclock:.2f} ms\n")

    results = []

    if os.path.exists(args.h5_model):
        print(f"Timing raw Keras model: {args.h5_model} …")
        model_times = [time_keras_predict(args.h5_model, seq) for seq in sequences]
        model_mean = float(np.mean(model_times))
        results.append({
            "Model": "Raw Keras .h5 (eager)",
            "Processing (ms)": round(mean_processing, 3),
            "Model Inference (ms)": round(model_mean, 3),
            "Total Processing Latency (ms)": round(mean_processing + model_mean, 3),
            "Total incl. Capture Wall-Clock (ms)": round(mean_wallclock + model_mean, 3),
        })
        print(f"  Model inference: {model_mean:.3f} ms")
    else:
        print(f"  Skipping raw Keras model: '{args.h5_model}' not found")

    for label, path in candidates_tflite:
        if not os.path.exists(path):
            print(f"  Skipping {label}: '{path}' not found")
            continue
        print(f"Timing model inference: {label} …")
        model_times = [time_tflite_predict(path, seq) for seq in sequences]
        model_mean = float(np.mean(model_times))
        results.append({
            "Model": label,
            "Processing (ms)": round(mean_processing, 3),
            "Model Inference (ms)": round(model_mean, 3),
            "Total Processing Latency (ms)": round(mean_processing + model_mean, 3),
            "Total incl. Capture Wall-Clock (ms)": round(mean_wallclock + model_mean, 3),
        })
        print(f"  Model inference: {model_mean:.3f} ms")

    print("\n── End-to-End Latency Results ───────────────────────────────")
    header = (f"{'Model':<24}{'Processing (ms)':>17}{'Model (ms)':>13}"
              f"{'Total Proc. (ms)':>18}{'Total w/ Capture (ms)':>23}")
    print(header)
    for r in results:
        print(f"{r['Model']:<24}{r['Processing (ms)']:>17.3f}"
              f"{r['Model Inference (ms)']:>13.3f}"
              f"{r['Total Processing Latency (ms)']:>18.3f}"
              f"{r['Total incl. Capture Wall-Clock (ms)']:>23.3f}")

    with open("e2e_latency_results.json", "w") as f:
        json.dump(results, f, indent=2)
    print("\nSaved → e2e_latency_results.json")


if __name__ == "__main__":
    main()