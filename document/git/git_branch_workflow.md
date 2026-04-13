# Git Branch Workflow Notes

## Goal
Keep DB access documentation separate from git branching and cleanup procedures.

---

## Repo Workflow (Recommended)

Oracle MySQL configuration is tracked on the main-based branch:

```text
feature/oracle-mysql-main
```

Pull the branch:

```bash
git fetch origin
git switch feature/oracle-mysql-main
```

Create a PR from GitHub:

```text
Compare: feature/oracle-mysql-main
Base: main
```

---

## Branch Cleanup (Recommended)

### Local `kotaiho` branch

It is safe to delete the local `kotaiho` branch first and keep `origin/kotaiho` for later.

```bash
git branch -d kotaiho
```

If Git refuses because it is not merged:

```bash
git branch -D kotaiho
```

### Remote `origin/kotaiho` branch

Do not delete the remote branch until confirming it is fully merged or no longer needed.

Check whether `origin/kotaiho` has commits not in `origin/main`:

```bash
git fetch origin
git log --oneline origin/main..origin/kotaiho
```

If the output is empty, `origin/kotaiho` is not ahead of `origin/main`.

Remote delete (only after confirmation):

```bash
git push origin --delete kotaiho
```

---

*작성일: 2026-04-14*
