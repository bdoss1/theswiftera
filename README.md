# SwiftTok — The Swift Era Content Engine

A **local-first** personal MCP command center for **Swift the Great / The Swift Era** brand. SwiftTok generates social media content using OpenAI, manages approval workflows, and publishes to Facebook, Instagram, and X (Twitter) via their respective APIs.

Built with Next.js 15, TypeScript, TailwindCSS, Prisma ORM, and a local Postgres database.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
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
- **OpenAI API key** — for content generation
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

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | `postgresql://swifttok:swifttok@localhost:5432/swifttok` | Postgres connection string |
| `OPENAI_API_KEY` | Yes | — | Your OpenAI API key for content generation |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | OpenAI model to use |
| `OPENAI_MAX_RETRIES` | No | `3` | Number of retries for OpenAI API calls |
| `OPENAI_TEMPERATURE` | No | `0.85` | Generation temperature |
| `FACEBOOK_PAGE_ID` | No | — | Facebook Page ID |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | No | — | Facebook Page access token |
| `INSTAGRAM_ACCOUNT_ID` | No | — | Instagram Business Account ID |
| `INSTAGRAM_ACCESS_TOKEN` | No | — | Instagram access token |
| `X_API_KEY` | No | — | X/Twitter API key |
| `X_API_SECRET` | No | — | X/Twitter API secret |
| `X_ACCESS_TOKEN` | No | — | X/Twitter access token |
| `X_ACCESS_SECRET` | No | — | X/Twitter access secret |
| `WORKER_POLL_INTERVAL_MS` | No | `30000` | Worker polling interval (ms) |
| `WORKER_MAX_ATTEMPTS` | No | `3` | Max publish retry attempts |
| `WORKER_BACKOFF_MINUTES` | No | `1,5,15` | Retry backoff schedule (minutes) |
| `API_RATE_LIMIT_PER_MINUTE` | No | `60` | API endpoint rate limit |
| `AUTH_ENABLED` | No | `false` | Enable authentication |
| `NEXTAUTH_SECRET` | No | — | NextAuth.js secret (required if auth enabled) |
| `ADMIN_USERNAME` | No | `admin` | Admin login username |
| `ADMIN_PASSWORD` | No | — | Admin login password (required if auth enabled) |
| `LOG_LEVEL` | No | `info` | Logging level (debug, info, warn, error) |

See `.env.example` for the complete list with defaults.

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
│   │       ├── generate/        # Content generation via OpenAI
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
│   │   ├── ai/                  # OpenAI integration, retry, & moderation
│   │   ├── facebook/            # Facebook Graph API client
│   │   ├── instagram/           # Instagram Graph API publishing
│   │   ├── x/                   # X/Twitter API publishing
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
5. Click **Generate** to create content variants using OpenAI (with automatic retry on failure)
6. Preview each variant with the **Facebook Preview** to see how it will look when posted
7. Save variants as drafts or approve them directly
8. **AI Hashtag Suggestions** — Auto-generate relevant hashtags for your content
9. **Image Upload** — Attach images to posts for richer content

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
- **Prompt Templates** — Full CRUD editor to create, edit, and delete prompt templates
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
| `POST` | `/api/generate` | Generate content via OpenAI |
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
| `GET/POST/PUT` | `/api/facebook` | Facebook page config & test |
| `POST` | `/api/calendar/auto-build` | Auto-schedule content |
| `GET/POST` | `/api/templates` | List/Create prompt templates |
| `PATCH/DELETE` | `/api/templates/[id]` | Update/Delete a template |
| `GET/POST` | `/api/rate-limit` | Rate limit tracking |
| `POST` | `/api/hashtags` | AI hashtag generation |
| `POST` | `/api/upload` | Image upload |
| `GET/POST` | `/api/auth/[...nextauth]` | NextAuth.js endpoints |

---

## Background Worker

The worker (`src/worker.ts`) handles scheduled publishing to all platforms:

```bash
pnpm worker
```

**How it works:**

1. Polls the database every 30 seconds (configurable)
2. Finds scheduled jobs with `runAt <= now`
3. Routes to the correct platform publisher (Facebook, Instagram, or X)
4. Tracks API call counts for rate limiting awareness
5. On success: marks content as `POSTED`
6. On failure: retries with configurable exponential backoff (default: 1m, 5m, 15m)
7. After max retries: marks content as `FAILED`

All configuration is via environment variables — see `.env.example`.

---

## Authentication

Authentication is **optional** and disabled by default. To enable:

1. Set `AUTH_ENABLED=true` in `.env`
2. Set `NEXTAUTH_SECRET` to a random string
3. Set `ADMIN_PASSWORD` to your desired password
4. Optionally change `ADMIN_USERNAME` (default: `admin`)

When enabled, all pages require login. API routes and the login page are excluded from auth checks.

---

## Content Safety

SwiftTok includes multiple layers of content safety:

1. **Blocked Words** — Simple substring filter configured in Settings
2. **OpenAI Moderation API** — When **Strict Mode** is enabled, all generated content is checked against OpenAI's moderation endpoint. Flagged content is automatically filtered out.
3. **Zod Validation** — All API inputs are strictly validated to prevent malformed data

---

## Image Upload

Upload images for your posts via the `/api/upload` endpoint:

- Supports JPEG, PNG, GIF, and WebP formats
- Configurable max file size (default: 10MB)
- Images are stored in `public/uploads/`
- Returns a URL path that can be attached to content items

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

Items are imported as `DRAFT` status for review.

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

### Available Commands

| Command | Description |
|---|---|
| `pnpm db:up` | Start the Postgres container |
| `pnpm db:down` | Stop the Postgres container |
| `pnpm db:backup` | Create a database backup |
| `pnpm db:restore` | Restore from a backup |
| `pnpm prisma:migrate` | Run database migrations |
| `pnpm prisma:generate` | Regenerate the Prisma client |
| `pnpm prisma:seed` | Seed default templates and settings |
| `pnpm prisma:studio` | Open Prisma Studio (visual DB browser) |

---

## Deployment

### Vercel (Recommended)

1. Push your repository to GitHub
2. Import the project on [Vercel](https://vercel.com)
3. Set environment variables in the Vercel dashboard:
   - `DATABASE_URL` — Use a managed Postgres (e.g., Neon, Supabase, Railway)
   - `OPENAI_API_KEY`
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
- [ ] Set a strong `NEXTAUTH_SECRET`
- [ ] Enable `AUTH_ENABLED=true` if publicly accessible
- [ ] Set `ADMIN_PASSWORD` to a strong password
- [ ] Configure social media API credentials
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
| AI | OpenAI API (GPT-4o-mini default) |
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
