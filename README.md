# Words · By theshivaank

A personal writing platform: a quiet public publication for essays, and, when signed in, a private
Desk for journaling, decisions, streaks and goals.

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
| `SPRING_DATASOURCE_URL` | Neon connection in JDBC form: `jdbc:postgresql://<host>/<db>?sslmode=require`. Use the **direct** host (no `-pooler`). |
| `SPRING_DATASOURCE_USERNAME` / `_PASSWORD` | Neon role and password (taken out of Neon's `postgresql://user:pass@...` string). |
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
```

Or separately:

```bash
cd backend && ./mvnw spring-boot:run      # Windows: mvnw spring-boot:run
cd frontend && npm run dev
```

In development Vite proxies `/api` to the backend, so the session cookie is same-origin.
Flyway migrates the database on startup; Hibernate only validates (`ddl-auto=validate`).

Useful URLs: `http://localhost:5173` (site), `/login`, `/desk`, `/design` (style guide, dev only),
`http://localhost:8080/swagger-ui.html` (API docs).

## API types

Frontend types are generated from the backend's OpenAPI spec, so the two never drift:

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
  design/     tokens.css, index.css, theme store, ThemeProvider, primitives
  features/   home, auth, desk, styleguide (more per phase)
  api/        fetch client, generated schema.d.ts, TanStack Query hooks
  lib/        small utilities
backend/src/main/java/com/theshivaank/words
  auth/       login, JWT cookie, rate limiting, security config, hash utility
  settings/   site_settings (single jsonb row)
  config/     .env loading, startup checks, typed app properties, OpenAPI
  common/     problem-details error handling
backend/src/main/resources/db/migration   Flyway SQL
```

## Security model

- One owner, configured by environment. Password checked with bcrypt; the login endpoint is rate
  limited per client address (5 failures per 15 minutes).
- The session is a signed JWT in an `httpOnly; Secure; SameSite=Strict` cookie. Because browsers never
  send it on cross-site requests, and CORS is locked to `APP_PUBLIC_URL`, no CSRF token is needed.
- Every error is RFC 9457 problem JSON.
- Logging out clears the cookie; the token itself expires after 14 days.
