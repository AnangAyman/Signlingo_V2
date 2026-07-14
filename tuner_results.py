import os
import gc
import warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import keras_tuner as kt
import tensorflow as tf
from tqdm import tqdm

from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import GRU, Dense, Dropout, InputLayer
from tensorflow.keras import regularizers
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
from tensorflow.keras.utils import to_categorical
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

sns.set_theme(style="darkgrid", palette="muted")
plt.rcParams.update({"figure.dpi": 120, "font.family": "DejaVu Sans"})
ACCENT  = "#7C3AED"
ACCENT2 = "#06B6D4"
RED     = "#EF4444"
GREEN   = "#22C55E"
AMBER   = "#F59E0B"

# ============================================================
# 0  –  Reload dataset (needed to retrain the best model)
# ============================================================
DATA_DIR        = "features"
SEQUENCE_LENGTH = 30
FEATURES_DIM    = 447
RANDOM_STATE    = 42
MAX_SAMPLES     = 110

print("Loading dataset …")
actions = sorted([d for d in os.listdir(DATA_DIR)
                  if os.path.isdir(os.path.join(DATA_DIR, d))])
num_classes = len(actions)
label_map   = {a: i for i, a in enumerate(actions)}

sequences, labels = [], []
for action in actions:
    action_path = os.path.join(DATA_DIR, action)
    npy_files = [f for f in os.listdir(action_path) if f.endswith(".npy")]
    for f in tqdm(npy_files, desc=f"  {action:<15}", leave=False):
        seq = np.load(os.path.join(action_path, f))
        if seq.shape == (SEQUENCE_LENGTH, FEATURES_DIM):
            sequences.append(seq)
            labels.append(label_map[action])

X = np.array(sequences, dtype=np.float32)
y = to_categorical(labels, num_classes=num_classes).astype(np.float32)

# Balance
y_ints = np.argmax(y, axis=1)
idx = []
for i in range(num_classes):
    idx.extend(np.where(y_ints == i)[0][:MAX_SAMPLES])
X, y = X[idx], y[idx]

# Split
try:
    X_train, X_tmp, y_train, y_tmp = train_test_split(
        X, y, test_size=0.20, stratify=y, random_state=RANDOM_STATE)
    X_val, X_test, y_val, y_test = train_test_split(
        X_tmp, y_tmp, test_size=0.50, stratify=y_tmp, random_state=RANDOM_STATE)
except ValueError:
    X_train, X_tmp, y_train, y_tmp = train_test_split(
        X, y, test_size=0.20, random_state=RANDOM_STATE)
    X_val, X_test, y_val, y_test = train_test_split(
        X_tmp, y_tmp, test_size=0.50, random_state=RANDOM_STATE)

# ── Free arrays we no longer need *before* augmentation, not after ──────────
# (X, y, X_tmp, y_tmp were only needed to produce the splits above)
del X, y, X_tmp, y_tmp
gc.collect()

# Augmentation (×2, float32 throughout)
def augment_sequence(data):
    aug = data.copy().astype(np.float32)
    aug += np.random.normal(0, 0.005, aug.shape).astype(np.float32)
    aug  = aug.reshape(30, -1, 3)
    aug *= np.float32(np.random.uniform(0.95, 1.05))
    angle = np.radians(np.random.uniform(3, 5) * np.random.choice([-1, 1]))
    c, s  = np.cos(angle), np.sin(angle)
    R     = np.array([[c,-s,0],[s,c,0],[0,0,1]], dtype=np.float32)
    aug   = np.dot(aug, R).reshape(30, FEATURES_DIM)
    new_len = int(30 * np.random.uniform(0.9, 1.1))
    out     = np.zeros((30, FEATURES_DIM), dtype=np.float32)
    for f in range(FEATURES_DIM):
        out[:, f] = np.interp(
            np.linspace(0, 29, 30),
            np.linspace(0, 29, new_len),
            np.interp(np.linspace(0, 29, new_len), np.arange(30), aug[:, f]))
    return out

print("Augmenting training set …")
# Preallocate the final array and fill it in place. This avoids ever holding
# two full-size intermediate augmented arrays *plus* a third concatenated
# array in RAM at the same time (which is what was blowing up memory).
n_train = X_train.shape[0]
X_train_aug = np.empty((n_train * 3, SEQUENCE_LENGTH, FEATURES_DIM), dtype=np.float32)
y_train_aug = np.empty((n_train * 3, y_train.shape[1]), dtype=np.float32)

X_train_aug[:n_train] = X_train
y_train_aug[:n_train] = y_train

for i, s in enumerate(X_train):
    X_train_aug[n_train + i] = augment_sequence(s)
y_train_aug[n_train:2 * n_train] = y_train

for i, s in enumerate(X_train):
    X_train_aug[2 * n_train + i] = augment_sequence(s)
y_train_aug[2 * n_train:3 * n_train] = y_train

perm = np.random.permutation(len(X_train_aug))
X_train_aug, y_train_aug = X_train_aug[perm], y_train_aug[perm]

del X_train, y_train  # no longer needed, free before building tf.data below
gc.collect()

print(f"  Train={X_train_aug.shape[0]}  Val={X_val.shape[0]}  Test={X_test.shape[0]}\n")

# Build tf.data pipelines then immediately free the numpy arrays
# from RAM so training doesn't OOM. tf.data has already copied them
# into its own internal tensor storage.
BATCH_SIZE = 32
train_ds = (tf.data.Dataset.from_tensor_slices((X_train_aug, y_train_aug))
            .shuffle(len(X_train_aug), reshuffle_each_iteration=True)
            .batch(BATCH_SIZE)
            .prefetch(tf.data.AUTOTUNE))
val_ds   = (tf.data.Dataset.from_tensor_slices((X_val, y_val))
            .batch(BATCH_SIZE)
            .prefetch(tf.data.AUTOTUNE))
test_ds  = (tf.data.Dataset.from_tensor_slices((X_test, y_test))
            .batch(BATCH_SIZE)
            .prefetch(tf.data.AUTOTUNE))

# ── Free large numpy arrays now that tf.data has ingested them ────────────────
# (X, y, X_tmp, y_tmp, X_train, y_train were already freed earlier, right
# after they became unnecessary, to keep peak RAM usage down)
del X_train_aug, y_train_aug   # ~540 MB
gc.collect()
print("RAM freed — starting tuner load and training.\n")

# ============================================================
# B  –  Load saved tuner & extract best hyperparameters
# ============================================================

# model builder must be re-declared so the tuner can deserialise saved trials
def build_model(hp):
    gru1 = hp.Choice("gru_units_1",   values=[32, 64, 128, 256], default=64)
    gru2 = hp.Choice("gru_units_2",   values=[32, 64, 128, 256], default=64)
    drop = hp.Float( "dropout_rate",  min_value=0.1, max_value=0.5, step=0.1, default=0.2)
    l2r  = hp.Choice("l2_rate",       values=[1e-5, 1e-4, 1e-3], default=1e-4)
    rec  = hp.Boolean("use_recurrent_l2", default=True)
    lr   = hp.Choice("learning_rate", values=[1e-4, 5e-4, 1e-3, 3e-3], default=1e-3)

    kreg = regularizers.l2(l2r)
    rreg = regularizers.l2(l2r) if rec else None

    model = Sequential([
        InputLayer(input_shape=(SEQUENCE_LENGTH, FEATURES_DIM)),
        GRU(gru1, return_sequences=True,  name="gru_1",
            kernel_regularizer=kreg, recurrent_regularizer=rreg),
        Dropout(drop, name="dropout_1"),
        GRU(gru2, return_sequences=False, name="gru_2",
            kernel_regularizer=kreg, recurrent_regularizer=rreg),
        Dropout(drop, name="dropout_2"),
        Dense(num_classes, activation="softmax", name="output",
              kernel_regularizer=regularizers.l2(l2r)),
    ], name="SignLingo_GRU_Tuned")
    model.compile(optimizer=Adam(lr),
                  loss="categorical_crossentropy",
                  metrics=["accuracy"])
    return model

print("Loading saved tuner from kt_tuner_logs/ …")
tuner = kt.Hyperband(
    build_model,
    objective=kt.Objective("val_accuracy", direction="max"),
    max_epochs=60,
    factor=3,
    hyperband_iterations=2,
    directory="kt_tuner_logs",
    project_name="signlingo_gru",
    overwrite=False,   # <-- load existing results, do NOT overwrite
)

print("\n── Best hyperparameters found ──────────────────────────────")
best_hps = tuner.get_best_hyperparameters(num_trials=1)[0]
print(f"  gru_units_1      : {best_hps.get('gru_units_1')}")
print(f"  gru_units_2      : {best_hps.get('gru_units_2')}")
print(f"  dropout_rate     : {best_hps.get('dropout_rate'):.1f}")
print(f"  l2_rate          : {best_hps.get('l2_rate')}")
print(f"  use_recurrent_l2 : {best_hps.get('use_recurrent_l2')}")
print(f"  learning_rate    : {best_hps.get('learning_rate')}")

tuner.results_summary(num_trials=5)

# ============================================================
# B3  –  Retrain the best model (full 150 epochs, tf.data)
# ============================================================
BEST_MODEL_PATH = "models/signlingo_gru_best.h5"
os.makedirs("models", exist_ok=True)

best_model = tuner.hypermodel.build(best_hps)
best_model.summary()

callbacks = [
    EarlyStopping(monitor="val_loss", patience=15,
                  restore_best_weights=True, verbose=1),
    ReduceLROnPlateau(monitor="val_loss", factor=0.5,
                     patience=5, min_lr=1e-6, verbose=1),
    ModelCheckpoint(BEST_MODEL_PATH, monitor="val_loss",
                    save_best_only=True, verbose=1),
]

print(f"\n── Retraining best model for up to 150 epochs ──────────────")
history_best = best_model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=150,
    callbacks=callbacks,
    verbose=1,
)
print(f"\nBest model saved → {BEST_MODEL_PATH}")

# ============================================================
# C  –  Visualisations
# ============================================================
hist = history_best.history
ep   = range(1, len(hist["loss"]) + 1)

fig, axes = plt.subplots(1, 2, figsize=(14, 5))

ax = axes[0]
ax.plot(ep, hist["loss"],     color=ACCENT, lw=2, label="Train Loss")
ax.plot(ep, hist["val_loss"], color=RED,    lw=2, label="Val Loss", linestyle="--")
best_ep = int(np.argmin(hist["val_loss"])) + 1
ax.axvline(best_ep, color=GREEN, lw=1.5, linestyle=":", label=f"Best epoch ({best_ep})")
ax.set_title("Loss – Best Tuned Model", fontweight="bold")
ax.set_xlabel("Epoch"); ax.set_ylabel("Loss"); ax.legend()

ax = axes[1]
ax.plot(ep, hist["accuracy"],     color=ACCENT,  lw=2, label="Train Acc")
ax.plot(ep, hist["val_accuracy"], color=ACCENT2, lw=2, label="Val Acc", linestyle="--")
best_acc = max(hist["val_accuracy"])
ax.axhline(best_acc, color=GREEN, lw=1.5, linestyle=":",
           label=f"Best val acc ({best_acc:.3f})")
ax.set_title("Accuracy – Best Tuned Model", fontweight="bold")
ax.set_xlabel("Epoch"); ax.set_ylabel("Accuracy"); ax.legend()

plt.suptitle("Best-Model Training History (after HP tuning)", fontsize=15,
             fontweight="bold", y=1.02)
plt.tight_layout()
plt.show()

# Test-set evaluation
print("\n── Test-set evaluation ─────────────────────────────────────")
test_loss, test_acc = best_model.evaluate(test_ds, verbose=0)
print(f"  Test Loss     : {test_loss:.4f}")
print(f"  Test Accuracy : {test_acc * 100:.2f}%")

# ── Save everything quantization.py needs, since it runs as its own separate
# script/process and won't have access to these in-memory variables ─────────
np.savez("test_data.npz", X_test=X_test, y_test=y_test)
with open("model_meta.json", "w") as f:
    import json
    json.dump({
        "actions": actions,
        "num_classes": num_classes,
        "model_save_path": BEST_MODEL_PATH,
    }, f, indent=2)
print(f"  Saved test set → test_data.npz")
print(f"  Saved metadata → model_meta.json")

# Trial comparison bar chart (top-10)
try:
    trials    = tuner.oracle.get_best_trials(num_trials=10)
    trial_ids = [f"T{i+1}" for i in range(len(trials))]
    scores    = [t.score for t in trials if t.score is not None]
    trial_ids = trial_ids[:len(scores)]

    fig, ax = plt.subplots(figsize=(10, 4))
    bars = ax.bar(trial_ids, scores,
                  color=plt.cm.plasma(np.linspace(0.15, 0.85, len(scores))),
                  edgecolor="white", linewidth=0.8)
    ax.set_ylim(max(0, min(scores) - 0.05), min(1.0, max(scores) + 0.05))
    for bar, val in zip(bars, scores):
        ax.text(bar.get_x() + bar.get_width() / 2,
                bar.get_height() + 0.002,
                f"{val:.3f}", ha="center", fontsize=9, fontweight="bold")
    ax.set_title("Top-10 Trials by Validation Accuracy", fontweight="bold")
    ax.set_xlabel("Trial"); ax.set_ylabel("Val Accuracy")
    plt.tight_layout(); plt.show()
except Exception as e:
    print(f"Trial chart skipped: {e}")

print("\nDone! Best model saved to:", BEST_MODEL_PATH)