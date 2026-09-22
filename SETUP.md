# Setup

A fuller walkthrough than the README's quick start — getting credentials, running
each half on its own, Docker, deploying, and troubleshooting.

## 1. Prerequisites

| Tool | Version | Why |
|---|---|---|
| [Node.js](https://nodejs.org/) | 20+ | Runs the Next.js frontend |
| [pnpm](https://pnpm.io/) | 10.x (pinned via `packageManager`) | Frontend package manager. `corepack enable` will pick up the pinned version automatically |
| Python | 3.10 – 3.14 | Runs the translator agent |
| [uv](https://docs.astral.sh/uv/) | latest | Python package/venv manager for `translator/` |
| A modern browser | — | Needs microphone permission; Chrome/Edge/Firefox/Safari all work |

Optional, only needed if you'll deploy the agent to LiveKit Cloud Agents:
- [`livekit-cli`](https://docs.livekit.io/home/cli/cli-setup/) (`lk`) — `brew install livekit-cli` (macOS), `curl -sSL https://get.livekit.io/cli | bash` (Linux), `winget install LiveKit.LiveKitCLI` (Windows)

Optional, only needed for the Docker/Docker Compose paths ([§7](#7-docker), [self-hosted deploy](#all-in-one-with-docker-compose--caddy)):
- [Docker](https://docs.docker.com/get-docker/) with the Compose plugin (`docker compose version` should work, not just `docker-compose`)

## 2. Get credentials

### LiveKit Cloud

1. Sign up at [cloud.livekit.io](https://cloud.livekit.io) (free tier is enough for testing).
2. Create a project.
3. From the project's **Settings → Keys** page, copy:
   - the WebSocket URL (`LIVEKIT_URL`, looks like `wss://your-project.livekit.cloud`)
   - an API key (`LIVEKIT_API_KEY`)
   - its secret (`LIVEKIT_API_SECRET`)

Self-hosting LiveKit instead of using Cloud also works — just point `LIVEKIT_URL` at your own server.

### Gemini API key

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Create an API key. This is `GEMINI_API_KEY`, used only by the translator agent (never by the frontend).

## 3. Install and configure

```bash
pnpm run setup
```

This is `scripts/setup.sh`. It's idempotent — safe to re-run. It:
1. Copies `.env.example` → `.env.local` (frontend) if `.env.local` doesn't already exist.
2. Copies `translator/.env.example` → `translator/.env.local` if it doesn't already exist.
3. Runs `pnpm install`.
4. Runs `uv sync` inside `translator/`.

Then fill in the two env files:

**`.env.local`** (frontend, used by `src/app/api/token/route.ts`):
```
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
```

**`translator/.env.local`** (agent, used by `translator/src/agent.py`):
```
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
GEMINI_API_KEY=...
```

The LiveKit credentials in both files must point at the **same** LiveKit project — the frontend mints tokens and dispatches the agent into rooms on that project; the agent connects to the same project to join those rooms.

Neither file is committed (see `.gitignore`); don't paste real secrets into `.env.example`.

## 4. Run it

**Both halves together** (recommended for local dev):
```bash
pnpm run dev
```
This runs `next dev` and `uv run python src/agent.py dev` concurrently (via `concurrently`, labeled `web`/`agent` in the log output). `--kill-others-on-fail` means if one crashes, both stop.

**Each half on its own**, in separate terminals:
```bash
pnpm run dev:web        # Next.js only, http://localhost:3000
pnpm run dev:agent      # equivalent to: cd translator && uv run python src/agent.py dev
```

Running the agent on its own is useful when you're iterating on `translator/src/*.py` and don't want to restart the frontend.

## 5. Try it

1. Open <http://localhost:3000>.
2. Click **Create session** — this generates a random room id and takes you to the pre-flight screen.
3. Enter a name, pick a language, click **Join the call**. Leave your mic off for now.
4. Open the same session URL in a second browser (or an incognito window, or another device on the same network if you exposed the port) and join with a **different** language.
5. Unmute one side. Within a second or two you should hear translated audio on the other side, and see live captions if you open the captions sidebar.
6. If your browser blocked autoplay, a "Tap to enable translated audio" banner appears — click it once per tab.

Same-language pairs never touch Gemini — the router intentionally skips those, so testing with two tabs both set to the same language proves the LiveKit plumbing but not translation.

## 6. Test and lint

Frontend:
```bash
pnpm run lint
```

Agent (from `translator/`):
```bash
uv run pytest          # router unit tests (session-demand computation)
uv run ruff check      # lint
uv run ruff format     # format
```

## 7. Docker

Each half has its own `Dockerfile` for building/running standalone. If you want
both services (plus TLS) wired together in one command, skip ahead to
[Deploying → All-in-one with Docker Compose](#all-in-one-with-docker-compose--caddy) —
that's what `compose.yaml` at the repo root is for.

**Frontend, standalone:**
```bash
docker build -t live-translate-web .
docker run -p 8080:8080 \
  -e LIVEKIT_URL=wss://your-project.livekit.cloud \
  -e LIVEKIT_API_KEY=... \
  -e LIVEKIT_API_SECRET=... \
  live-translate-web
```

**Agent, standalone:**
```bash
cd translator
docker build -t live-translate-agent .
docker run \
  -e LIVEKIT_URL=wss://your-project.livekit.cloud \
  -e LIVEKIT_API_KEY=... \
  -e LIVEKIT_API_SECRET=... \
  -e GEMINI_API_KEY=... \
  live-translate-agent
```

The agent doesn't listen on a port — it's a LiveKit Agents worker that dials out to `LIVEKIT_URL` and waits for job dispatches, so no `-p` flag is needed.

## Deploying

**Agent → LiveKit Cloud Agents** (recommended — no server to manage):
```bash
cd translator
lk agent create --secrets-file .env.local .   # first time only, registers the agent + uploads secrets
lk agent deploy                               # every deploy after that
```
The agent's Dockerfile also runs on any container host if you'd rather self-host it (Cloud Run, ECS, Fly.io, etc.) — just set the four env vars above.

**Frontend → anywhere that runs Next.js.** No database, no filesystem state, one API route (`/api/token`) — it's about as stateless as a Next.js app gets.
- **Vercel:** push the repo, set `LIVEKIT_URL`/`LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET` as project env vars. No special config needed.
- **Container hosts** (Cloud Run, Fly.io, Render, etc.): use the included `Dockerfile`, which builds a Next.js standalone server and listens on `PORT` (default `8080`).

Whichever LiveKit project's credentials you put on the frontend, the agent needs to be deployed against that same project — otherwise the frontend dispatches an agent that never shows up because it's listening on a different project.

### All-in-one with Docker Compose + Caddy

The repo root also has `compose.yaml` and a `Caddyfile` — this is the reference
setup for running everything on one VM (what's actually behind this project's
live deployment): the frontend, the agent, and [Caddy](https://caddyfiles.com/)
as a reverse proxy that gets you HTTPS for free via automatic Let's Encrypt
certificates. Three services:

| Service | What it runs | Exposed |
|---|---|---|
| `web` | The frontend's `Dockerfile`, listening on `8080` | Only to `caddy`, via Docker's internal network (`expose`, not `ports`) |
| `translator` | The agent's `Dockerfile` | Nothing — it dials out to `LIVEKIT_URL`, same as always |
| `caddy` | `caddy:2-alpine`, reverse-proxying to `web:8080` | `80` and `443` (TCP + UDP for HTTP/3) |

Steps, on a host with Docker and Docker Compose installed and a domain's DNS
A/AAAA record already pointed at it:

1. Edit `Caddyfile` — replace `voice.vinodmaneti.com` with your own domain.
   Caddy will request and renew its TLS certificate for whatever domain is in
   there automatically; it needs ports 80 and 443 reachable from the internet
   to do the Let's Encrypt HTTP-01/TLS-ALPN challenges.
2. Create `.env.web` (same three vars as `.env.example`) and `.env.agent`
   (same four as `translator/.env.example`) in the repo root on the host —
   templates are at [`.env.web.example`](.env.web.example) and
   [`.env.agent.example`](.env.agent.example). These filenames are what
   `compose.yaml`'s `env_file:` directives expect; they're **not** the same
   files as local dev's `.env.local` / `translator/.env.local`, even though
   the contents are the same shape.
3. Build and start everything:
   ```bash
   docker compose up -d --build
   ```
4. Verify:
   ```bash
   docker compose ps                        # all three should be "running"
   curl -I https://your-domain              # expect HTTP/2 200
   docker compose logs --tail=50 web
   docker compose logs --tail=50 translator # watch for repeating errors in either
   ```
   Then open the site in a browser and hard-refresh (`Cmd+Shift+R` /
   `Ctrl+Shift+R`) to bypass any cached assets from a previous deploy.
5. Redeploying after a code change: `docker compose up -d --build` again.
   Compose only rebuilds/restarts a service whose build context actually
   changed — if you only touched frontend files, the `translator` container is
   left running as-is (an old "uptime" on `docker compose ps` for a service you
   didn't touch is expected, not a sign the redeploy failed).

This path deliberately keeps `.dockerignore` excluding `translator/` and `.env*`
from the `web` image's build context — see [SECURITY.md](SECURITY.md) for why
that matters here specifically.

## Troubleshooting

**"LiveKit credentials not configured" (500 from `/api/token`)**
`.env.local` is missing or incomplete. Check `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` are all set and restart `next dev` (env files are only read at process start).

**Agent logs `GEMINI_API_KEY is not set; refusing to start`**
`translator/.env.local` is missing `GEMINI_API_KEY`. The agent still joins the room's job queue but exits the entrypoint immediately without translating anything.

**Joined the call but never hear translated audio**
- Confirm the two participants picked genuinely different languages — same-language pairs are never routed to Gemini by design.
- Check the agent process's logs for `translation router ready for room=...` — if that never printed, the agent didn't get dispatched. Confirm `TRANSLATOR_AGENT_NAME` in `src/app/api/token/route.ts` matches `agent_name=` in `translator/src/agent.py` (both currently `gemini-translator`).
- If you deployed the agent to LiveKit Cloud, confirm it's actually deployed and running (`lk agent status` or the Cloud dashboard) and pointed at the same project as the frontend.
- Check for a stuck "Tap to enable translated audio" banner — browsers block autoplay until a user gesture.

**Agent won't start locally on Python 3.11+ / a `yarl` install error**
`translator/pyproject.toml` already pins `yarl<1.24` via `[tool.uv] constraint-dependencies` to work around a yanked wheel. If you're hitting this outside of `uv` (e.g. plain `pip`), apply the same constraint or use `uv sync` instead.

**Room fills up / "room is full"**
`MAX_PARTICIPANTS` is 8 by default (`src/app/api/token/route.ts` and `src/lib/config.ts`). Raise it in both places if you need more — see the Configuration table in [README.md](README.md#configuration).

**Testing on a phone or a second device**
`localhost:3000` only works from the machine running the dev server. Either deploy somewhere reachable, or tunnel it (e.g. `ngrok http 3000`) and open the tunnel URL on the second device — note this also exposes your local dev server to that tunnel URL, so don't leave it running unattended.

**Docker Compose: Caddy won't get a TLS certificate / `curl` hangs or times out**
Caddy's automatic HTTPS needs your domain's DNS already pointed at the host
*and* ports 80 and 443 open to the internet (check security groups / firewall
rules, not just `docker compose ps` showing `caddy` as running) — Let's
Encrypt's challenge traffic has to actually reach the container. Check
`docker compose logs caddy` for the specific ACME error if it's still failing
after DNS has propagated.

**Docker Compose: `web` container works but `GEMINI_API_KEY is not set`**
Confirm `.env.agent` (not `.env.web`) exists on the host next to `compose.yaml`
and has all four vars — `compose.yaml` maps each service to a specific
`env_file`, so a var in the wrong file silently doesn't reach that service.
