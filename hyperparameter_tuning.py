# ============================================================
# SECTION A  –  Hyperparameter Search
# ============================================================

# ── A1: Extra imports ────────────────────────────────────────────────────────
import os
import warnings
warnings.filterwarnings("ignore")

import numpy as np
import keras_tuner as kt

import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import GRU, Dense, Dropout, InputLayer
from tensorflow.keras import regularizers
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
from tensorflow.keras.optimizers import Adam

from tensorflow.keras.utils import to_categorical
from sklearn.model_selection import train_test_split

# ── A1b: Configuration ───────────────────────────────────────────────────────
DATA_DIR        = "features"
SEQUENCE_LENGTH = 30
FEATURES_DIM    = 447
NUM_CLASSES     = 40
RANDOM_STATE    = 42
MAX_SAMPLES_PER_CLASS = 110

# ── A1c: Data loading ────────────────────────────────────────────────────────
print("Loading dataset from features/ ...")

if not os.path.exists(DATA_DIR):
    raise FileNotFoundError(
        f"Dataset folder '{DATA_DIR}' not found. "
        "Download it from Google Drive and place it in the project root."
    )

actions = sorted([
    d for d in os.listdir(DATA_DIR)
    if os.path.isdir(os.path.join(DATA_DIR, d))
])
num_classes = len(actions)
print(f"  Found {num_classes} classes: {actions}")

label_map  = {label: i for i, label in enumerate(actions)}
sequences, labels, skipped = [], [], 0

for action in actions:
    action_path = os.path.join(DATA_DIR, action)
    for seq_file in os.listdir(action_path):
        if not seq_file.endswith(".npy"):
            continue
        seq = np.load(os.path.join(action_path, seq_file))
        if seq.shape == (SEQUENCE_LENGTH, FEATURES_DIM):
            sequences.append(seq)
            labels.append(label_map[action])
        else:
            skipped += 1

X = np.array(sequences)
y = to_categorical(labels, num_classes=num_classes).astype(np.float32)
print(f"  Loaded {X.shape[0]} sequences | Skipped {skipped} bad shapes")

# ── A1d: Balance classes to MAX_SAMPLES_PER_CLASS ────────────────────────────
y_ints = np.argmax(y, axis=1)
balanced_idx = []
for i in range(num_classes):
    idx = np.where(y_ints == i)[0][:MAX_SAMPLES_PER_CLASS]
    balanced_idx.extend(idx)
X, y = X[balanced_idx], y[balanced_idx]
print(f"  Balanced to {X.shape[0]} sequences ({MAX_SAMPLES_PER_CLASS} per class max)")

# ── A1e: Train / Val / Test split (80 / 10 / 10) ─────────────────────────────
try:
    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=0.20, stratify=y, random_state=RANDOM_STATE)
except ValueError:
    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=0.20, random_state=RANDOM_STATE)
try:
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.50, stratify=y_temp, random_state=RANDOM_STATE)
except ValueError:
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.50, random_state=RANDOM_STATE)
print(f"  Train={X_train.shape[0]}  Val={X_val.shape[0]}  Test={X_test.shape[0]}")

# ── Free arrays we no longer need *before* augmentation, not after ──────────
# (X, y, X_temp, y_temp were only needed to produce the splits above; holding
# on to them while also building augmented copies is what causes MemoryError
# on machines with limited RAM)
import gc
del X, y, X_temp, y_temp
gc.collect()

# ── A1f: Data augmentation (training set only) ────────────────────────────────
def augment_sequence(data):
    aug = data.copy().astype(np.float32)                   # keep float32
    aug += np.random.normal(0, 0.005, aug.shape).astype(np.float32)  # noise
    aug = aug.reshape(30, -1, 3)
    aug *= np.float32(np.random.uniform(0.95, 1.05))       # spatial scale
    angle = np.radians(np.random.uniform(3, 5) * np.random.choice([-1, 1]))
    c, s  = np.cos(angle), np.sin(angle)
    R     = np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]], dtype=np.float32)
    aug   = np.dot(aug, R).reshape(30, FEATURES_DIM)
    stretch  = np.random.uniform(0.9, 1.1)
    new_len  = int(30 * stretch)
    out      = np.zeros((30, FEATURES_DIM), dtype=np.float32)
    for f in range(FEATURES_DIM):
        out[:, f] = np.interp(
            np.linspace(0, 29, 30),
            np.linspace(0, 29, new_len),
            np.interp(np.linspace(0, 29, new_len), np.arange(30), aug[:, f])
        )
    return out

print("  Augmenting training set (×2) ...")
# Preallocate the final array and fill it in place, instead of building two
# full-size intermediate augmented arrays and then concatenating everything
# into a third array. That pattern needs 3x the peak memory at once, which
# is what was causing the MemoryError.
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

idx = np.random.permutation(len(X_train_aug))
X_train_aug, y_train_aug = X_train_aug[idx], y_train_aug[idx]

del X_train, y_train
gc.collect()

print(f"  Augmented train set: {X_train_aug.shape[0]} samples")
print("Dataset ready.\n")

# ── A2: Model-builder function ───────────────────────────────────────────────
def build_model(hp):
    """
    Called by Keras Tuner for every trial.
    hp  : HyperParameters object – use hp.Int / hp.Float / hp.Choice / hp.Boolean
          to define the search space.
    """

    # ── Hyperparameters to tune ───────────────────────────────────────────
    gru_units_1 = hp.Choice(
        "gru_units_1",
        values=[32, 64, 128, 256],
        default=64,
    )
    gru_units_2 = hp.Choice(
        "gru_units_2",
        values=[32, 64, 128, 256],
        default=64,
    )
    dropout_rate = hp.Float(
        "dropout_rate",
        min_value=0.1,
        max_value=0.5,
        step=0.1,
        default=0.2,
    )
    l2_rate = hp.Choice(
        "l2_rate",
        values=[1e-5, 1e-4, 1e-3],
        default=1e-4,
    )
    use_recurrent_l2 = hp.Boolean(
        "use_recurrent_l2",
        default=True,
    )
    learning_rate = hp.Choice(
        "learning_rate",
        values=[1e-4, 5e-4, 1e-3, 3e-3],
        default=1e-3,
    )

    # ── Build the model ───────────────────────────────────────────────────
    kernel_reg  = regularizers.l2(l2_rate)
    recurrent_reg = regularizers.l2(l2_rate) if use_recurrent_l2 else None

    model = Sequential([
        InputLayer(input_shape=(SEQUENCE_LENGTH, FEATURES_DIM)),

        GRU(
            gru_units_1,
            return_sequences=True,
            name="gru_1",
            kernel_regularizer=kernel_reg,
            recurrent_regularizer=recurrent_reg,
        ),
        Dropout(dropout_rate, name="dropout_1"),

        GRU(
            gru_units_2,
            return_sequences=False,
            name="gru_2",
            kernel_regularizer=kernel_reg,
            recurrent_regularizer=recurrent_reg,
        ),
        Dropout(dropout_rate, name="dropout_2"),

        Dense(
            num_classes,
            activation="softmax",
            name="output",
            kernel_regularizer=regularizers.l2(l2_rate),
        ),
    ], name="SignLingo_GRU_Tuned")

    model.compile(
        optimizer=Adam(learning_rate=learning_rate),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


# ── A3: Tuner configuration ───────────────────────────────────────────────────
# Hyperband is the recommended algorithm: it aggressively culls bad configs
# early, making it much faster than random or grid search.
tuner = kt.Hyperband(
    build_model,
    objective=kt.Objective("val_accuracy", direction="max"),
    max_epochs=60,          # maximum epochs any single trial can run
    factor=3,               # halving / branching factor for Hyperband
    hyperband_iterations=2, # how many full Hyperband brackets to run
    directory="kt_tuner_logs",
    project_name="signlingo_gru",
    overwrite=False,        # set True to restart the search from scratch
)

tuner.search_space_summary()

# ── A4: Callbacks used during the search ─────────────────────────────────────
search_early_stop = EarlyStopping(
    monitor="val_loss",
    patience=8,                # shorter patience during search to save time
    restore_best_weights=True,
)
search_reduce_lr = ReduceLROnPlateau(
    monitor="val_loss",
    factor=0.5,
    patience=4,
    min_lr=1e-6,
    verbose=0,
)

# ── A5: Run the search ────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("  Starting Hyperband search …  (this may take a while)")
print("=" * 60 + "\n")

tuner.search(
    X_train_aug, y_train_aug,
    validation_data=(X_val, y_val),
    callbacks=[search_early_stop, search_reduce_lr],
    verbose=1,
)

print("\nSearch complete!")


# ============================================================
# SECTION B  –  Inspect Results & Retrain Best Model
# ============================================================

# ── B1: Show the top-5 hyperparameter configurations ─────────────────────────
print("\n" + "=" * 60)
print("  Top-5 hyperparameter configurations")
print("=" * 60)
tuner.results_summary(num_trials=5)

# ── B2: Get the single best HPs ──────────────────────────────────────────────
best_hps = tuner.get_best_hyperparameters(num_trials=1)[0]

print("\n── Best hyperparameters found ──────────────────────────────")
print(f"  gru_units_1      : {best_hps.get('gru_units_1')}")
print(f"  gru_units_2      : {best_hps.get('gru_units_2')}")
print(f"  dropout_rate     : {best_hps.get('dropout_rate'):.1f}")
print(f"  l2_rate          : {best_hps.get('l2_rate')}")
print(f"  use_recurrent_l2 : {best_hps.get('use_recurrent_l2')}")
print(f"  learning_rate    : {best_hps.get('learning_rate')}")

# ── B3: Retrain the best model for the full number of epochs ─────────────────
# The tuner only ran each trial for up to max_epochs; now we retrain the
# winning architecture for the full 150 epochs (same as the original notebook).
from tensorflow.keras.callbacks import ModelCheckpoint

BEST_MODEL_PATH = "signlingo_gru_best.h5"

best_model = tuner.hypermodel.build(best_hps)

full_early_stop = EarlyStopping(
    monitor="val_loss",
    patience=15,
    restore_best_weights=True,
    verbose=1,
)
full_reduce_lr = ReduceLROnPlateau(
    monitor="val_loss",
    factor=0.5,
    patience=5,
    min_lr=1e-6,
    verbose=1,
)
full_checkpoint = ModelCheckpoint(
    BEST_MODEL_PATH,
    monitor="val_loss",
    save_best_only=True,
    verbose=1,
)

print("\n── Retraining best model for up to 150 epochs ──────────────")
history_best = best_model.fit(
    X_train_aug, y_train_aug,
    validation_data=(X_val, y_val),
    epochs=150,
    callbacks=[full_early_stop, full_reduce_lr, full_checkpoint],
    verbose=1,
)
print(f"\nBest model saved to '{BEST_MODEL_PATH}'")


# ============================================================
# SECTION C  –  Visualise Tuning Results
# ============================================================

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import seaborn as sns

sns.set_theme(style="darkgrid", palette="muted")
plt.rcParams.update({"figure.dpi": 120, "font.family": "DejaVu Sans"})

ACCENT  = "#7C3AED"
ACCENT2 = "#06B6D4"
RED     = "#EF4444"
GREEN   = "#22C55E"

# ── C1: Training curves for the best model ───────────────────────────────────
hist = history_best.history
epochs_ran = range(1, len(hist["loss"]) + 1)

fig, axes = plt.subplots(1, 2, figsize=(14, 5))

ax = axes[0]
ax.plot(epochs_ran, hist["loss"],     color=ACCENT,  lw=2, label="Train Loss")
ax.plot(epochs_ran, hist["val_loss"], color=RED,     lw=2, label="Val Loss", linestyle="--")
best_epoch = int(np.argmin(hist["val_loss"])) + 1
ax.axvline(best_epoch, color=GREEN, lw=1.5, linestyle=":", label=f"Best epoch ({best_epoch})")
ax.set_title("Loss – Best Model (after tuning)", fontweight="bold")
ax.set_xlabel("Epoch")
ax.set_ylabel("Categorical Cross-Entropy")
ax.legend()

ax = axes[1]
ax.plot(epochs_ran, hist["accuracy"],     color=ACCENT,  lw=2, label="Train Accuracy")
ax.plot(epochs_ran, hist["val_accuracy"], color=ACCENT2, lw=2, label="Val Accuracy", linestyle="--")
best_val_acc = max(hist["val_accuracy"])
ax.axhline(best_val_acc, color=GREEN, lw=1.5, linestyle=":",
           label=f"Best val acc ({best_val_acc:.3f})")
ax.set_title("Accuracy – Best Model (after tuning)", fontweight="bold")
ax.set_xlabel("Epoch")
ax.set_ylabel("Accuracy")
ax.legend()

plt.suptitle("Best-Model Training History", fontsize=16, fontweight="bold", y=1.02)
plt.tight_layout()
plt.show()

# ── C2: HPs bar chart (top-10 trials by val_accuracy) ────────────────────────
trials = tuner.oracle.get_best_trials(num_trials=10)
trial_ids  = [f"T{i+1}" for i, _ in enumerate(trials)]
val_accs   = [t.score for t in trials]

fig, ax = plt.subplots(figsize=(10, 4))
bars = ax.bar(trial_ids, val_accs,
              color=plt.cm.plasma(np.linspace(0.15, 0.85, len(trials))),
              edgecolor="white", linewidth=0.8)
ax.set_ylim(max(0, min(val_accs) - 0.05), min(1.0, max(val_accs) + 0.05))
for bar, val in zip(bars, val_accs):
    ax.text(bar.get_x() + bar.get_width() / 2,
            bar.get_height() + 0.002,
            f"{val:.3f}", ha="center", fontsize=9, fontweight="bold")
ax.set_title("Top-10 Trials by Validation Accuracy", fontweight="bold")
ax.set_xlabel("Trial")
ax.set_ylabel("Val Accuracy")
plt.tight_layout()
plt.show()

# ── C3: Hyperparameter importance (correlation with val_accuracy) ─────────────
# Collect all completed trials into a DataFrame for quick analysis.
import pandas as pd

records = []
for trial in tuner.oracle.trials.values():
    if trial.score is None:
        continue
    row = dict(trial.hyperparameters.values)
    row["val_accuracy"] = trial.score
    records.append(row)

df = pd.DataFrame(records)

if len(df) > 1:
    numeric_cols = [c for c in df.columns if c != "val_accuracy"]
    # Boolean → int so correlation works
    for col in numeric_cols:
        if df[col].dtype == bool:
            df[col] = df[col].astype(int)

    corr = df[numeric_cols].corrwith(df["val_accuracy"]).sort_values()

    fig, ax = plt.subplots(figsize=(8, 4))
    colors = [GREEN if v >= 0 else RED for v in corr.values]
    ax.barh(corr.index, corr.values, color=colors, edgecolor="white", linewidth=0.8)
    ax.axvline(0, color="white", lw=0.8, linestyle="--")
    ax.set_title("Hyperparameter Correlation with Val Accuracy", fontweight="bold")
    ax.set_xlabel("Pearson Correlation Coefficient")
    plt.tight_layout()
    plt.show()