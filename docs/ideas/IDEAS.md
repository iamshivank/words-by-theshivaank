# Words, by theshivaank: ideas and roadmap

Running backlog kept by the product strategist. It covers what to build next, what blocks a public
launch, and how to add AI speech to text. Scores use **ICE** (Impact, Confidence, Ease, 1 to 10 each;
the last number is the average). Read the dated changelog at the bottom to see what changed.

**Where things stand (2026-11-24).** Phase 1 (foundation) is on disk: tokens, themes, primitives, owner
auth (bcrypt + JWT cookie + in-memory login rate limiter), `site_settings`, and the full V1 schema. That
schema already covers entries, tags, sessions, daily stats, quotes, prompts, decisions, goals and media.
**Being built in parallel, so not proposed here:** the public blog and landing page with flying
highlighted posts, journal/notes, the TipTap editor with focus mode and Web Speech dictation,
streaks/heatmap/goals, the decision journal, weekly and monthly reviews, the quotes library, the command
palette, `/desk/admin` (change password, sign out everywhere, feature toggles), Markdown export/import,
and RSS/sitemap. The ideas below improve or extend those features; none of them repeat one.

---

## 1. Top 5 next moves (this week)

| # | Move | ICE | Smallest shippable slice |
|---|---|---|---|
| 1 | **Server-side meta and OG for public pages** | 9/8/7 = 8.0 | In Spring, serve the built `index.html` for `/writing/:slug` and `/` with the `<title>`, description, canonical, `og:*` and `twitter:*` tags filled in from the entry. Also add JSON-LD `Article`. No SSR framework needed. |
| 2 | **Owner credentials in the database, plus session versioning** | 9/9/6 = 8.0 | Migration `owner_account (email, password_hash, token_version, totp_secret null)`, seeded from env on first boot. The JWT carries `ver`, and the filter rejects tokens whose `ver` is stale. This makes "change password" and "sign out everywhere" in `/desk/admin` actually work instead of fighting `OWNER_PASSWORD_HASH` in env. |
| 3 | **Voice note v1: record, transcribe, clean up** | 8/8/7 = 7.7 | A mic button on a journal entry records with `MediaRecorder` (webm/opus) and posts to `POST /api/v1/transcribe`. The backend calls Groq `whisper-large-v3-turbo`, then Claude Haiku 5.5 cleans up punctuation and paragraphs. The result is inserted at the cursor. Raw audio is not stored. Details in section 3. |
| 4 | **Media off local disk and an off-site backup** | 9/8/6 = 7.7 | Move `UPLOAD_DIR` behind a `MediaStore` interface with an S3-compatible implementation (Cloudflare R2, or Neon Object Storage if you stay all-Neon). Run a nightly job that writes the existing Markdown export zip into the same bucket and keeps 30 copies. |
| 5 | **Error monitoring and privacy-friendly analytics** | 7/9/8 = 8.0 | Add Sentry to frontend and backend, with PII scrubbing and no entry bodies in breadcrumbs. Add Plausible or Umami on public routes only, never on `/desk`. Add an uptime check on a `/healthz` that does not touch the DB, so Neon can still scale to zero. |

**Why now.** Without #1, every essay shared on X, LinkedIn or WhatsApp shows a blank card. #2 fixes the
admin panel that is being built right now. #3 answers the speech-to-text question for about $1 a month.
#4 matters because PaaS file systems are wiped on every deploy. #5: you cannot ship what you cannot see
failing.

---

## 2. Launch readiness checklist

Legend: **done** = seen in code. **building** = in the parallel session. **todo** = not started.
**?** = could not tell from the code.

### Ship-blockers

| Item | Status | Notes |
|---|---|---|
| Owner auth: bcrypt, httpOnly SameSite=Strict JWT cookie, login rate limit | done | The limiter is in memory and per address. If the app runs behind a proxy, trust `X-Forwarded-For` only from that proxy, or every visitor shares one bucket. |
| Change password and sign out everywhere | building | They need DB-stored credentials and a token version (Top 5 #2). With the current setup a JWT stays valid for its full TTL, even after "sign out everywhere". |
| 2FA (TOTP) for the owner | todo | The site holds a private journal, so one leaked password would expose everything. Use a TOTP code plus 10 recovery codes. ICE 8/8/6. |
| Security headers | ? | CSP (no inline scripts; TipTap output already sanitized), `Strict-Transport-Security`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: microphone=(self)`. |
| Server-side HTML sanitization of rendered content | building (spec 7) | Verify the sanitizer allowlist covers footnotes and code blocks, and that it strips `on*` attributes and `javascript:` URLs. |
| SEO and OG meta for public pages | todo | Top 5 #1. Today the frontend is a client-only Vite SPA. |
| OG images | todo | Spec 5.2. Generate them on the server: a Java2D or SVG template in the site style, cached as media. |
| Sitemap, RSS, `robots.txt` (disallow `/desk`, `/login`, `/design`) | building / todo | `/design` must be unreachable in production. |
| Media storage that survives deploys | todo | Top 5 #4. |
| Backups | partial | Neon point-in-time restore covers the DB within your plan's window. Add the nightly export zip off-site (Top 5 #4) and test one restore before launch. |
| Error monitoring and uptime | todo | Top 5 #5. |
| Legal pages: Privacy, Terms, Imprint/Contact | todo | The privacy page must name any third party that receives data: analytics, the email provider, and the STT/LLM vendors if voice is used. Keep it to one short page in the site voice. |
| Rate limits beyond login | todo | Cap `/transcribe`, uploads, and future public endpoints (subscribe, reactions). Bucket4j or a simple token bucket per owner and per IP. |
| Production hosting decision | todo | See "Operations" in section 4. Keep the API and the web app on the same site (for example `words.example` and `api.words.example`), or SameSite=Strict breaks. |
| 404/500 pages, offline-safe editor | building | The spec already calls for an IndexedDB draft backup. Test it with network off. |

### Nice-to-have before launch

| Item | ICE |
|---|---|
| Lighthouse 90+ on `/` and `/writing/:slug` (AVIF hero, preloaded fonts, lazy routes) | 7/8/7 = 7.3 |
| Accessibility pass: keyboard-only run through landing, essay, editor; contrast in both themes | 7/9/7 = 7.7 |
| `prefers-reduced-motion` check on the flying highlighted posts | 6/9/9 = 8.0 |
| Custom domain with apex redirect, `www` handled, HSTS preload later | 6/9/8 = 7.7 |
| A "colophon" page (fonts, stack, how it is built): cheap credibility with technical readers | 5/8/9 = 7.3 |

---

## 3. AI and speech-to-text plan

### 3.1 Options (prices checked 2026-11-24; confirm before budgeting)

| Option | Cost per audio hour | Live/streaming | Punctuation and quality | Privacy | Fit for Words |
|---|---|---|---|---|---|
| **Browser Web Speech API** (already wired in) | Free | Yes, interim results | OK, weak punctuation, no paragraphs | Chrome sends audio to Google unless on-device mode is used. `processLocally` (experimental) forces on-device where supported; Edge 139+ supports it [1] | Keep it as the zero-cost live mode. Chrome, Edge and Safari only; Firefox has no recognition |
| **OpenAI `gpt-transcribe`** | $0.27 ($0.0045/min) [2] | Yes (streaming and realtime transcription sessions) | Very good; supports keyword hints and context prompts | API data is not used for training by default; check retention settings | Best quality-per-dollar from a major vendor. Good for "record then transcribe" |
| OpenAI `gpt-4o-transcribe` / `-mini-transcribe` | about $0.36 / about $0.18 (token-billed; per-minute figures are third-party estimates) [3] | Yes | Very good / good | Same as above | Superseded by `gpt-transcribe` for this use |
| **Groq `whisper-large-v3-turbo`** | **$0.04** (10 s minimum per request) [4] | No (file upload, but very fast) | Good. Whisper punctuation; needs cleanup for paragraphs | Third-party cloud; check retention | **Cheapest by far.** Ideal for voice notes of 30 s to 20 min |
| **Deepgram Nova-3** | Streaming about $0.29 promotional / $0.46 regular; pre-recorded about $0.26 [5] | Yes, low latency over WebSocket | Very good; smart formatting | Check the data-use and model-improvement terms | Best if you want polished live dictation better than Web Speech |
| **AssemblyAI** | Universal-Streaming $0.15; Universal-3.6 Pro Realtime $0.45 [6] | Yes | Very good on Pro | Check retention settings | Good streaming alternative; generous free hours |
| **On-device Whisper / Moonshine** (transformers.js on WebGPU, WASM fallback) | Free | Near-live with Moonshine; chunked with Whisper | Good (whisper-base/small); Moonshine is tuned for live use [7] | **Audio never leaves the device** | "Private journaling mode." Downloads about 40 to 250 MB of model once. Chrome/Edge WebGPU; slow on low-end phones |

For scale: 20 minutes of dictation a day is 10 hours a month. That costs **$0.40/month on Groq**,
about $2.70 on `gpt-transcribe`, and about $3 to $5 on Deepgram streaming. LLM cleanup with
**Claude Haiku 5.5** ($0.10 in / $0.50 out per million tokens) costs less than a cent per hour of
speech. For single-owner use, cost does not matter. For a SaaS tier, it shapes pricing (section 5).

### 3.2 Recommendation

1. **Live typing-by-voice:** keep the Web Speech API. When the browser supports `processLocally`, offer an
   "on-device only" switch in Preferences, and show a one-line notice the first time it is used
   ("Your browser's speech service hears this audio").
2. **Voice notes and voice journaling (the real win):** record locally, then send to
   `POST /api/v1/transcribe` on Spring. Use **Groq `whisper-large-v3-turbo`** by default and fall back
   to **OpenAI `gpt-transcribe`**, behind a `TranscriptionProvider` interface chosen by config. Then make
   one LLM pass to clean it up.
3. **Private mode later:** on-device Whisper/Moonshine for entries marked private. This makes a
   credible "your journal never leaves your laptop" claim, which matters if Words becomes a product.

### 3.3 How it plugs into the Spring backend

- `POST /api/v1/transcribe` (owner only, multipart, max about 25 MB or 30 min). Validate the MIME type
  (`audio/webm`, `audio/mp4` for Safari, `audio/ogg`). Stream the bytes straight to the provider with no
  temp file, and return `{ text, cleaned, durationSec, provider }`. Rate-limit it (section 2).
- `POST /api/v1/transcribe/cleanup` (or a flag on the call above): send the transcript to Claude Haiku
  5.5. The system prompt says: "Fix punctuation, split into paragraphs, remove filler words, keep the
  speaker's words and voice; never add content." Keep the original text so "show raw" is one click.
- For live streaming beyond Web Speech, the browser should open a WebSocket **directly to the vendor**
  using a short-lived token minted by `GET /api/v1/transcribe/token`. Never ship an API key to the
  client, and do not proxy audio through a JVM WebSocket unless you have to.
- Audio storage is **off by default**. An optional "keep audio" toggle stores it in the `media` table
  under the same object storage as images, linked from the entry.
- Add `writing_sessions.source` (`typed | dictated | voice_note`) so stats can show spoken words.

### 3.4 Beyond dictation (ranked)

| Idea | ICE | Smallest slice |
|---|---|---|
| **Voice journal entry**: speak for 3 minutes, get a clean journal entry with a suggested title, mood (1 to 5) and gratitude/lessons pulled into the existing `entries` fields | 9/7/7 = 7.7 | One Haiku call returns structured JSON into the existing columns. The owner confirms before saving. |
| **"Talk it through" decision interview**: the Desk asks 5 spoken questions (context, options, what you expect, confidence, review date) and fills a `decisions` row | 8/7/6 = 7.0 | Fixed question list (no free chat). Each answer is transcribed, then structured into the existing fields. |
| **Weekly review draft**: summarize the week's journal entries, moods and decisions into the weekly review template as *questions*, not conclusions | 8/7/7 = 7.3 | Sonnet 5.5 on owner request only. It quotes your own lines and never invents. |
| **Auto mood and theme tags**: suggest mood and 1 to 3 themes per journal entry; heatmap filter by theme | 6/7/8 = 7.0 | Suggestions only, never auto-applied. |
| **Ask your journal**: semantic search ("when did I last feel this stuck?") | 7/6/5 = 6.0 | pgvector on Neon plus embeddings; can be built on the existing command palette. |
| **Read aloud** for public essays (TTS audio version, podcast feed) | 5/7/6 = 6.0 | Generate on publish, store as media, add an `<enclosure>` to RSS. |
| AI "write for me" / continue my essay | 3/8/8 = 6.3 | **Skip.** It goes against the product's purpose (push *you* to write). Gimmick. |

**AI guardrails (part of the brand).** AI never runs on an entry unless you ask. There is one
"AI features" master toggle in Preferences. A small line shows which vendor saw the text. No AI runs
on private entries when "private mode" is on.

### 3.5 Phased rollout

| Phase | Scope | Exit check |
|---|---|---|
| A (week 1) | `/transcribe` + Groq + Haiku cleanup, voice note button in the journal editor | 10 real voice notes; edits needed under 2 per note |
| B (week 2 to 3) | Voice journal entry with structured fields; Preferences: provider, on-device-only Web Speech, keep-audio | You use it 4 days of 7 |
| C (month 2) | Decision interview + weekly review draft | One full weekly review written from the draft |
| D (later) | On-device Whisper/Moonshine private mode; streaming vendor if Web Speech disappoints | Works offline on your laptop |

---

## 4. Idea backlog by lens

### Writing habit and retention
| Idea | ICE |
|---|---|
| **Gentle streak freeze**: 1 rest day per week that keeps the streak alive (protects against all-or-nothing quitting) | 7/8/9 = 8.0 |
| **"Just 50 words" floor**: the daily goal counts as met at 50 words on low-energy days; shown differently on the heatmap | 7/7/9 = 7.7 |
| **Daily nudge by email**: one plain-text email at your chosen hour with today's prompt and streak; reply-to-journal via inbound email | 8/7/5 = 6.7 |
| **Morning pages mode**: a 750-word session with no backspace display and no stats until the end | 6/7/8 = 7.0 |
| **"On this day"** on the Desk: what you wrote 1 month / 1 year ago | 7/9/8 = 8.0 |

### Journal and reflection depth
| Idea | ICE |
|---|---|
| Prompt packs by season and situation (new job, breakup, launch week); you can enable packs from the quotes/prompts library | 6/8/8 = 7.3 |
| Energy vs mood scatter plot in the monthly review (data already in `entries.mood/energy`) | 6/8/8 = 7.3 |
| **Letters to future self**: sealed entry that unlocks on a date and shows on the Desk | 7/8/7 = 7.3 |
| Tag-free "threads": link entries that are about the same ongoing thing, shown as a thin timeline | 6/6/6 = 6.0 |

### Decision-making
| Idea | ICE |
|---|---|
| **Pre-mortem field** ("it failed a year from now; why?") and **base rate** field on the decision form | 7/8/9 = 8.0 |
| Calibration by confidence bucket (50/60/70/80/90) with a Brier score in mono numbers | 7/8/7 = 7.3 |
| Review reminders by email on `review_on` | 7/8/7 = 7.3 |
| Public "decision log" essays: publish a reviewed decision as an essay (a strong, distinctive content format) | 6/6/8 = 6.7 |

### Public blog: reading, discovery, SEO, subscribers
| Idea | ICE |
|---|---|
| **Email subscriptions** (double opt-in; Buttondown or Resend + a `subscribers` table); send new essays automatically | 9/8/6 = 7.7 |
| Series / collections (ordered essays with "part 2 of 5") | 6/8/7 = 7.0 |
| Highlight-to-share: select text on an essay to get a share link to that passage plus an OG quote card | 7/7/6 = 6.7 |
| Quiet reactions ("this stayed with me") with no counts shown publicly | 5/6/8 = 6.3 |
| Webmentions / reply by email instead of comments (no moderation load) | 5/7/7 = 6.3 |
| "Now" page and "Uses" page from settings | 4/9/9 = 7.3 |

### Privacy and trust
| Idea | ICE |
|---|---|
| **Client-side encrypted journal** (opt-in passphrase, WebCrypto AES-GCM; server stores ciphertext; search works only on unencrypted entries) | 9/6/4 = 6.3 |
| Data page: "what is stored, who sees it, export everything, delete everything" | 7/9/8 = 8.0 |
| Session list (device, last seen) with per-session revoke; follows from token versioning | 6/8/6 = 6.7 |
| Panic lock: shortcut that blurs the Desk and requires re-auth | 5/8/9 = 7.3 |

### Mobile and offline
| Idea | ICE |
|---|---|
| **PWA**: installable, offline write queue (IndexedDB draft already planned), share-target to capture a note from any app | 8/8/6 = 7.3 |
| Quick capture page `/desk/capture`: one field, opens instantly, saves as a note | 7/9/9 = 8.3 |
| Home-screen voice note shortcut that opens straight into recording | 6/7/7 = 6.7 |

### Design and delight
| Idea | ICE |
|---|---|
| Year-end "Your year in words" page (private, optionally publishable) | 7/8/6 = 7.0 |
| Print stylesheet and "export as a bound PDF book" of a year's journal | 6/7/6 = 6.3 |
| Ambient sound in focus mode (rain, room tone), off by default | 4/7/8 = 6.3 |

### Multi-user / SaaS path
| Idea | ICE |
|---|---|
| **Decide the path before data grows**: (a) open-source self-host template, or (b) hosted multi-tenant. (b) needs `owner_id` on every table, row-level checks, and per-tenant settings and slugs. That migration gets more expensive each month | 8/7/4 = 6.3 |
| One-click deploy (Neon + Render/Fly/Railway template) for the self-host path | 7/7/6 = 6.7 |
| Custom domains per tenant (hosted path) | 6/6/4 = 5.3 |

### Operations (hosting, backups, monitoring, Neon cost)
| Idea | ICE |
|---|---|
| Host: static frontend on Cloudflare Pages/Vercel with `/api` routed to the Spring app (Render/Fly/Railway). Or serve the frontend from Spring itself, which gives one origin and makes OG injection trivial | 8/8/7 = 7.7 |
| CDN-cache public essay HTML and JSON for 5 to 10 minutes, so JVM and Neon cold starts never hit readers | 7/8/7 = 7.3 |
| JVM cold start: consider Spring AOT / CDS (or GraalVM native later) if the host sleeps | 6/6/5 = 5.7 |
| Neon: keep the Hikari pool idle-friendly (already done); never point uptime checks at DB routes; use a dev branch per feature | 6/9/9 = 8.0 |
| A monthly "restore drill" script that restores the export zip into a Neon branch | 6/8/7 = 7.0 |

---

## 5. Monetization and go-to-market

**Positioning.** "A quiet place to write in public and think in private." No mainstream tool
combines a beautiful essay site, a private journal, and a decision log that learns from your outcomes.
Ghost and Substack are publish-only. Day One and Reflect are private-only. Rosebud and Mindsera are AI
journaling apps without a publication. The decision journal plus calibration is the most defensible
piece, because nobody else does it well.

**Who pays**

| Segment | Pain | What they pay for |
|---|---|---|
| Indie writers and founders who write publicly | Separate tools for the blog, journal and decision notes; ugly default themes | A hosted Words site with custom domain + Desk |
| Reflective professionals (PMs, investors, coaches) | Want better decisions and honest reviews | Decision journal, calibration, weekly review drafts, voice journaling |
| Privacy-minded journalers | Distrust cloud journals | Self-host license or the encrypted / on-device private mode |

**Pricing sketch (test later, do not build billing yet)**

| Plan | Price | Includes |
|---|---|---|
| Self-host (open source core) | Free | Everything single-owner; bring your own Neon and keys |
| Hosted | about $8/month or $72/year | Custom domain, backups, email subscribers up to a cap |
| Hosted + Voice/AI | about $14/month | About 15 hours of transcription plus cleanup and review drafts. The vendor cost is under $1 per user per month at Groq rates, so the margin is fine |
| Lifetime self-host supporter | One-time about $99 | Priority themes and prompt packs; goodwill |

**How they hear about it**

1. **Your own essays on Words are the demo.** A footer line on every public page ("Written in Words")
   links to a waitlist.
2. **Build in public**: a monthly essay on building Words, cross-posted to dev.to, Hashnode and LinkedIn.
3. **Launches**: Show HN (lead with "decision journal with calibration" plus self-host), r/selfhosted,
   r/Journaling, Indie Hackers, then Product Hunt once the hosted waitlist has 200+ emails.
4. **SEO pages that fit the brand**: free public templates ("decision journal template",
   "weekly review questions", "pre-mortem template"), each with a "use this in Words" call to action.
5. **Open-source repo** with a polished README GIF of the landing page; stars drive self-host users,
   who convert to hosted.

**Sequencing.** (1) Launch your own site publicly (section 2 blockers). (2) Write for 8 weeks and
collect waitlist emails. (3) Choose self-host or multi-tenant from the waitlist answers. (4) Add billing
(Stripe or Lemon Squeezy) only after 50 people say they would pay.

---

## Sources

1. MDN, `SpeechRecognition.processLocally`: https://developer.mozilla.org/docs/Web/API/SpeechRecognition/processLocally ;
   caniuse: https://caniuse.com/mdn-api_speechrecognition_processlocally ;
   Edge docs: https://learn.microsoft.com/en-us/microsoft-edge/web-platform/speech-recognition-api
2. OpenAI `gpt-transcribe` model page: https://developers.openai.com/api/docs/models/gpt-transcribe
3. OpenAI `gpt-4o-transcribe`: https://developers.openai.com/api/docs/models/gpt-4o-transcribe ;
   `gpt-4o-mini-transcribe`: https://developers.openai.com/api/docs/models/gpt-4o-mini-transcribe.md ;
   per-minute estimate: https://www.neowin.net/news/openai-announces-next-generation-audio-models-to-power-voice-agents/
4. Groq `whisper-large-v3-turbo`: https://console.groq.com/docs/model/whisper-large-v3-turbo ;
   pricing: https://groq.com/pricing
5. Deepgram pricing: https://deepgram.com/pricing ;
   promotional vs regular rates: https://www.activepieces.com/blog/deepgram-pricing-2026-per-minute-rates-and-add-ons.md
6. AssemblyAI pricing: https://www.assemblyai.com/pricing.md ;
   Universal-3.6 Pro Realtime: https://www.usagepricing.com/blueprint/activity/assemblyai-2026-10-25-universal-3-6-pro-realtime
7. Transformers.js WebGPU guide: https://huggingface.co/docs/transformers.js/en/guides/webgpu ;
   Moonshine web demo: https://huggingface.co/spaces/webml-community/moonshine-web/blob/main/README.md?code=true ;
   whisper-web: https://github.com/xenova/whisper-web
8. Claude model prices (Haiku 5.5 $0.10/$0.50, Sonnet 5.5 $2/$10, Opus 5.5 $4/$20 per million tokens)
   come from the Claude API reference (cached 2026-11-03). Confirm at https://www.anthropic.com/pricing

---

## Changelog

- 2026-11-24: First version. Grounded in README, SPEC and the Phase 1 code. Added Top 5 (server-side
  OG meta, DB-stored owner credentials with token versioning, Groq + Haiku voice notes, durable media
  and backups, monitoring). Added the launch checklist, the speech-to-text options table with prices
  verified on 2026-11-24, the backlog across 10 lenses, and the monetization and go-to-market sketch.
