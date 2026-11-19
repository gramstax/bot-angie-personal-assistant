# bot-angie-personal-assistant

A production-ready Telegram bot built with [Gramstax](https://github.com/gramstax/gramstax): declarative pages, template-driven messages, and end-to-end tested flows.

Angie is a personal AI assistant on Telegram. Send her any text or voice note — she answers with GPT-4o-mini, checks your unread emails, calendar events, tasks, and contacts, and remembers the last 10 turns of your conversation.

The generated project is Bun-only: `gramstax start`, the test suite, and the build all run on Bun.

![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=flat&logo=bun&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6.svg?style=flat&logo=typescript&logoColor=white)
![Telegram](https://img.shields.io/badge/Telegram-26A5E4.svg?style=flat&logo=telegram&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.svg)

## Features

- 🧩 **Page-based routing**: each screen is a class with `show`/`process` steps, inline keyboards, and session state
- 🎨 **Template engine**: rich messages, `lang` variants, and multi-language keyboards (English default, Indonesian via `/language`)
- 🎙️ **Voice notes**: Whisper transcription runs in a `@gramstax/worker-thread` pool (2 workers, round-robin)
- 💾 **Persistent storage**: `@gramstax/lmdb` repositories for users, conversation memory, tasks, and contacts
- 🤖 **AI agent**: GPT-4o-mini with function calling — Gmail, Google Calendar, tasks, contacts
- ✅ **E2E tested**: in-process harness asserts every Telegram API call (`e2e/` mirrors `src/pages/`)
- 🛡️ **Guards, throttling & metrics**: AllowList route guard, rate limits, and a status server out of the box

## Flow

```mermaid
flowchart TD
    TG[Telegram update<br/>text or voice note] --> HOOK[BotCore.hookBeforeRoute<br/>register user + AllowList]
    HOOK -->|denied| DENY[Reply: only allowed users]
    HOOK -->|allowed| ROUTE{Message type?}
    ROUTE -->|text| CHAT[AngiePage.handleFreeText]
    ROUTE -->|voice| VOICE[AngiePage.handleFreeVoice<br/>download voice file]
    VOICE --> POOL[TranscribePool<br/>@gramstax/worker-thread, 2 workers<br/>Whisper transcription]
    POOL --> CHAT
    CHAT --> MEM_READ[Read memory<br/>LMDB, last 10 turns]
    MEM_READ --> AGENT[AngieService.chat<br/>GPT-4o-mini + system prompt<br/>English or Indonesian]
    AGENT -->|needs data| TOOLS{Tool call}
    TOOLS --> EMAIL[Get Email<br/>Gmail API, unread, no promotions]
    TOOLS --> CAL[Get Calendar<br/>Google Calendar API, by date]
    TOOLS --> TASK[Get Tasks<br/>LMDB tasks]
    TOOLS --> CONTACT[Get Contacts<br/>LMDB contacts]
    EMAIL --> AGENT
    CAL --> AGENT
    TASK --> AGENT
    CONTACT --> AGENT
    AGENT --> MEM_WRITE[Save both turns<br/>LMDB memory, cap 10]
    MEM_WRITE --> REPLY[Reply in Telegram<br/>Markdown, user language]
```

## Quick Start

### 1. Install dependencies

```bash
bun install
```

### 2. Configure your environment

Edit `.env` (copy `.env.example` first) and set your bot token; get one from [@BotFather](https://t.me/BotFather). The CLI loads `.env` from the project root automatically; there is no `--env-file` flag to type and no `bun --bun` prefix.

```bash
BOT_TOKEN="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
OPENAI_API_KEY="sk-..."
```

### 3. Run in development (watch mode)

```bash
bun run dev
```

### 4. Run in production

```bash
bun run start
```

Open Telegram, find your bot, and send `/start`.

## Commands

| Command | Description |
| :------ | :---------- |
| `/start` | Introduction and main menu (Tasks, Contacts, Email, Schedule, Language, Help) |
| `/help` | Full help |
| `/language` | Switch language — English / Indonesia (stored per user in LMDB) |
| `/tugas` | List your tasks |
| `/tambahtugas <text>` | Add a new task |
| `/selesai <id>` | Mark a task done |
| `/kontak [name]` | Find a contact |
| `/tambahkontak <name> \| <email> \| <phone>` | Add a contact |
| `/email` | Today's unread emails (not promotions) |
| `/jadwal [date]` | Events for that day (e.g. `/jadwal tomorrow`, `/jadwal 2026-12-25`) |
| `/lupakan` | Erase Angie's memory of this chat |

Any other text — or a voice note — goes straight to Angie. She remembers the last 10 messages of your chat.

## Scripts

| Script | Description |
| :----- | :---------- |
| `dev` | Start with file watching (`gramstax start --watch`) |
| `start` | Start in production mode (`gramstax start`) |
| `build:gramstax` | Freeze pages into `.gramstax/` |
| `typecheck` | Type-check with `tsc --noEmit` |
| `test` | Run unit tests in `test/` |
| `test:e2e` | Run end-to-end tests in `e2e/` |
| `test:e2e:check` | Run the mirror check + coverage ledger audit |
| `test:all` | Run the e2e checks, then unit + e2e tests |

## Project Structure

```
├── AGENTS.md          # agent instructions for this app (incl. the strict recreate rules)
├── gramstax.config.ts # Bot composition (token env name, deploy, caches): `gramstax start` boots from this file, no `src/index.ts`
├── references/        # original workflow source (JSON + README) — reference only, never read at runtime
├── src/
│   ├── base/          # Shared base classes (PageBase, GuardBase)
│   ├── blocks/        # Reusable keyboard block builders
│   ├── core/          # Bot entry (BotCore) and context (CtxCore)
│   ├── db/            # LMDB schemas + repositories
│   ├── helpers/       # Domain helpers (logging)
│   ├── lib/           # AngieService, OpenAI client, Google adapter, dates, i18n, config, transcribe pool
│   ├── pages/         # Bot screens: one file (or folder) per route
│   ├── types/         # Shared types grouped by domain: user, angie, transcribe, page
│   ├── utils/         # Pure generic utilities
│   └── workers/       # Transcription worker (Whisper)
├── e2e/               # End-to-end tests (mirrors src/pages/) + COVERAGE.md ledger
├── test/              # Unit tests for pure logic
├── scripts/           # e2e mirror check + handler/ledger audit + structure generator
└── data/              # LMDB data files (created at runtime)
```

Keep shared interfaces in `src/types/<domain>.ts` rather than declaring them inline in a page or service.

New page? Create `src/pages/my-page.ts`, `e2e/my-page.test.ts`, and a row for every handler in `e2e/COVERAGE.md`. The mirror is enforced by `scripts/check-e2e-mirror.ts`; the handler/test ledger is enforced by `scripts/check-e2e-handlers.ts`.

## Configuration

All settings live in `.env` and are wired through `gramstax.config.ts`. `gramstax start` and `gramstax build` load project-root `.env*` files automatically, with shell variables taking precedence:

| Variable | Required | Description |
| :------- | :------- | :---------- |
| `BOT_TOKEN` | Yes | Bot token from [@BotFather](https://t.me/BotFather) |
| `BOT_DEPLOY` | Yes | `polling` (dev) · `webhook` · `serverless` (details in `optionsDeploy`) |
| `CACHE_SESSION_STORE` | No | `memory` (single instance) or `redis:<url>` (multi-instance) |
| `DB_PATH` | No | LMDB data path (default `./data`) |
| `OPENAI_API_KEY` | No | OpenAI key for GPT-4o-mini answers + Whisper transcription. Empty = mock mode (simple answers from LMDB data) |
| `GOOGLE_ACCESS_TOKEN` | No | Google OAuth2 access token for Gmail + Google Calendar (scopes `gmail.readonly` + `calendar.readonly`). Empty = the email/calendar tools honestly answer "not connected" — no fake data |
| `ANGIE_ALLOWED_IDS` | No | AllowList: Telegram IDs allowed to use the bot, comma-separated. Empty = everyone allowed (dev mode) |
| `ANGIE_MOCK_AI` | No | `1` forces mock answers even when `OPENAI_API_KEY` is set (used by e2e) |

## Language

The bot is bilingual — English by default, Indonesian per user.

- **Static template content** (welcome, help, keyboards, language picker) uses Gramstax's built-in multi-lang object: `<g-message>` / `<g-keyboard>` blocks with a `lang="id"` variant plus the English default, selected by the user's `language_code` (see the `template-i18n` rules in `gramstax-best-practices`).
- **Dynamic / logic strings** (tool results, runtime errors, Angie's mock replies) go through the per-user language dictionary in `src/lib/i18n.ts`, resolved from the stored preference.
- The preference is stored per user in LMDB (`UserSchema.botLang`, appended last in the schema — LMDB encoding is positional) and set with `/language`. It is applied in `hookBeforeRoute` by overriding `from.language_code`. A non-string stored value falls back to English and never crashes.

## Testing

```bash
bun run test            # fast unit tests for helpers, stores, validation
bun run test:e2e        # full user journeys: /start → callbacks → free text
bun run test:e2e:check  # mirror check + every handler/test accounted for in e2e/COVERAGE.md
bun run test:all        # the checks, then everything, as CI runs it
```

E2E tests drive the real bot in-process (`deploy: test`) and assert every Telegram API call: message text, keyboards, media, edits, and call order. `e2e/COVERAGE.md` is the ledger: one row per handler, state, or hook-driven page, pointing at the test that proves it. The audit fails when a page handler or test file has no row.

## Deployment

- **Development**: `BOT_DEPLOY=polling`, then `bun run dev`.
- **Production (webhook)**: set `BOT_DEPLOY=webhook` and put your public URL in `optionsDeploy` in `gramstax.config.ts`, then run `bun run start` behind a process manager.
- **Serverless**: set `deploy` to `serverless` with `optionsDeploy` (`adapter` + `url`), run `bun run build:gramstax`, and deploy `.gramstax/server/` per the Gramstax serverless guide.

## Honest limitations — read before going live

- **The live path (OpenAI + Google) is untested** — no `BOT_TOKEN`, `OPENAI_API_KEY`, or Google OAuth has been provided yet. What tests prove is: the Gramstax 6.1.0 scaffold, LMDB (user/memory/task/contact), the 2-thread worker pool (round-robin, mock transcription), mock AI + tool routing, and every command/page via the e2e harness. Do not claim live works before tokens are set and tested with a real bot.
- **The worker pool must launch sequentially, not with `Promise.all`**: parallel launches race on the export state — a probe showed only 1 thread alive; sequential launches give 2 threads (see `src/lib/transcribe-pool.ts`).
- **A page file name is its route/command**: `src/pages/tasks.ts` would produce `/tasks`, not `/tugas` — that is why the task file is named `tugas.ts`.
- **Rendering from a message uses `sendMessage`**, not `sendRichMessage`, in Gramstax 6.1.0 — the e2e tests follow this.
- **A Google access token can expire**: the adapter uses the Bearer token from env as-is; there is no auto-refresh yet (the refresh token is optional and not implemented — set a fresh access token when it expires).
- A live voice note is downloaded via `api.telegram.org/file/bot<token>/...` and sent to Whisper as OGG; the Telegram Bot API caps files at 20 MB.
- Memory window: the last 10 turns per user; `/lupakan` clears it.
- AllowList: when `ANGIE_ALLOWED_IDS` is set, users outside the list get a rejection message and their update is rejected in `hookBeforeRoute`.

## Tech Stack

- [Gramstax](https://github.com/gramstax/gramstax): declarative Telegram bot framework with template-driven pages
- [@gramstax/lmdb](https://github.com/gramstax/gramstax): LMDB-backed storage (users, memory, tasks, contacts)
- [@gramstax/worker-thread](https://github.com/gramstax/gramstax): worker pool for voice transcription
- [Bun](https://bun.sh): runtime, test runner, and bundler
- TypeScript 7 in strict mode

## Learn More

- [Gramstax Documentation](https://gramstax.mintlify.site)
- [Gramstax Repository](https://github.com/gramstax/gramstax)
- [Telegram Bot API](https://core.telegram.org/bots/api)

## License

MIT
