# Words · By theshivaank

A personal writing platform: a quiet public publication for essays, and, when signed in, a private
Desk for journaling, decisions, streaks and goals.

## What is in it

**Public (anyone):** a landing page with drifting contour lines (or your photograph), a rotating quote and
an issue number; **In flight**, where your latest and featured essays drift across the page like paper
slips, each with its highlight label hanging from a thread; a typographic index with hover previews;
`/writing` (tag, year and full-text search), the reading page (drop cap, pull quotes, margin contents,
reading progress line, previous/next, copy link), `/archive` on a timeline, `/about`, RSS and a sitemap.

**Private (you):** the Desk (greeting, daily prompt, streak, year heatmap, week chart with mood, goals,
decisions due, recent entries); Journal, Essays and Notes lists; the editor (slash menu, markdown
shortcuts, image paste/drop/upload, focus mode, typewriter scrolling, 10/15/25 minute sprints, a quote on
the blank page, autosave with an IndexedDB backup and restore, writing sessions, **dictation**, and a
details panel for visibility, address, tags, cover, excerpt, highlight label, featuring, mood, energy,
gratitude and lessons); the decision journal with reviews and a calibration chart; weekly and monthly
reviews saved as journal entries; goals; the quotes and prompts library; Ctrl/Cmd + K command palette.

**Admin panel (`/desk/admin`):** Overview (counts, most read, system), Content (every entry, filters, bulk
publish / unpublish / public / private / feature / delete), Preferences (on/off switches for every
feature, landing section order, theme, accent, reading font and size, grain), Site (name, tagline, about,
links, hero photo, daily word goal), Account (change password or email, sign out other devices),
Data (export everything as Markdown + JSON, import Markdown or a zip, uploads library).

**Privacy:** journals are private by default and only published `public` essays are ever served to
visitors, listed, searched, or put in the feed (covered by `EntryControllerTest`).

- **Frontend** (`/frontend`): React 19, TypeScript (strict), Vite, Tailwind CSS 4 driven by CSS
  variables, `motion`, TanStack Query, Zustand, React Router.
- **Backend** (`/backend`): Java 25, Spring Boot 4.2, Spring Security, Spring Data JPA, Flyway,
  springdoc-openapi. Database: Neon (serverless Postgres).

## Prerequisites

- Node 22+ (`node -v`)
- JDK 25. On Windows: `winget install EclipseAdoptium.Temurin.25.JDK`, then open a new terminal.
  Maven itself is not needed; the wrapper (`mvnw`) downloads it.

## Setup

```bash
cp .env.example .env              # then fill it in (see below)
cd frontend && npm install && cd ..
```

### Environment (`.env` in the repo root)

| Variable | What it is |
| --- | --- |
| `SPRING_DATASOURCE_URL` | Neon's connection string pasted as-is (`postgresql://user:pass@host/db?sslmode=require`), or JDBC form. Use the **direct** host (no `-pooler`). |
| `SPRING_DATASOURCE_USERNAME` / `_PASSWORD` | Only needed with the JDBC form; otherwise read from the URL. |
| `SPRING_FLYWAY_URL` | Optional. Only if the app URL uses the pooler: the direct JDBC URL for migrations. |
| `OWNER_EMAIL` | The one account that can sign in. |
| `OWNER_PASSWORD_HASH` | bcrypt hash of your password. Generate it with `cd backend && ./mvnw -q compile exec:java` (prompts without echo). |
| `JWT_SECRET` | 32+ random characters: `openssl rand -base64 48`. |
| `APP_PUBLIC_URL` | Frontend origin, used for CORS. `http://localhost:5173` in development. |
| `UPLOAD_DIR` | Where uploaded images are stored. |
| `COOKIE_SECURE` | Optional, default `true`. Chrome and Firefox accept Secure cookies on `http://localhost`; set `false` only if Safari refuses to keep you signed in locally. |

The backend reads `.env` itself (real environment variables win). If something is missing or
malformed, it stops with a short list of what to fix instead of a stack trace.

## Run

```bash
npm run dev                       # from the repo root: API on :8080 and web on :5173
npm run dev:local                 # same, but on a throwaway local Postgres instead of Neon (API on :8081)
```

`dev:local` never touches Neon: it starts real Postgres binaries in `backend/target/local-db` with the
sample content, and you sign in with `local@words.test` / `local-password-123`. Use it to try changes
safely; `mvnw clean` wipes it.

Or separately:

```bash
cd backend && ./mvnw spring-boot:run      # Windows: mvnw spring-boot:run
cd frontend && npm run dev
```

In development Vite proxies `/api`, `/uploads`, `/rss.xml` and `/sitemap.xml` to the backend, so the session
cookie is same-origin (and a dev server that moved to another port still works).
Flyway migrates the database on startup; Hibernate only validates (`ddl-auto=validate`).

Useful URLs: `http://localhost:5173` (site), `/login`, `/desk`, `/design` (style guide, dev only),
`http://localhost:8080/swagger-ui.html` (API docs).

## API types

Auth types are generated from the backend's OpenAPI spec; the rest live in `frontend/src/api/types.ts`,
written to mirror the Java DTO records (the generator marks every record field optional, which would
weaken strict typing). Regenerate the schema with:

```bash
cd frontend
npm run api:types           # from a running backend
npm run api:types:offline   # from backend/target/openapi.json, written by the backend test suite
```

## Tests and checks

```bash
cd backend && ./mvnw test                         # JUnit; boots the app against a real embedded Postgres
cd frontend && npm test && npm run lint && npm run typecheck
```

Backend integration tests use `zonky embedded-postgres` (real Postgres 17 binaries, no Docker), which
runs every Flyway migration and Hibernate's schema validation exactly as against Neon.

## Neon notes

- The Hikari pool is capped at 5 connections, may go fully idle (so Neon can scale to zero), and waits
  up to 30s for a connection because the first one after a cold start is slow.
- Run migrations against the direct host; the pooler (PgBouncer, transaction mode) does not support
  everything Flyway needs.

## Project layout

```
frontend/src
  design/     tokens.css, index.css, content.css, theme, primitives (ink-pen cursor, switches, toasts...)
  features/   landing, reading, public, desk, editor, decisions, reviews, goals, quotes, admin, search, auth
  api/        fetch client, types, TanStack Query hooks (entries, desk, admin, settings, auth)
  lib/        formatting, hooks, utilities
backend/src/main/java/com/theshivaank/words
  auth/       login, JWT cookie (with token version), rate limiting, security config, hash utility
  account/    owner account, password/email change, sign out everywhere
  entry/      essays, journal, notes, tags, public endpoints, search
  stats/      writing sessions, daily rollups, streaks, heatmap, monthly numbers
  quote/ prompt/ decision/ goal/   the Desk's libraries and journals
  media/      image uploads   feed/  RSS and sitemap   portability/  export and import
  admin/      admin overview   settings/  site_settings (single jsonb row)
  config/     .env loading, startup checks, typed app properties, OpenAPI, uploads
  common/     problem-details errors, HTML sanitizing, slugs, paging
backend/src/main/resources/db/migration   Flyway SQL
```

## Speech to text

The editor's microphone button (or Ctrl + Shift + D) uses the browser's own speech recognition: free,
no key, works in Chrome, Edge and Safari. Say "full stop", "comma", "question mark" or "new paragraph".
It can be switched off in Preferences. For better accuracy, privacy or voice notes, see the options
(Whisper, Groq, Deepgram, on-device) in `docs/ideas/IDEAS.md`.

## Brainstorming agent

`.claude/agents/product-strategist.md` is a Claude Code agent that keeps a prioritized roadmap in
`docs/ideas/IDEAS.md` (features, launch checklist, AI and speech-to-text plan, monetization). Ask Claude
Code to "use the product-strategist agent" with a question, e.g. "what should I build next for retention?".

## Security model

- One owner, seeded from the environment on first start, then stored in `owner_account` so the admin panel
  can change the email or password. Password checked with bcrypt; login and password checks are rate
  limited per client address (5 failures per 15 minutes). `OWNER_RESET_FROM_ENV=true` for one restart
  resets the account to `.env`.
- Every session token carries the account's token version; changing the password or "sign out other
  devices" bumps it, which revokes every older token immediately.
- Editor HTML is sanitized on the server (jsoup safelist) before it is stored; uploads are typed by their
  first bytes, never by name, and stored under random names.
- The session is a signed JWT in an `httpOnly; Secure; SameSite=Strict` cookie. Because browsers never
  send it on cross-site requests, and CORS is locked to `APP_PUBLIC_URL`, no CSRF token is needed.
- Every error is RFC 9457 problem JSON.
- Logging out clears the cookie; the token itself expires after 14 days.

## Known gaps before a public launch

- Social previews: the site is a client-rendered SPA, so link previews (Open Graph) need server-rendered
  meta tags for `/writing/:slug`. Meta tags are set in the browser, which search engines read but most
  social crawlers do not.
- Uploads live on the server's disk (`UPLOAD_DIR`); most hosts wipe it on deploy. Move to object storage
  before deploying.
- No footnotes block in the editor yet.
See `docs/ideas/IDEAS.md` for the full launch checklist.
