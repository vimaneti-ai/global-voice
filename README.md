# Live Translate

Multi-language **voice** calls. Everyone picks their language. Translation spins up on demand.

Powered by [LiveKit Agents](https://docs.livekit.io/agents/) (Python worker) and the [Gemini Live API](https://ai.google.dev/gemini-api/docs/live).

![architecture](https://img.shields.io/badge/architecture-peer--call-5B21B6) ![agent](https://img.shields.io/badge/agent-python-3776AB) ![web](https://img.shields.io/badge/web-nextjs-000000) [![CI](https://github.com/vimaneti-ai/global-voice/actions/workflows/ci.yml/badge.svg)](https://github.com/vimaneti-ai/global-voice/actions/workflows/ci.yml)

---

## What it does

Anyone with the link joins as a peer — audio only, no camera. Each participant picks one language — that's what they speak **and** what they want to hear everyone else in. When someone speaks, a Gemini Live session translates their audio into every other distinct language present in the room, on demand. Same-language pairs hear each other natively, no Gemini cost.

- 8-person rooms by default (configurable)
- English, Hindi, Telugu, Tamil, Malayalam, and Kannada
- Microphone defaults off; toggle on when you're ready
- Captions sidebar (per listener, in their chosen language) with auto-scroll transcripts
- LiveKit Cloud Agents-ready: deploy the Python worker, the frontend dispatches it via room config on token mint

See [PRIVACY.md](PRIVACY.md) for exactly what happens to microphone audio, names, and language choices as they move through LiveKit and Gemini.

## How it works

```mermaid
flowchart LR
    Alice(["Alice<br/>EN"])
    Bob(["Bob<br/>HI"])
    Agent["<b>Translator agent</b><br/>Python worker<br/>one per LiveKit room"]

    Alice -- mic --> Agent
    Bob -- mic --> Agent
    Agent -- "tx:bob:en" --> Alice
    Agent -- "tx:alice:hi" --> Bob
```

Each participant's chosen language lives in their LiveKit `attributes.lang`. The agent watches `participantAttributesChanged` and reconciles a map of `(speaker, target_lang)` sessions — one Gemini Live session per pair, skipping pairs where source == target.

For each active pair the agent publishes two things into the room:

- an audio track named **`tx:<speaker>:<target_lang>`** carrying the translated speech
- a **`lk.translation`** text-stream carrying the matching captions, tagged with `target_lang`

The frontend subscribes to either the native mic or the matching `tx:*` track for each peer, based on the same `(listener_lang, speaker_lang)` predicate — see [`useTranslationRouting.ts`](src/app/session/[id]/room/useTranslationRouting.ts).

## Quick start

You need:
- Node.js 20+, [pnpm](https://pnpm.io/) (or run `corepack enable` and let the repo's `packageManager` field pin it)
- Python 3.11+, [uv](https://docs.astral.sh/uv/)
- A [LiveKit Cloud](https://cloud.livekit.io) project (free tier works)
- A [Gemini API key](https://aistudio.google.com/apikey)

```bash
# 1. Install deps and seed env files
pnpm run setup

# 2. Fill in credentials in .env.local and translator/.env.local
#    LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET (both files)
#    GEMINI_API_KEY (translator/.env.local only)

# 3. Run frontend + agent worker together
pnpm run dev
```

Open <http://localhost:3000>, click **Create session**, share the URL with another browser, pick different languages, unmute.

For a fuller walkthrough (getting credentials, troubleshooting, Docker, deploying), see [SETUP.md](SETUP.md).

## Repo layout

```
gemini-live-translate-livekit/
├── src/                                 # Next.js 16 frontend
│   ├── app/
│   │   ├── page.tsx                     # Landing
│   │   ├── icon.tsx                     # Generated favicon/app icon
│   │   ├── globals.css                  # Design tokens + shared component styles
│   │   ├── api/token/route.ts           # Mints token + dispatches translator agent
│   │   └── session/[id]/
│   │       ├── page.tsx                 # Pre-flight (name + language)
│   │       └── room/                    # In-call UI
│   │           ├── RoomClient.tsx
│   │           ├── InCall.tsx
│   │           ├── ParticipantCard.tsx  # Per-peer voice tile (avatar, speaking state, mute)
│   │           ├── ControlBar.tsx       + LanguagePill
│   │           ├── CaptionsSidebar.tsx
│   │           └── useTranslationRouting.ts
│   └── lib/
│       ├── languages.ts                 # Supported languages + "none" sentinel
│       └── config.ts                    # Caps, attribute keys
├── translator/                          # Python LiveKit Agents worker
│   ├── src/
│   │   ├── agent.py                     # @server.rtc_session(agent_name="gemini-translator")
│   │   ├── router.py                    # TranslationRouter (reconcile loop)
│   │   ├── session.py                   # GeminiSession (one per speaker→target pair)
│   │   ├── audio.py                     # PCM glue
│   │   └── config.py                    # Model id, debounce, grace, etc.
│   ├── tests/test_router.py             # Demand-set computation
│   ├── pyproject.toml
│   └── Dockerfile                       # For LiveKit Cloud Agents or self-hosted deploy
├── compose.yaml                         # Self-hosted: web + translator + Caddy together
├── Caddyfile                            # Reverse proxy + automatic HTTPS for the compose deploy
├── Dockerfile                           # Frontend container image
└── .github/workflows/ci.yml             # Lint + build (web), lint + format + test (translator)
```

## Deploy

Two ways to run this in production:

**Split** — agent to LiveKit Cloud Agents, frontend anywhere that runs Next.js:
```bash
cd translator
lk agent create --secrets-file .env.local .   # first time
lk agent deploy                               # subsequent deploys
```
The frontend needs no special config on Vercel since the only API route is
`/api/token` and it's stateless; container hosts (Cloud Run, Fly.io, Render,
etc.) can use the included `Dockerfile`.

**All-in-one** — `compose.yaml` + `Caddyfile` at the repo root run the
frontend, the agent, and a Caddy reverse proxy (automatic HTTPS) together on a
single host. This is what actually runs this project's own deployment. See
[SETUP.md](SETUP.md#all-in-one-with-docker-compose--caddy) for the full
walkthrough (DNS, `.env.web`/`.env.agent`, verification).

Set on the frontend host:
- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`

Set on the agent host:
- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `GEMINI_API_KEY`

See [SETUP.md](SETUP.md#deploying) for the full deploy walkthrough either way.

## Configuration

Caps in `src/lib/config.ts` and `translator/src/config.py` — adjust together:

| Setting | Default | Where |
|---|---|---|
| Max participants per room | 8 | `MAX_PARTICIPANTS` (token route) |
| Session TTL | 4h | token route `ttl` |
| Empty-room timeout | 60s | token route |
| Departure timeout (last person leaves) | 30s | token route |
| Session grace on mute | 10s | `SESSION_GRACE_SEC` (agent) |
| Reconcile debounce | 250ms | `RECONCILE_DEBOUNCE_SEC` (agent) |
| Gemini model | `gemini-3.5-live-translate-preview` | `GEMINI_MODEL` (agent) |

## Tech stack

- **Frontend** — Next.js 16 (Turbopack), React 19, `@livekit/components-react`, `livekit-client`
- **Token mint** — `livekit-server-sdk` (`RoomAgentDispatch` + `RoomConfiguration`)
- **Agent runtime** — `livekit-agents` 1.5 with `AgentServer.rtc_session()`
- **Translation** — Gemini Live API (raw v1beta `BidiGenerateContent` WebSocket with `translationConfig`)
- **Audio I/O** — `livekit.rtc.AudioStream` (16 kHz mono in) + `AudioSource` (24 kHz mono out)
- **Typography** — Inter (UI), JetBrains Mono (labels/status)
- **Package management** — `pnpm` + `uv`

## More docs

| Doc | Covers |
|---|---|
| [SETUP.md](SETUP.md) | Full setup, running, Docker, deploying (both paths), troubleshooting |
| [PRIVACY.md](PRIVACY.md) | What data (mic audio, display name, language choice) flows to LiveKit and Gemini, what's persisted (nothing), and what operators deploying this publicly should consider |
| [SECURITY.md](SECURITY.md) | How secrets are kept out of the web image, how to report a real security issue |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Branch/PR flow, commit style, pre-PR checks |
| [translator/README.md](translator/README.md) | Running, testing, and deploying the agent on its own |

This is self-hosted example software with no accounts and no database.

## License

MIT
