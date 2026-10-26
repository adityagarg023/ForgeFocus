# ForgeFocus — Deep Work Tracker

ForgeFocus helps you plan focus sessions, track actual focus time, and review your consistency.

## Features

- Editable focus countdown with pause/resume and overtime stopwatch
- Active timer recovery after browser refresh
- Session notes and today's session cards
- Anonymous sessions stored locally in the browser
- Clerk email/password authentication
- Supabase PostgreSQL history for signed-in users
- Profile statistics and a GitHub-style focus consistency chart

## Requirements

- Node.js 20.9+ (Node 22 recommended)
- A Clerk application
- A Supabase project for cloud session history

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill in the values in `.env.local` before testing authentication or cloud persistence. Never commit `.env.local` or real credentials.

### Environment variables

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk browser publishable key.
- `CLERK_SECRET_KEY`: server-only Clerk secret.
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`: auth routes.
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_OUT_URL`: redirect routes.
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only Supabase service-role key. Never prefix this with `NEXT_PUBLIC_`, expose it to client code, or commit it.

Cloud history requires valid Clerk and Supabase configuration. Anonymous timer use does not require signing in.

## Persistence and security

- Anonymous history and the active timer live in this browser's localStorage.
- Signed-in session history is read and written through Next.js Route Handlers.
- Route handlers derive the owner from the verified Clerk session; they never accept a user ID from the browser.
- Every database query is scoped by the authenticated Clerk user ID.
- The Supabase service-role client bypasses RLS and is imported only by server route handlers. Treat it as a secret and retain the explicit owner filters.
- RLS is enabled and direct `anon`/`authenticated` table access is revoked. The app does not rely on `auth.uid()` to represent Clerk users.
- Discarded sessions are not included in focus history. Guest sessions are not automatically imported into an account.

## Database migrations

The schema is tracked in `supabase/migrations/`. Before applying the migration, compare it with your existing Supabase schema because the table may have been created manually before the migration was added to the repository. Back up important data first, then apply migrations with the Supabase CLI or SQL editor as appropriate. Do not blindly recreate or drop a live table.

The sessions table stores durations in milliseconds, timestamps as `timestamptz`, and Clerk user IDs as text. The unique session ID is used to prevent duplicate writes; API retries by the same owner return the existing session where possible.

## Quality checks

```bash
npm run lint
npm run test
npx tsc --noEmit
npm run build
```

The repository includes timer, local persistence, and session validation tests. Tests and builds must be run locally after changes; live Clerk/Supabase authorization still requires testing with configured accounts.

## Architecture

- **UI:** Next.js App Router, React, TypeScript, Tailwind CSS.
- **Authentication:** Clerk.
- **Database:** Supabase-hosted PostgreSQL.
- **Validation:** Zod on server-side session inputs.
- **Tests:** Vitest and Testing Library.

## Deployment

Deployment is intentionally not performed as part of this work. Before deploying, configure production Clerk domains/redirect URLs and production Supabase credentials, apply and verify migrations, run the quality checks, and test two separate accounts to confirm cross-user isolation.
