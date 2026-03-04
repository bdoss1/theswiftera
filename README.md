# SwiftTok — The Swift Era Content Engine

A **local-first** personal command center for the **Swift the Great / The Swift Era** brand. SwiftTok generates social media content using AI (OpenAI or Google Gemini), manages approval workflows, and publishes to Facebook, Instagram, and X (Twitter) via their respective APIs.

Built with Next.js 15, TypeScript, TailwindCSS, Prisma ORM, and a local Postgres database.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [AI Provider](#ai-provider)
- [Project Structure](#project-structure)
- [Pages & Features](#pages--features)
- [API Routes](#api-routes)
- [Background Worker](#background-worker)
- [Database](#database)
- [Authentication](#authentication)
- [Content Safety](#content-safety)
- [Image Upload](#image-upload)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Dark Mode](#dark-mode)
- [Export & Import](#export--import)
- [Testing](#testing)
- [CI/CD](#cicd)
- [Database Backups](#database-backups)
- [Deployment](#deployment)
- [Tech Stack](#tech-stack)

---

## Prerequisites

- **Node.js** 18+
- **pnpm** (recommended) — `npm install -g pnpm`
- **Docker** & **Docker Compose** (for local Postgres)
- **AI API key** — OpenAI *or* Google Gemini (see [AI Provider](#ai-provider))
- **Facebook Page Access Token** (optional) — for publishing to Facebook
- **Instagram Business Account** (optional) — for publishing to Instagram
- **X/Twitter API credentials** (optional) — for publishing to X

---

## Quick Start

### 1. Clone the repository

```bash
git clone <repo-url>
cd theswiftera
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your values (see [Environment Variables](#environment-variables) below).

### 4. Start the local database

```bash
pnpm db:up
```

This runs `docker compose up -d`, starting a Postgres 16 container on port 5432.

### 5. Run database migrations

```bash
pnpm prisma:migrate
```

This creates all tables defined in `prisma/schema.prisma`.

### 6. Seed the database (optional but recommended)

```bash
pnpm prisma:seed
```

Seeds 12 prompt templates covering all pillar/tone combinations and default app settings.

### 7. Start the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to access SwiftTok.

### 8. Start the background worker (optional)

In a separate terminal:

```bash
pnpm worker
```

The worker polls the database every 30 seconds for scheduled publish jobs and posts them to Facebook, Instagram, or X.

---

## Environment Variables

### Core

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | `postgresql://swifttok:swifttok@localhost:5432/swifttok` | Postgres connection string |
| `LOG_LEVEL` | No | `info` | Logging level (`debug`, `info`, `warn`, `error`) |

### AI Provider

| Variable | Required | Default | Description |
|---|---|---|---|
| `AI_PROVIDER` | No | `openai` | AI backend to use: `openai` or `gemini` |

### OpenAI (when `AI_PROVIDER=openai`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes* | — | Your OpenAI API key |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | Model to use for text generation |
| `OPENAI_MAX_RETRIES` | No | `3` | Number of retries on API failure |
| `OPENAI_RETRY_DELAY_MS` | No | `1000` | Base delay between retries (ms) |
| `OPENAI_TEMPERATURE` | No | `0.85` | Generation temperature (0–2) |
| `OPENAI_MAX_TOKENS` | No | `4000` | Max tokens per generation request |

*Required only when `AI_PROVIDER=openai`

### Google Gemini (when `AI_PROVIDER=gemini`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | Yes* | — | Your Google AI Studio API key |
| `GEMINI_MODEL` | No | `gemini-1.5-flash` | Gemini model to use |
| `GEMINI_MAX_RETRIES` | No | `3` | Number of retries on API failure |
| `GEMINI_RETRY_DELAY_MS` | No | `1000` | Base delay between retries (ms) |
| `GEMINI_TEMPERATURE` | No | `0.85` | Generation temperature (0–2) |
| `GEMINI_MAX_TOKENS` | No | `4000` | Max output tokens per request |

*Required only when `AI_PROVIDER=gemini`

### Social Media

| Variable | Required | Default | Description |
|---|---|---|---|
| `FACEBOOK_PAGE_ID` | No | — | Facebook Page ID |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | No | — | Facebook Page access token |
| `INSTAGRAM_ACCOUNT_ID` | No | — | Instagram Business Account ID |
| `INSTAGRAM_ACCESS_TOKEN` | No | — | Instagram access token |
| `X_API_KEY` | No | — | X/Twitter API key |
| `X_API_SECRET` | No | — | X/Twitter API secret |
| `X_ACCESS_TOKEN` | No | — | X/Twitter access token |
| `X_ACCESS_SECRET` | No | — | X/Twitter access secret |

### Worker

| Variable | Required | Default | Description |
|---|---|---|---|
| `WORKER_POLL_INTERVAL_MS` | No | `30000` | Worker polling interval (ms) |
| `WORKER_MAX_ATTEMPTS` | No | `3` | Max publish retry attempts |
| `WORKER_BACKOFF_MINUTES` | No | `1,5,15` | Retry backoff schedule (comma-separated minutes) |
| `WORKER_BATCH_SIZE` | No | `10` | Jobs processed per poll cycle |

### Rate Limiting

| Variable | Required | Default | Description |
|---|---|---|---|
| `API_RATE_LIMIT_PER_MINUTE` | No | `60` | Per-IP requests per minute on API endpoints |
| `RATE_LIMIT_WINDOW_MINUTES` | No | `60` | Sliding window size (minutes) |
| `RATE_LIMIT_PER_WINDOW` | No | `200` | Max requests per window |

### Authentication

| Variable | Required | Default | Description |
|---|---|---|---|
| `AUTH_ENABLED` | No | `false` | Enable login-required access |
| `NEXTAUTH_SECRET` | No | — | NextAuth.js secret (required if auth enabled) |
| `ADMIN_USERNAME` | No | `admin` | Admin login username |
| `ADMIN_PASSWORD` | No | — | Admin login password (required if auth enabled) |

See `.env.example` for the complete list with defaults.

---

## AI Provider

SwiftTok supports two AI backends for content generation and hashtag suggestions. Switch between them with the `AI_PROVIDER` environment variable — no code changes required.

### OpenAI (default)

Uses GPT-4o-mini (or any model you configure) for text generation and DALL-E 3 for image generation.

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

Get your API key at [platform.openai.com](https://platform.openai.com).

### Google Gemini

Uses Gemini 1.5 Flash (or any Gemini model) for text generation.

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-1.5-flash
```

Get your API key at [aistudio.google.com](https://aistudio.google.com).

**Available Gemini models:**

| Model | Description |
|---|---|
| `gemini-1.5-flash` | Fast and efficient (default) |
| `gemini-1.5-pro` | More capable, higher quality |
| `gemini-2.0-flash` | Latest generation, fast |
| `gemini-2.0-pro` | Latest generation, high quality |

**Notes:**
- Both providers share the same content pipeline: blocked-word filtering and Strict Mode moderation apply regardless of which provider is active.
- Image generation (DALL-E) is only available with OpenAI. If using Gemini, image uploads still work but AI image generation is disabled.
- All retry logic, temperature, and token settings are configurable independently per provider.

---

## Project Structure

```
theswiftera/
├── .github/workflows/
│   └── ci.yml                   # CI/CD pipeline (lint, typecheck, test, build)
├── prisma/
│   ├── schema.prisma            # Data model (7 models, 6 enums)
│   └── seed.ts                  # Database seeder
├── scripts/
│   ├── backup.sh                # Database backup script
│   └── restore.sh               # Database restore script
├── src/
│   ├── __tests__/               # Test suite (Vitest)
│   ├── app/
│   │   ├── page.tsx             # Dashboard — analytics & stats
│   │   ├── studio/page.tsx      # Studio — AI content generation
│   │   ├── review/page.tsx      # Review — approve/reject content
│   │   ├── calendar/page.tsx    # Calendar — scheduling view
│   │   ├── history/page.tsx     # History — posted/failed log
│   │   ├── settings/page.tsx    # Settings — config & templates
│   │   ├── login/page.tsx       # Login page (when auth enabled)
│   │   ├── layout.tsx           # Root layout with theme & toasts
│   │   ├── globals.css          # TailwindCSS + dark mode variables
│   │   └── api/                 # API routes
│   │       ├── auth/            # NextAuth.js auth endpoints
│   │       ├── generate/        # Content generation (OpenAI or Gemini)
│   │       ├── content/         # Content CRUD + bulk/import/export/autosave
│   │       ├── calendar/        # Auto-build scheduling
│   │       ├── facebook/        # Facebook configuration
│   │       ├── hashtags/        # AI-powered hashtag generation
│   │       ├── upload/          # Image upload
│   │       ├── templates/       # Prompt template CRUD
│   │       ├── settings/        # App settings
│   │       ├── stats/           # Dashboard statistics
│   │       └── rate-limit/      # API rate limit tracking
│   ├── components/
│   │   ├── nav.tsx              # Navigation bar
│   │   ├── facebook-preview.tsx # Facebook post preview
│   │   ├── theme-provider.tsx   # Dark mode provider
│   │   ├── theme-toggle.tsx     # Dark mode toggle button
│   │   └── ui/                  # Reusable UI components
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── openai.ts        # OpenAI implementation (generateVariants, generateHashtags, generateImage)
│   │   │   ├── gemini.ts        # Google Gemini implementation (generateVariants, generateHashtags)
│   │   │   ├── provider.ts      # Provider abstraction — routes to OpenAI or Gemini via AI_PROVIDER
│   │   │   ├── moderation.ts    # OpenAI Moderation API (Strict Mode)
│   │   │   ├── prompts.ts       # Brand system prompts, pillar/tone context, CTA styles
│   │   │   └── retry.ts         # Exponential backoff retry helper
│   │   ├── facebook/            # Facebook Graph API client & publisher
│   │   ├── instagram/           # Instagram Graph API publisher
│   │   ├── x/                   # X/Twitter OAuth 1.0a publisher
│   │   ├── auth.ts              # NextAuth.js configuration
│   │   ├── config.ts            # Centralized configuration module
│   │   ├── logger.ts            # Structured logging (Pino)
│   │   ├── prisma.ts            # Prisma client singleton
│   │   ├── rate-limiter.ts      # API rate limiting middleware
│   │   └── validation.ts        # Zod validation schemas
│   ├── middleware.ts             # Auth middleware
│   └── worker.ts                # Background publish worker
├── vitest.config.ts              # Test configuration
├── docker-compose.yml            # Local Postgres container
├── .env.example                  # Environment variable template
└── package.json                  # Scripts & dependencies
```

---

## Pages & Features

### Dashboard (`/`)

The home page displays an overview of your content engine:

- **Stats cards** — Total items, posted count, pending review, scheduled
- **14-day activity chart** — Bar chart showing daily created vs. posted content
- **Content by pillar** — Pie chart breaking down content across the 5 brand pillars

### Studio (`/studio`)

The AI-powered content creation workspace:

1. Select a **pillar** (Brotherhood, Leadership, Humor, Entrepreneurship, Family)
2. Select a **tone** (Leader, Funny, Reflective, Builder, Clubhouse)
3. Choose a **platform** (Facebook, Instagram, X)
4. Optionally enter a **topic** for focused generation
5. Click **Generate** to create content variants using your configured AI provider (with automatic retry on failure)
6. Preview each variant with the **Facebook Preview** to see how it will look when posted
7. Save variants as drafts or approve them directly
8. **AI Hashtag Suggestions** — Auto-generate relevant hashtags for any variant
9. **Image Upload** — Attach images to posts for richer content
10. **AI Image Generation** — Generate promotional images via DALL-E 3 (OpenAI only)

### Review (`/review`)

The content approval workflow:

- View all items pending review in a scrollable list
- **Single actions** — Approve, reject, or mark items for review individually
- **Bulk actions** — Select multiple items with checkboxes, then approve/reject all at once
- **Facebook Preview** — Toggle a realistic preview for any item
- **Draft Auto-save** — Edits are automatically saved as you type
- **Keyboard shortcuts** — Power-user navigation (see [Keyboard Shortcuts](#keyboard-shortcuts))

### Calendar (`/calendar`)

A daily scheduling view:

- See all scheduled and posted items laid out by time
- **Auto-build calendar** — Automatically schedules approved content across peak engagement times (9am–9pm)
- Drag items to reorder

### History (`/history`)

A timeline of all posted and failed content:

- Sorted by date with status badges (Posted/Failed)
- **Export to JSON** — Download your entire content history as structured data
- **Export to CSV** — Download as a spreadsheet-compatible file

### Settings (`/settings`)

Configuration hub with multiple sections:

- **Approval Mode** — Toggle whether content requires manual approval before publishing
- **Auto-Post** — Enable/disable automatic posting of approved content
- **Daily Post Target** — Set how many posts per day to aim for
- **Strict Mode & Blocked Words** — Content safety controls (with OpenAI Moderation API)
- **Facebook Page** — Connect your Facebook Page with Page ID and access token
- **Prompt Templates** — Full CRUD editor to create, edit, and delete prompt templates per pillar/tone combination
- **API Rate Limits** — Visual display of API usage with color-coded progress bars
- **Import Content** — Upload a JSON file to bulk-import content items as drafts

---

## API Routes

All mutation endpoints are protected by:
- **Zod validation** — Request body schemas are strictly validated
- **Rate limiting** — In-memory per-IP rate limiter (configurable via `API_RATE_LIMIT_PER_MINUTE`)
- **Structured logging** — All operations are logged via Pino

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/stats` | Dashboard statistics |
| `POST` | `/api/generate` | Generate content variants (routes to OpenAI or Gemini) |
| `GET` | `/api/content` | List content items |
| `POST` | `/api/content` | Create content items |
| `PATCH` | `/api/content/[id]` | Update a content item |
| `DELETE` | `/api/content/[id]` | Delete a content item |
| `POST` | `/api/content/[id]/publish` | Publish to Facebook/Instagram/X |
| `PATCH` | `/api/content/bulk` | Bulk status update |
| `PATCH` | `/api/content/autosave` | Auto-save draft edits |
| `GET` | `/api/content/export` | Export as JSON or CSV |
| `POST` | `/api/content/import` | Import from JSON |
| `GET/PATCH` | `/api/settings` | Get/Update app settings |
| `GET/POST/PUT` | `/api/facebook` | Facebook page config & connection test |
| `POST` | `/api/calendar/auto-build` | Auto-schedule approved content |
| `GET/POST` | `/api/templates` | List/Create prompt templates |
| `PATCH/DELETE` | `/api/templates/[id]` | Update/Delete a template |
| `GET/POST` | `/api/rate-limit` | Rate limit tracking |
| `POST` | `/api/hashtags` | AI hashtag generation (routes to OpenAI or Gemini) |
| `POST` | `/api/upload` | Image upload |
| `GET/POST` | `/api/auth/[...nextauth]` | NextAuth.js endpoints |

---

## Background Worker

The worker (`src/worker.ts`) handles scheduled publishing to all platforms:

```bash
pnpm worker
```

**How it works:**

1. Polls the database every 30 seconds (configurable via `WORKER_POLL_INTERVAL_MS`)
2. Finds scheduled jobs with `runAt <= now` in batches (configurable via `WORKER_BATCH_SIZE`)
3. Routes to the correct platform publisher (Facebook, Instagram, or X)
4. Tracks API call counts for rate limiting awareness
5. On success: marks content as `POSTED`
6. On failure: retries with configurable exponential backoff (default: 1m, 5m, 15m)
7. After max retries: marks content as `FAILED`

All configuration is via environment variables — see `.env.example`.

---

## Database

### Schema

Defined in `prisma/schema.prisma` with 7 models and 6 enums:

**Models:**
- `Setting` — App-wide settings (approval mode, auto-post, strict mode, blocked words, daily target)
- `FacebookPage` — Stored Facebook page credentials
- `PromptTemplate` — Custom generation prompts per pillar/tone combination
- `ContentItem` — Social media posts with full status tracking
- `PublishJob` — Scheduled publishing jobs with retry state
- `RateLimit` — Per-platform API call tracking

**Status lifecycle for content:**
```
DRAFT → READY_FOR_REVIEW → APPROVED → SCHEDULED → POSTED
                                              ↘ FAILED
```

### Useful Commands

| Command | Description |
|---|---|
| `pnpm db:up` | Start the Postgres container |
| `pnpm db:down` | Stop the Postgres container |
| `pnpm prisma:migrate` | Run pending migrations |
| `pnpm prisma:generate` | Regenerate the Prisma client |
| `pnpm prisma:seed` | Seed default templates and settings |
| `pnpm prisma:studio` | Open Prisma Studio (visual DB browser) |

---

## Authentication

Authentication is **optional** and disabled by default. To enable:

1. Set `AUTH_ENABLED=true` in `.env`
2. Set `NEXTAUTH_SECRET` to a random string (`openssl rand -base64 32`)
3. Set `ADMIN_PASSWORD` to your desired password
4. Optionally change `ADMIN_USERNAME` (default: `admin`)

When enabled, all pages require login. API routes and the login page are excluded from auth checks.

---

## Content Safety

SwiftTok includes multiple layers of content safety that apply regardless of which AI provider is active:

1. **Blocked Words** — A comma-separated list configured in Settings. Any generated variant containing a blocked word is automatically removed before returning results.
2. **OpenAI Moderation API** — When **Strict Mode** is enabled in Settings, all generated variants are checked against OpenAI's moderation endpoint. Flagged content is filtered out. This check applies even when Gemini is used for generation.
3. **Zod Validation** — All API inputs are strictly validated to prevent malformed data from reaching the database.

---

## Image Upload

Upload images for your posts via the Studio or the `/api/upload` endpoint:

- Supports JPEG, PNG, GIF, and WebP formats
- Configurable max file size via `UPLOAD_MAX_FILE_SIZE_MB` (default: 10MB)
- Images are stored in `public/uploads/`
- Returns a URL path that can be attached to any content item

**AI Image Generation** (OpenAI only):

When `AI_PROVIDER=openai`, the Studio also supports generating images via DALL-E 3 and creating variations of uploaded images via DALL-E 2.

---

## Keyboard Shortcuts

The Review page supports keyboard navigation for power users:

| Key | Action |
|---|---|
| `J` | Move focus to next item |
| `K` | Move focus to previous item |
| `A` | Approve the focused item |
| `R` | Reject the focused item |
| `X` | Toggle selection on focused item |
| `P` | Toggle Facebook preview on focused item |

---

## Dark Mode

SwiftTok includes a dark mode toggle in the navigation bar. It uses `next-themes` with the `class` strategy and supports three modes:

- **Light** — Default bright theme
- **Dark** — Dark theme with adjusted HSL variables
- **System** — Follows your OS preference

---

## Export & Import

### Exporting

From the **History** page:

- **Export JSON** — Downloads all posted/failed items as `.json`
- **Export CSV** — Downloads as a `.csv` file

### Importing

From the **Settings** page, upload a JSON file:

```json
[
  {
    "caption": "Your post text here",
    "pillar": "LEADERSHIP",
    "tone": "LEADER",
    "hashtags": ["SwiftTheGreat", "Leadership"]
  }
]
```

Valid values:
- `pillar`: `BROTHERHOOD`, `LEADERSHIP`, `HUMOR`, `ENTREPRENEURSHIP`, `FAMILY`
- `tone`: `LEADER`, `FUNNY`, `REFLECTIVE`, `BUILDER`, `CLUBHOUSE`
- `platform` (optional): `FACEBOOK`, `INSTAGRAM`, `X`
- `postType` (optional): `TEXT`, `LINK`, `IMAGE`
- `status` (optional): imported items default to `DRAFT`

Items are imported as `DRAFT` status for review before any publishing.

---

## Testing

SwiftTok uses **Vitest** for testing with React Testing Library for component tests.

```bash
# Run all tests
pnpm test

# Run in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage
```

Test files are located in `src/__tests__/` and cover:
- Zod validation schemas
- Configuration module
- Rate limiter logic
- Retry mechanism

---

## CI/CD

A GitHub Actions workflow runs automatically on pushes to `main`/`develop` and on pull requests:

1. **Lint** — Runs ESLint
2. **Type Check** — Runs `tsc --noEmit`
3. **Test** — Runs the Vitest test suite
4. **Build** — Builds the Next.js app with a real Postgres service container

See `.github/workflows/ci.yml` for the full configuration.

---

## Database Backups

### Manual Backup

```bash
pnpm db:backup
```

Creates a timestamped, gzipped SQL dump in `./backups/`. Automatically removes backups older than 30 days.

### Restore

```bash
pnpm db:restore backups/swifttok_20260218_120000.sql.gz
```

---

## Deployment

### Vercel (Recommended)

1. Push your repository to GitHub
2. Import the project on [Vercel](https://vercel.com)
3. Set environment variables in the Vercel dashboard:
   - `DATABASE_URL` — Use a managed Postgres (e.g., Neon, Supabase, Railway)
   - `AI_PROVIDER` — `openai` or `gemini`
   - `OPENAI_API_KEY` or `GEMINI_API_KEY` (depending on provider)
   - `NEXTAUTH_SECRET` (if auth enabled)
   - All other required variables from `.env.example`
4. Vercel will auto-detect Next.js and configure the build

**Note:** The background worker must be run separately. Deploy it as a standalone process on Railway, Render, or a VPS.

### Railway

1. Create a new project on [Railway](https://railway.app)
2. Add a PostgreSQL service
3. Add a service from your GitHub repo (for the Next.js app)
4. Add another service from the same repo with start command `pnpm worker` (for the worker)
5. Set environment variables for both services

### Docker (Self-hosted)

```bash
# Build the Next.js app
pnpm build

# Start production server
pnpm start

# Start the worker in a separate process
pnpm worker
```

For production, use a process manager like PM2:

```bash
pm2 start npm --name "swifttok-web" -- start
pm2 start npx --name "swifttok-worker" -- tsx src/worker.ts
```

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use a managed PostgreSQL database with SSL
- [ ] Set `AI_PROVIDER` and the corresponding API key (`OPENAI_API_KEY` or `GEMINI_API_KEY`)
- [ ] Set a strong `NEXTAUTH_SECRET`
- [ ] Enable `AUTH_ENABLED=true` if publicly accessible
- [ ] Set `ADMIN_PASSWORD` to a strong password
- [ ] Configure social media API credentials (Facebook, Instagram, X)
- [ ] Set up automated database backups
- [ ] Set `LOG_LEVEL=info` or `warn`
- [ ] Configure a reverse proxy (nginx/Caddy) with SSL

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | TailwindCSS v4 + CSS variables |
| UI Components | Radix UI primitives + CVA (shadcn/ui pattern) |
| Database | PostgreSQL 16 (Docker) |
| ORM | Prisma v6 |
| AI (text) | OpenAI API (GPT-4o-mini) or Google Gemini (gemini-1.5-flash) |
| AI (images) | OpenAI DALL-E 3 / DALL-E 2 |
| Auth | NextAuth.js (optional) |
| Validation | Zod |
| Logging | Pino |
| Charts | Recharts |
| Toasts | Sonner |
| Theming | next-themes |
| Icons | Lucide React |
| Testing | Vitest + React Testing Library |
| CI/CD | GitHub Actions |
| Runtime | Node.js 18+ |
| Package Manager | pnpm |
