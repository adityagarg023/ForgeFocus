# ForgeFocus — Deep Work Tracker

Plan focus sessions, track actual working time, and review your productivity.

## Features

- Countdown timer with pause, resume, and overtime (stopwatch mode)
- Session history stored locally in the browser (localStorage)
- Email/password authentication via Clerk (optional — the timer works anonymously)
- Profile page with lifetime focus stats

## Prerequisites

- Node.js 18+ (Node 22 recommended)
- A free [Clerk](https://clerk.com) account for authentication

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Clerk

1. Create a free account at [clerk.com](https://clerk.com) and create a new application.
2. Go to **API Keys** in your Clerk dashboard.
3. Copy your **Publishable Key** (`pk_...`) and **Secret Key** (`sk_...`).
4. Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_OUT_URL=/
```

**Note:** Email/password is the default sign-in method. You can enable
additional providers from the Clerk dashboard if desired.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How auth works

- The timer and session history work **without signing in** — data is stored
  in localStorage on the user's device.
- The header shows **Sign in** / **Sign up** buttons when logged out, and a
  user avatar menu when logged in.
- Dedicated `/sign-in` and `/sign-up` pages use Clerk's prebuilt components.
- The `/profile` page shows account details and lifetime focus stats when
  signed in, and a sign-in prompt when signed out.
- Sign-out is available from the user avatar menu in the header.

## Database (Supabase)

Focus sessions are designed to be persisted in a Supabase PostgreSQL
database. A `sessions` table has been created via versioned migrations
and is ready for future UI integration.

### Schema overview

The `sessions` table mirrors the existing TypeScript types
(`CompletedSession` and `TimerSession` in `src/lib/`):

| Column | Type | Description |
| --- | --- | --- |
| `id` | uuid (PK) | Database-generated unique ID |
| `clerk_user_id` | text | Clerk user ID of the session owner |
| `session_id` | text (unique) | Client-generated session identifier |
| `status` | text | Terminal status: `Complete` or `Discard` |
| `planned_duration_ms` | bigint | Planned focus duration in milliseconds |
| `total_focus_time_ms` | bigint | Actual focused time in milliseconds (excludes pauses) |
| `overtime_ms` | bigint | Overtime beyond planned duration in milliseconds |
| `started_at` | timestamptz | When the session started |
| `completed_at` | timestamptz | When the session was completed or discarded |
| `notes` | text (nullable) | Optional notes, max 500 characters |
| `created_at` | timestamptz | Row creation time |
| `updated_at` | timestamptz | Last modification time (auto-updated via trigger) |

### Design decisions

- **Duration units**: All durations are stored in **milliseconds** as
  `bigint`, matching the frontend's epoch-millisecond convention.
- **Clerk user IDs**: Stored as `text` (not `uuid`) because Clerk IDs are
  strings like `user_2abc...`, not UUIDs. No foreign key to
  `auth.users` since Clerk manages users, not Supabase Auth.
- **Only terminal sessions**: The table stores completed or discarded
  sessions only. Active (in-progress) sessions remain in localStorage,
  matching the current app behaviour.
- **Constraints**: `status` is limited to `Complete` / `Discard`;
  all duration columns must be `>= 0`; notes capped at 500 characters.

### Indexes

- `sessions_clerk_user_id_idx` — fast per-user queries
- `sessions_clerk_user_id_completed_at_idx` — composite index for
  "today's sessions" and history listings (newest first)

### Security (Row Level Security)

RLS is enabled on the `sessions` table with four owner-scoped policies
(SELECT, INSERT, UPDATE, DELETE). Each policy checks that
`clerk_user_id` matches the authenticated user.

**Important**: The app uses Clerk for authentication, not Supabase Auth.
The RLS policies compare `clerk_user_id` against `auth.uid()::text`,
which will return the Supabase Auth user ID. For these policies to work,
a Clerk-to-Supabase JWT claim mapping must be configured so that
`auth.uid()` returns the Clerk user ID. Until then, the table is
locked down by RLS — no rows can be read or written through the Data API.
This is intentional and safe: the UI is not yet querying the database,
and anonymous timer use continues to work via localStorage.

### Migrations

Migrations are applied directly to the Supabase database and tracked in
the `supabase_migrations` table. Two migrations have been applied:

1. **create_sessions_table** — creates the `sessions` table with
   columns, constraints, indexes, RLS policies, and an `updated_at`
   trigger.
2. **fix_sessions_security_and_performance** — sets an explicit
   `search_path` on the trigger function, optimizes RLS policy
   evaluation, and revokes `anon` access.

To view applied migrations:

```sql
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;
```

### Connecting the database to the UI (future work)

The database is not yet wired into the UI. When ready:

1. Install `@supabase/supabase-js`
2. Create a Supabase client singleton reading from `SUPABASE_URL` and
   `SUPABASE_ANON_KEY` environment variables (already in `.env`)
3. Replace localStorage reads/writes in `use-sessions.ts` and
   `use-timer-engine.ts` with Supabase queries
4. Configure Clerk-to-Supabase JWT mapping so RLS policies can identify
   the Clerk user

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run test` | Run unit tests (Vitest) |
| `npm run lint` | Lint with ESLint |

## Tech Stack

- Next.js 16 (App Router) + TypeScript
- React 19 + Tailwind CSS v4
- Clerk for authentication
- Supabase (PostgreSQL) for session persistence
- Vitest for unit testing
- JetBrains Mono font

## Deploy

The easiest way to deploy is on [Vercel](https://vercel.com). Make sure to add
all the Clerk environment variables in your Vercel project settings.
