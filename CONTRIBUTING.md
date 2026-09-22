# Contributing

## Branch and PR flow

This repo uses a two-stage flow: feature branches merge into `develop` via PR,
and `develop` periodically merges into `main` via PR.

```
feature/your-change  →  develop  →  main
```

- Branch off `develop`, not `main`: `git switch -c feature/your-change develop`
- Name branches by what they do: `feature/...`, `fix/...`, `chore/...`, `ci/...`
- Open the PR against `develop`. `main` should only receive merges from `develop`.
- Delete the branch once its PR is merged (`git branch -d`, then
  `git push origin --delete <branch>`) — merged feature branches don't need to
  stick around.

## Commit messages

Short, imperative, prefixed by what kind of change it is — this is what the
existing history already does:

```
feat: add captions auto-scroll
fix: correct empty-room timeout
chore: bump livekit-agents to 1.6
ci: add frontend and translator checks
```

One line is usually enough. Add a body if the *why* isn't obvious from the diff
or the PR description.

## Before opening a PR

Run both halves' checks locally — this is exactly what CI (`.github/workflows/ci.yml`)
runs on every PR to `develop` or `main`:

```bash
# Frontend
pnpm run lint
pnpm run build

# Translator (from translator/)
uv run ruff check
uv run ruff format --check
uv run pytest
```

If you changed anything under `translator/src/`, prefer test-driven development:
write or update a test in `translator/tests/` for the behavior first, then make
it pass — see [`translator/AGENTS.md`](translator/AGENTS.md) for why (voice
agents are latency-sensitive, so behavior needs to be pinned down by tests, not
re-verified by hand every time).

## Keep the two config files in sync

`src/lib/config.ts` (frontend) and `translator/src/config.py` (agent) both
define constants like the participant cap and the shared attribute key names.
If you change one, check whether the other needs the matching change — see the
Configuration table in [README.md](README.md#configuration).

## Docs

If your change affects behavior described in one of these, update it in the
same PR rather than leaving it stale:

- [README.md](README.md) — what the app does, architecture, quick start
- [SETUP.md](SETUP.md) — full setup, running, deploying, troubleshooting
- [PRIVACY.md](PRIVACY.md) — what data goes where, if you touch what's
  collected, sent to LiveKit/Gemini, or persisted
- [SECURITY.md](SECURITY.md) — if you touch secret handling or `.dockerignore`
