# SwiftTok — The Swift Era Content Engine

A **local-first** personal MCP command center for **Swift the Great / The Swift Era** brand. SwiftTok generates social media content using OpenAI, manages approval workflows, and publishes to Facebook Pages via the Meta Graph API.

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
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Dark Mode](#dark-mode)
- [Export & Import](#export--import)
- [Tech Stack](#tech-stack)

---

## Prerequisites

- **Node.js** 18+
- **pnpm** (recommended) — `npm install -g pnpm`
- **Docker** & **Docker Compose** (for local Postgres)
- **OpenAI API key** — for content generation
- **Facebook Page Access Token** (optional) — for publishing to Facebook

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

The worker polls the database every 30 seconds for scheduled publish jobs and posts them to Facebook.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | `postgresql://swifttok:swifttok@localhost:5432/swifttok?schema=public` | Postgres connection string |
| `OPENAI_API_KEY` | Yes | — | Your OpenAI API key for content generation |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | OpenAI model to use (e.g. `gpt-4o`, `gpt-4o-mini`) |
| `FACEBOOK_PAGE_ID` | No | — | Facebook Page ID (can also be set in Settings UI) |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | No | — | Facebook Page access token (can also be set in Settings UI) |
| `WORKER_POLL_INTERVAL_MS` | No | `30000` | How often the worker checks for jobs (milliseconds) |

---

## Project Structure

```
theswiftera/
├── prisma/
│   ├── schema.prisma          # Data model (7 models, 6 enums)
│   └── seed.ts                # Database seeder
├── src/
│   ├── app/
│   │   ├── page.tsx           # Dashboard — analytics & stats
│   │   ├── studio/page.tsx    # Studio — AI content generation
│   │   ├── review/page.tsx    # Review — approve/reject content
│   │   ├── calendar/page.tsx  # Calendar — scheduling view
│   │   ├── history/page.tsx   # History — posted/failed log
│   │   ├── settings/page.tsx  # Settings — config & templates
│   │   ├── layout.tsx         # Root layout with theme & toasts
│   │   ├── globals.css        # TailwindCSS + dark mode variables
│   │   └── api/               # API routes (see below)
│   ├── components/
│   │   ├── nav.tsx            # Navigation bar
│   │   ├── facebook-preview.tsx  # Facebook post preview
│   │   ├── theme-provider.tsx # Dark mode provider
│   │   ├── theme-toggle.tsx   # Dark mode toggle button
│   │   └── ui/               # Reusable UI components (button, card, etc.)
│   ├── lib/
│   │   ├── ai/               # OpenAI integration & prompt engineering
│   │   ├── facebook/         # Facebook Graph API client
│   │   └── prisma.ts         # Prisma client singleton
│   └── worker.ts             # Background publish worker
├── docker-compose.yml         # Local Postgres container
├── .env.example               # Environment variable template
└── package.json               # Scripts & dependencies
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
3. Choose a **platform** (Facebook, Instagram, X — Instagram/X are coming soon)
4. Optionally enter a **topic** for focused generation
5. Click **Generate** to create 3 content variants using OpenAI
6. Preview each variant with the **Facebook Preview** to see how it will look when posted
7. Save variants as drafts or approve them directly

### Review (`/review`)

The content approval workflow:

- View all items pending review in a scrollable list
- **Single actions** — Approve, reject, or mark items for review individually
- **Bulk actions** — Select multiple items with checkboxes, then approve/reject all at once
- **Facebook Preview** — Toggle a realistic preview for any item
- **Keyboard shortcuts** — Power-user navigation (see [Keyboard Shortcuts](#keyboard-shortcuts))
- Items show pillar, tone, platform, and hashtag badges

### Calendar (`/calendar`)

A weekly scheduling view:

- See all scheduled and posted items laid out by day
- **Auto-build calendar** — Automatically schedules approved content across the week
- Click any item to see its full details

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
- **Strict Mode & Blocked Words** — Content safety controls
- **Facebook Page** — Connect your Facebook Page with Page ID and access token, with a connection test button
- **Prompt Templates** — Full CRUD editor to create, edit, and delete prompt templates used for AI generation
- **API Rate Limits** — Visual display of Facebook API usage with color-coded progress bars (green/amber/red)
- **Import Content** — Upload a JSON file to bulk-import content items as drafts

---

## API Routes

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/stats` | Dashboard statistics, daily activity, and pillar breakdown |
| `POST` | `/api/generate` | Generate content via OpenAI (body: `{ pillar, tone, topic?, platform? }`) |
| `GET` | `/api/content` | List content items (query: `?status=...`) |
| `POST` | `/api/content` | Create a content item |
| `GET` | `/api/content/[id]` | Get a single content item |
| `PATCH` | `/api/content/[id]` | Update a content item (status, fields, etc.) |
| `DELETE` | `/api/content/[id]` | Delete a content item |
| `POST` | `/api/content/[id]/publish` | Immediately publish a content item to Facebook |
| `PUT` | `/api/content/bulk` | Bulk update status for multiple items (body: `{ ids, status }`) |
| `GET` | `/api/content/export` | Export content (query: `?format=json` or `?format=csv`) |
| `POST` | `/api/content/import` | Import content from JSON array |
| `GET` | `/api/settings` | Get current app settings |
| `PUT` | `/api/settings` | Update app settings |
| `GET/POST` | `/api/facebook` | Get connected page info / Connect a Facebook Page |
| `POST` | `/api/calendar/auto-build` | Auto-schedule approved content for the week |
| `GET/POST` | `/api/templates` | List / Create prompt templates |
| `PUT/DELETE` | `/api/templates/[id]` | Update / Delete a prompt template |
| `GET/POST` | `/api/rate-limit` | Get rate limit status / Record an API call |

---

## Background Worker

The worker (`src/worker.ts`) is a standalone process that handles scheduled publishing:

```bash
pnpm worker
```

**How it works:**

1. Polls the database every 30 seconds (configurable via `WORKER_POLL_INTERVAL_MS`)
2. Finds `PublishJob` records with status `SCHEDULED` and `runAt <= now`
3. Publishes each item to Facebook via the Graph API
4. Tracks API call counts for rate limiting awareness
5. On success: marks the content as `POSTED` with the external post ID
6. On failure: retries up to 3 times with exponential backoff (1m, 5m, 15m)
7. After max retries: marks the content as `FAILED` with the error message

---

## Keyboard Shortcuts

The Review page supports keyboard navigation for power users:

| Key | Action |
|---|---|
| `J` | Move focus to next item |
| `K` | Move focus to previous item |
| `A` | Approve the focused item |
| `R` | Reject the focused item |
| `X` | Toggle selection (checkbox) on focused item |
| `P` | Toggle Facebook preview on focused item |

---

## Dark Mode

SwiftTok includes a dark mode toggle in the navigation bar. It uses `next-themes` with the `class` strategy and supports three modes:

- **Light** — Default bright theme
- **Dark** — Dark theme with adjusted HSL variables
- **System** — Follows your OS preference

Click the sun/moon icon in the top navigation to toggle.

---

## Export & Import

### Exporting Content

From the **History** page, click either export button:

- **Export JSON** — Downloads all posted/failed items as a `.json` file
- **Export CSV** — Downloads as a `.csv` file with columns: id, platform, pillar, tone, status, caption, hashtags, scheduledFor, postedAt, createdAt

### Importing Content

From the **Settings** page, use the Import section:

1. Prepare a JSON file with an array of content objects:
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
2. Click the file upload area and select your JSON file
3. Items are imported as `DRAFT` status for review before publishing

Supported fields: `caption` (required), `pillar`, `tone`, `platform`, `postType`, `hashtags`, `linkUrl`, `topic`

---

## Database

### Available Commands

| Command | Description |
|---|---|
| `pnpm db:up` | Start the Postgres container |
| `pnpm db:down` | Stop the Postgres container |
| `pnpm prisma:migrate` | Run database migrations |
| `pnpm prisma:generate` | Regenerate the Prisma client |
| `pnpm prisma:seed` | Seed default templates and settings |
| `pnpm prisma:studio` | Open Prisma Studio (visual DB browser at localhost:5555) |

### Data Model

The database includes 7 models:

- **Setting** — App configuration (approval mode, auto-post, daily target, strict mode)
- **FacebookPage** — Connected Facebook Page credentials
- **PromptTemplate** — AI prompt templates per pillar/tone combination
- **ContentItem** — Generated content with status tracking through the full lifecycle
- **PublishJob** — Scheduled publish tasks linked to content items
- **RateLimit** — API rate limit tracking per platform/endpoint

### Brand Pillars & Tones

Content is organized around 5 **pillars** and 5 **tones** that define the Swift the Great brand:

**Pillars:** Brotherhood, Leadership, Humor, Entrepreneurship, Family

**Tones:** Leader, Funny, Reflective, Builder, Clubhouse

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | TailwindCSS v4 + CSS variables |
| UI Components | Radix UI primitives + CVA (shadcn/ui pattern) |
| Database | PostgreSQL 16 (Docker) |
| ORM | Prisma v6 |
| AI | OpenAI API (GPT-4o-mini default) |
| Charts | Recharts |
| Toasts | Sonner |
| Theming | next-themes |
| Icons | Lucide React |
| Runtime | Node.js 18+ |
| Package Manager | pnpm |
