
## Experiment context

Isolated-word BISINDO recognition, 40 classes, 4,400 sequences, GRU classifier on MediaPipe landmarks.

Evaluation is **leave-one-signer-out (LOSO)** with 4 folds, one per signer:
`A_numeric`, `B_dash`, `C_underscore`, `D_bisindo`

Four feature ablation arms, each nested inside the next:

| Arm | Feature blocks | Dim |
|---|---|---|
| `A_hands` | hands only | 126 |
| `AB_artic` | + articulator pose (shoulder/elbow/wrist) | 139 |
| `ABC_postural` | + head orientation (roll/yaw/pitch) | 142 |
| `ABCD_facial` | + facial NMS (mouth aperture/width, eyebrow raise L/R, eye openness) | 146 |

So there are 16 completed runs (4 arms × 4 folds).

The 40 classes are split into two pre-registered design groups of 20 each:
- **NMS-focused** — realization involves facial expression, head posture, or shoulder movement
- **Standard manual** — realization is primarily hand shape, location, and movement

## Step 0 — Discover the data before writing anything

Do **not** assume a file layout. First write a short discovery script that:

1. Searches the project directory for saved LOSO artifacts — prediction arrays, per-fold result files, saved model checkpoints, JSON/CSV/NPZ/pickle outputs.
2. Prints, for each thing it finds: path, format, shape, and dtype.
3. Reports whether per-sample `y_true` / `y_pred` are recoverable for all 16 (arm, fold) combinations.

Then report back to me which of these three situations we're in:

- **(a)** Per-sample predictions saved → proceed directly.
- **(b)** Only aggregate metrics saved, but model checkpoints exist → write a script that reloads each checkpoint and re-predicts on that fold's held-out set. Forward pass only, no training.
- **(c)** Neither saved → stop and tell me. Do not silently rerun training.

**Stop after Step 0 and wait for my confirmation before writing the analysis scripts.**

## Config block

Put this at the top of the analysis script for me to fill in:

```python
# TODO: fill in the 20 NMS-focused class labels, exactly as they appear in the label encoder
NMS_FOCUSED_CLASSES = [
    "marah", "sedih", "bingung", "bagaimana",
    # ... 16 more
]

ARMS  = ["A_hands", "AB_artic", "ABC_postural", "ABCD_facial"]
FOLDS = ["A_numeric", "B_dash", "C_underscore", "D_bisindo"]
```

Assert at runtime that `len(NMS_FOCUSED_CLASSES) == 20` and that every entry exists in the label set. The remaining 20 classes are the standard-manual group — derive them, don't hardcode.

## Analysis 1 — Per-fold NMS vs manual gap

For every (arm, fold) pair, split that fold's held-out predictions into the two class groups and compute accuracy separately.

Produce a table with one row per (arm, fold):

| arm | fold | n_nms | n_manual | acc_nms | acc_manual | gap |
|---|---|---|---|---|---|---|

where `gap = acc_nms − acc_manual`.

Then produce three summary views:

**1a. Gap matrix** — arms as rows, folds as columns, gap in each cell. Add a final column `folds_positive` counting how many of the 4 folds have a positive gap for that arm.

**1b. Per-fold monotonicity** — for each fold, check whether the gap increases monotonically across arms in the order `A_hands → AB_artic → ABC_postural → ABCD_facial`. Print one line per fold: the four gap values and whether the sequence is monotonically non-decreasing. Report how many of 4 folds are monotonic.

**1c. Decomposition** — for each fold, report `acc_nms(ABCD_facial) − acc_nms(A_hands)` and `acc_manual(ABCD_facial) − acc_manual(A_hands)` as separate columns. A gap can widen because NMS accuracy rose or because manual accuracy fell; these mean different things and must not be collapsed.

Print all three views to stdout as formatted text tables, and also save the per-(arm, fold) rows to CSV.

## Analysis 2 — Confusion pair analysis

**2a.** Build a 40×40 confusion matrix for `A_hands` and one for `ABCD_facial`, each pooled across all 4 folds. Save both as CSV.

Do **not** reuse the confusion pairs from the earlier stratified-split experiment — those came from a different protocol with only 3 errors total. Regenerate from LOSO predictions.

**2b.** Rank the top 15 most frequent confusion pairs in `A_hands` (unordered pairs — merge `(x→y)` and `(y→x)` into one count). For each pair report: both class names, error count in `A_hands`, error count in `ABCD_facial`, and the change.

**2c.** Sample-level flip analysis. Match predictions by sample identity across the two arms and count four buckets:

| Bucket | Meaning |
|---|---|
| `fixed` | A_hands wrong, ABCD_facial correct |
| `broken` | A_hands correct, ABCD_facial wrong |
| `both_correct` | — |
| `both_wrong` | — |

For the `fixed` bucket, print the distribution over true classes — sorted descending, showing how many fixes each class accounts for and what percentage of total fixes that is. Do the same for `broken`.

The question this answers: are the fixes concentrated in a few classes, or spread evenly across all 40? Make that visible in the output — e.g. print what fraction of all fixes fall in the top 5 classes.

**2d.** Cross-reference the `fixed` distribution against `NMS_FOCUSED_CLASSES`: what percentage of fixed samples have a true label in the NMS-focused group vs the standard-manual group? Compare against the base rate (each group is 50% of classes).

**Matching requirement:** flip analysis requires stable sample identity across arms. If predictions are stored without a sample index, look for one; if there genuinely isn't one, tell me rather than assuming array order is aligned across runs.

## Output requirements

- Two scripts: `analysis_1_group_gap.py`, `analysis_2_confusion.py`. Shared loading logic goes in `loso_io.py`.
- Standard library plus numpy, pandas, scikit-learn. No plotting libraries — text tables only.
- Every table printed to stdout **and** saved to CSV under `analysis_out/`.
- Assert row counts and class coverage at load time. If any (arm, fold) is missing, fail loudly and name it — do not skip silently or fill with NaN.
- Round percentages to 2 decimal places.
- No `try/except` that swallows errors. If something is wrong I want to see the traceback.

Start with Step 0 only.