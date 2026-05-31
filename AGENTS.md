# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project structure
- The game is implemented as a **single-page, single-file app** in `index.html` (HTML, CSS, and JavaScript are all inline).
- The **dashboard** is in `dashboard.html`.
- **Backend** lives in `server/`: Express API + Telegram bot (telegraf) + MongoDB (mongoose).
- Runtime assets (sprites/atlas JSON) are under `assets/`.

## Development commands
- Install dependencies:
  - `npm install`
- Run the full server (API + game files + Telegram bot):
  - `npm start`
  - Opens on `http://localhost:3000`
- For Telegram bot to work, set `BOT_TOKEN` in `.env` (create from `.env.example`).
- For the database, set `MONGODB_URI` in `.env` (MongoDB Atlas connection string).
- Without a bot token, the Express server still serves the game and API.
- Without a MongoDB URI, the server starts but API calls fail.

## API Endpoints
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/health` | GET | No | Health check |
| `/api/auth/telegram` | POST | No | Register/login with Telegram user data |
| `/api/auth/me` | GET | Bearer JWT | Get current user profile |
| `/api/wallet/balance` | GET | Bearer JWT | Get SK/SKJ balances |
| `/api/wallet/transactions` | GET | Bearer JWT | Transaction history |
| `/api/game/bet` | POST | Bearer JWT | Deduct SK for a bet |
| `/api/game/win` | POST | Bearer JWT | Credit SK for a win |

## Telegram Bot Commands
- `/start` — Welcome message with Play + Dashboard buttons (WebApp)
- `/play` — Launch the game directly
- `/balance` — Check SK/SKJ balance
- `/help` — List commands

## Build, lint, and test status
- Build: no build script is defined in `package.json`.
- Lint: no lint script/config is present.
- Tests:
  - `npm test` currently runs a placeholder command and exits with an error.
  - No test framework or test files are configured, so single-test execution is not applicable yet.

## High-level architecture
- Main game loop:
  - `loop(ts)` drives frame timing, then calls `update(ts)` and `draw()`, and re-schedules with `requestAnimationFrame(loop)`.
- Core mutable state is held in top-level objects/arrays in `index.html`:
  - Player/canvas state (`player`, `mouseX`, `mouseY`)
  - Combat entities (`bullets`, `enemies`, missile and FX arrays)
  - Economy/probability systems (`rtp`, `critState`, `missileState`)
  - Mode toggles (`autoMode`, `nukeMode`, `dragonMode`)

## Gameplay systems (big picture)
- Input/UI layer:
  - Canvas mouse handlers and DOM buttons (`AUTO`, missile, dragon) update mode flags and fire behavior.
- Spawn/scheduling layer:
  - Multiple `setInterval` and timeout schedulers create regular enemies, elite variants, and timed specials/boss passes.
- Combat resolution layer:
  - Hit/miss/block/crit and payout flow is centralized around `rtp`, `rollBlock`, `critState`, and per-weapon fire functions.
  - `killEnemy(...)` is the key consolidation point for payouts and special on-death triggers (D1 thunder, D2 explosions, Elite T2 missiles, D3 sequence, boss transitions).
- Rendering/FX layer:
  - `draw()` renders entities and heavy visual effects (lightning, explosions, smoke, beam/glow effects) directly via Canvas 2D.

## Git workflow
- **Commit and push after every code change.** Every time I finish writing code (bug fix, feature, refactor, etc.), I must immediately:
  1. `git add -A`
  2. `git commit -m "<descriptive message>"`
  3. `git push`
- This applies to all code changes, no matter how small.

## Important implementation notes
- The codebase is highly stateful; many systems mutate shared arrays/objects directly from timers and per-frame updates.
- Several mechanics are coupled through shared global flags (for example attack locking during D3 sequence and boss state transitions).
- `assets/lightning ball.json` is fetched at runtime; opening the file directly from disk can break this path in many browsers, so use a local HTTP server during development.
