# Security

This is an open-source example project, not a company with a bug bounty program.
This document covers what secrets this codebase handles, how they're kept out of
things they shouldn't be in, and how to report a problem.

## Secrets this project handles

| Secret | Used by | Never appears in |
|---|---|---|
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | Frontend (mints tokens) and agent (joins rooms) | Client bundles, images, logs (see below) |
| `GEMINI_API_KEY` | Translator agent only | The frontend never sees or needs this key |

All of them are read from `.env.local` / `translator/.env.local` (local dev) or
`.env.web` / `.env.agent` (Docker Compose deploy) — see [SETUP.md](SETUP.md).
None of those filenames are committed; `.gitignore` blocks `.env*` except the
`*.example` templates, which ship with empty values.

## Kept out of the web image on purpose

`.dockerignore` excludes `translator/`, `.env*`, `.git`, and `.github` from the
frontend's build context. This means:
- The agent's source and its `GEMINI_API_KEY` usage never enter the web
  container's filesystem — a container compromise on the web side has nothing
  Gemini-related to find.
- No `.env*` file (including a stray `.env.local` a developer forgot to
  `.gitignore`-check) can be accidentally `COPY`'d into an image layer, where
  it would be recoverable from the image even after deletion in a later layer.

The same applies in reverse: the translator's own build context is
`./translator`, so it never has access to the frontend's files or secrets.

## Reporting a problem

If you find a genuine security issue (a way to exfiltrate another room's audio,
bypass the room's `MAX_PARTICIPANTS` cap, leak an API key through a response,
etc.), please open a [GitHub issue](https://github.com/vimaneti-ai/global-voice/issues)
or, if it's sensitive, use GitHub's private
["Report a vulnerability"](https://github.com/vimaneti-ai/global-voice/security/advisories/new)
flow on this repo instead of a public issue.

This is not a request for reports about the *design* choices already documented
in [PRIVACY.md](PRIVACY.md) — no auth on session links, no content moderation,
audio sent to Gemini for translation — those are known, intentional properties
of example software, not vulnerabilities. It's for cases where the code doesn't
do what these docs say it does.

## Scope note

Anyone who deploys this beyond local testing is responsible for the security of
their own deployment (host hardening, TLS config, secret storage, access to the
machine running `docker compose`, etc.) — this document covers the application
code in this repository, not any particular operator's infrastructure.
