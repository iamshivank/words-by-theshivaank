# Deploying Words

| Piece | Host | Config in repo |
|---|---|---|
| Frontend (`frontend/`, Vite + React) | Vercel | `frontend/vercel.json` |
| API (`backend/`, Spring Boot, Java 25) | Railway (Docker) | `backend/Dockerfile` |
| Database | Neon (you already have it) | — |

Vercel forwards `/api/*`, `/uploads/*`, `/rss.xml`, `/sitemap.xml` and `/robots.txt` to Railway. The browser only
ever talks to the Vercel domain, which is what lets the `SameSite=Strict` session cookie work. Never point the
frontend straight at the Railway URL (leave `VITE_API_URL` unset).

Order matters: **Railway first** (Vercel needs its URL), **then Vercel**, **then tell Railway the Vercel URL**.

---

## 0. Push the code to GitHub

Both hosts build from GitHub. From the repo root:

```bash
git status            # make sure .env and SPEC.md are NOT listed (they are gitignored)
git add -A
git commit -m "Deploy setup"
git push origin main
```

## 1. Prepare the values you will paste

From your local `.env`:

- `SPRING_DATASOURCE_URL`: the Neon connection string. In the Neon console (Connect), switch **Connection
  pooling off** so the host has no `-pooler`, and copy `postgresql://user:pass@host/db?sslmode=require` as is.
- `OWNER_EMAIL`, `OWNER_PASSWORD_HASH`, `JWT_SECRET`: the same ones you use locally (or new ones).

Optional but recommended: in Neon, create a branch named `production` and use its connection string, so local
experiments never touch the live data.

> The first start runs every Flyway migration, including V6, which adds **sample essays and journal entries**.
> Delete them from the Desk after the first deploy if you don't want them public.

## 2. Backend on Railway

1. Go to <https://railway.com>, sign in with GitHub, **New Project → Deploy from GitHub repo** and pick
   `words-by-theshivaank`.
2. Open the new service → **Settings**:
   - **Source → Root Directory**: `/backend`. Railway then finds `backend/Dockerfile` and builds with it.
   - **Deploy → Healthcheck Path**: `/api/v1/auth/me` (always answers 200).
   - **Region**: pick one close to your Neon region (e.g. Singapore if Neon is `ap-southeast-1`).
3. **Variables** tab → add:

   | Name | Value |
   |---|---|
   | `SPRING_DATASOURCE_URL` | Neon direct connection string |
   | `OWNER_EMAIL` | your login email |
   | `OWNER_PASSWORD_HASH` | bcrypt hash (paste as is, `$` signs included) |
   | `JWT_SECRET` | 32+ random characters |
   | `APP_PUBLIC_URL` | `https://placeholder.vercel.app` for now; fixed in step 4 |

   `PORT` and `UPLOAD_DIR` are handled already (Railway sets `PORT`; the image sets `UPLOAD_DIR=/data/uploads`).
4. **Volume** (uploaded images live here): right-click the service on the canvas → **Attach Volume** →
   mount path `/data`. Without it, every deploy deletes uploaded images.
5. **Settings → Networking → Generate Domain**. You get something like
   `words-production-ab12.up.railway.app`. Copy it.
6. Wait for the deploy to go green, then open `https://<railway-domain>/api/v1/auth/me` in a browser. It should
   show `{"authenticated":false,...}`. If the deploy fails, the **Deploy Logs** print a boxed
   "Words cannot start" message naming the variable that is wrong.

## 3. Frontend on Vercel

1. Go to <https://vercel.com/new>, import the same GitHub repo.
2. **Root Directory**: click Edit and choose `frontend`. Framework preset: **Vite** (auto-detected).
   Build command `npm run build`, output `dist`: leave the defaults.
3. **Environment Variables** → add `BACKEND_URL` = `https://<railway-domain>` (with `https://`, no trailing
   slash). Do **not** add `VITE_API_URL`.
4. **Deploy**. Note the production URL, e.g. `https://words-by-theshivaank.vercel.app`.

## 4. Point the backend at the real site

Back in Railway → Variables, set `APP_PUBLIC_URL` to the Vercel production URL (e.g.
`https://words-by-theshivaank.vercel.app`). Railway redeploys by itself. This URL is used for CORS and for the
links inside `/rss.xml`, `/sitemap.xml` and `/robots.txt`.

## 5. Check it works

- `https://<vercel-url>/` loads the site, and reloading on a deep link like `/writing/...` doesn't 404.
- `https://<vercel-url>/api/v1/auth/me` returns JSON (the proxy works).
- Sign in at `/login`, reload the page, and confirm you are still signed in (the cookie works).
- Upload an image in the editor, then redeploy Railway, and confirm the image is still there (the volume works).
- `https://<vercel-url>/robots.txt` ends with `Sitemap: https://<vercel-url>/sitemap.xml`.

## 6. Custom domain (optional)

1. Vercel → Project → **Settings → Domains** → add `yourdomain.com` and follow the DNS instructions.
2. Railway → set `APP_PUBLIC_URL=https://yourdomain.com`.

The Railway domain stays private plumbing; nobody needs to see it.

## Day to day

- `git push origin main` redeploys both: Vercel rebuilds the frontend, Railway rebuilds the API image. New
  Flyway migrations run on the API's next start.
- Vercel builds a preview for every branch. Previews use the same `BACKEND_URL`, so **they talk to the
  production API and data**. Reading is fine; be careful signing in and editing from a preview.
- Locked out? Set `OWNER_RESET_FROM_ENV=true` on Railway for one deploy (resets the account to
  `OWNER_EMAIL`/`OWNER_PASSWORD_HASH` and signs out every device), then remove it.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Railway log: "configuration needs attention" | A required variable is missing or malformed; the message names it. |
| Railway log: Flyway / pooler error | `SPRING_DATASOURCE_URL` uses the `-pooler` host. Use the direct one. |
| Site loads but every API call 404s or returns HTML | `BACKEND_URL` is missing on Vercel, or has a trailing slash. Redeploy after fixing. |
| Login works but you're signed out on reload | The site is calling Railway directly; make sure `VITE_API_URL` is not set. |
| Saving returns 403 "Invalid CORS request" | `APP_PUBLIC_URL` on Railway doesn't match the URL in the browser bar. |
| Images vanish after a deploy | No volume at `/data` on Railway. |
| First request after a quiet period is slow | Neon scaled to zero and is waking up (a few seconds). Normal. |
