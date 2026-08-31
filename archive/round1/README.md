# Round 1 archive

Everything here was superseded by the Round 2 pipeline. Nothing in this folder is
imported or read by any file outside it. It is kept, rather than deleted, because
the Round 1 numbers are the "before" half of the paper's story and have to stay
citable when a reviewer asks what changed.

The Round 2 pipeline is four notebooks in the project root:

    prepare_features.ipynb -> run_ablation.ipynb -> train_final.ipynb -> latency.ipynb

## Why each group was retired

### code/

| File | Replaced by |
|---|---|
| `train_dynamic_gru_model.ipynb` | `train_final.ipynb`. Hand-authored GRU 64->64 baseline. |
| `hyperparameter_tuning.ipynb`, `tuner_results.ipynb` | Nothing. The 178-trial Hyperband search is **not** repeated. Its result is frozen as constants (GRU 32/256, dropout 0.3, kernel L2 1e-4, LR 1e-3) in `run_ablation.ipynb` and `train_final.ipynb`. Re-tuning on LOSO folds would be selecting on test. |
| `kfold_cross_validation.ipynb` | The stratified reference run inside `run_ablation.ipynb`. |
| `ablation_loso_study.*` | `run_ablation.ipynb`. |
| `signer_diagnostics.ipynb` | The separability gate in `prepare_features.ipynb`. |
| `phase1_loso_ablation.ipynb` | `run_ablation.ipynb`, its direct descendant. |
| `final_result.ipynb` | Tables I and II in `train_final.ipynb`. |
| `quantization.py`, `quantization.ipynb` | Table III in `train_final.ipynb`. The Flex-delegate workaround was carried over unchanged. |
| `extraction.py` | The copy in the separate `bisindo_project` repo, which is now canonical. This one is a stale duplicate of the 447-dim pipeline. |
| `training_model.py` | `train_final.ipynb`. **Note:** this was the only script that produced `models/signlingo_v2_gru_4.h5`, the model the Django app still serves. That model file is untouched in `models/`. Restore this script if you need to retrain the app on the old 447-dim features rather than migrating it to a compact model. |

### results/ and figures/

Measured on 447-dim features and, in most cases, before de-duplication. None of it
is comparable to Round 2 output, which runs on the 146-dim compact vector.
`e2e_latency_results.json` was already flagged stale in the project notes.

### models/

The frozen Round 1 model and its four TFLite conversions, plus `test_data.npz`,
the cached test split it was scored on. All 447-dim, so they cannot be loaded by
anything in Round 2.

**Two different `signlingo_gru_best.h5` files existed**, one in the project root
and one in `models/`. They looked like duplicates (identical byte count) but are
not: their git blobs differ, so they are two separate training runs of the same
configuration. `signlingo_gru_best.h5` here is the `models/` copy, the one
`quantization.py` and the thesis tables actually used;
`signlingo_gru_best_root_copy.h5` is the root one. Round 2 uses neither, but the
distinction matters if you ever go back to reproduce a Round 1 number, since
retraining was stochastic and the two are not interchangeable.

### models-unreferenced/

`Best Model.h5`, `EfficientNet Model.h5`, `MobileNet Model.h5`. About 98 MB of
legacy comparison models with zero references anywhere in the repo, flagged twice
in `changes.md` and never resolved. Safe to delete outright if you want the space.

## Still live, deliberately not archived

- `models/bisindo_static_model.h5` - served by `django_port/games_port/services.py:10`
- `models/signlingo_v2_gru_4.h5` - served by `services.py:255`
- `signlingo_v2_gru_4.h5` (root) - loaded by `test_webcam_trigger.py:23`
- `Training_the_model.ipynb` - trains the static alphabet CNN, unrelated to the GRU work
- `measure_runtime.ipynb` - measures installed package sizes, independent of features
- `py_to_notebook.py` - the .py to .ipynb converter the Round 2 notebooks are built with

## Restoring

Every move was a `git mv`, so history follows the files and a single revert brings
them back:

    git checkout HEAD -- <path>

To delete this archive permanently once the paper is finished:

    git rm -r archive/round1
