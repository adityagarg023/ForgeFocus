/*
# Create sessions table for ForgeFocus

## Purpose
Stores completed focus sessions for ForgeFocus, a deep-work timer app.
Each row represents one completed (or discarded) focus session belonging
to a single Clerk-authenticated user.

## Duration Units
All duration columns are stored in **milliseconds** (bigint), matching
the existing TypeScript types in the codebase:
  - TimerSession.plannedDuration  (ms)
  - TimerSession.totalFocusTime   (ms)
  - CompletedSession.overtimeMs   (ms)

Using bigint (not integer) ensures values up to ~292 million years are
representable, far beyond any realistic session length, while keeping
the unit consistent with the frontend.

## Timestamps
All timestamp columns use timestamptz (UTC). The frontend currently
works with epoch milliseconds (number); these will be converted to
ISO strings when writing to the database and back when reading.

## New Tables

### sessions
  - id (uuid, primary key) — database-generated unique identifier
  - clerk_user_id (text, not null) — Clerk user ID of the session owner.
      Clerk IDs are strings (e.g. "user_2abc..."), not UUIDs, so this is
      text rather than uuid. No foreign key to auth.users because Clerk
      manages users, not Supabase Auth.
  - session_id (text, not null, unique) — the client-generated session
      identifier (crypto.randomUUID()). Uniqueness is enforced to prevent
      duplicate inserts on retry.
  - status (text, not null) — session terminal status: "Complete" or
      "Discard". CHECK constraint limits to these two values. Active
      statuses ("Running", "Paused", etc.) are not persisted here — only
      completed sessions are stored, matching the current localStorage
      behaviour where only CompletedSession rows are saved.
  - planned_duration_ms (bigint, not null) — planned focus duration in
      milliseconds. Must be >= 0.
  - total_focus_time_ms (bigint, not null) — actual focused time in
      milliseconds (excludes paused time). Must be >= 0.
  - overtime_ms (bigint, not null, default 0) — overtime beyond the
      planned duration in milliseconds. Must be >= 0.
  - started_at (timestamptz, not null) — when the session was started.
  - completed_at (timestamptz, not null) — when the session reached its
      terminal status (completed or discarded).
  - notes (text, nullable) — optional user notes about the session.
      Max length 500 characters (matching the frontend textarea
      maxLength). CHECK constraint enforces this.
  - created_at (timestamptz, not null, default now()) — row insertion time.
  - updated_at (timestamptz, not null, default now()) — last modification
      time. Updated via a trigger on UPDATE.

## Indexes
  - sessions_clerk_user_id_idx — on clerk_user_id for per-user queries
  - sessions_clerk_user_id_completed_at_idx — composite on
      (clerk_user_id, completed_at DESC) for "today's sessions" and
      history listings ordered by most recent first
  - sessions_session_id_key — unique index on session_id (enforced by
      the UNIQUE constraint)

## Security
  - Row Level Security is ENABLED on sessions.
  - Grants: CRUD (SELECT, INSERT, UPDATE, DELETE) to authenticated only.
      The anon role is NOT granted access because this app requires
      sign-in (via Clerk) to persist sessions. Anonymous timer use
      stays in localStorage.
  - Policies: four separate owner-scoped policies (SELECT, INSERT,
      UPDATE, DELETE) checking clerk_user_id against auth.uid()::text.
      NOTE: auth.uid() returns a UUID from Supabase Auth. ForgeFocus
      uses Clerk, not Supabase Auth. These policies will become
      functional once a Clerk-to-Supabase JWT claim mapping is
      configured (so that auth.uid() returns the Clerk user ID or a
      mapped value). Until then, the table is locked down by RLS —
      no role can read or write rows through the Data API. This is
      intentional and safe: the UI is not yet querying the database.

## updated_at trigger
  - A trigger function set_updated_at() sets updated_at = now() on
      every UPDATE, so the column always reflects the last modification.
*/

-- ---------------------------------------------------------------------------
-- 1. sessions table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id       text        NOT NULL,
  session_id          text        NOT NULL UNIQUE,
  status              text        NOT NULL CHECK (status IN ('Complete', 'Discard')),
  planned_duration_ms bigint      NOT NULL CHECK (planned_duration_ms >= 0),
  total_focus_time_ms bigint      NOT NULL CHECK (total_focus_time_ms >= 0),
  overtime_ms         bigint      NOT NULL DEFAULT 0 CHECK (overtime_ms >= 0),
  started_at          timestamptz NOT NULL,
  completed_at        timestamptz NOT NULL,
  notes               text        CHECK (notes IS NULL OR length(notes) <= 500),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS sessions_clerk_user_id_idx
  ON sessions (clerk_user_id);

CREATE INDEX IF NOT EXISTS sessions_clerk_user_id_completed_at_idx
  ON sessions (clerk_user_id, completed_at DESC);

-- ---------------------------------------------------------------------------
-- 3. Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Grant CRUD to authenticated only (no anon — app requires Clerk sign-in)
GRANT SELECT, INSERT, UPDATE, DELETE ON sessions TO authenticated;

-- Owner-scoped policies (one per CRUD verb)
DROP POLICY IF EXISTS "select_own_sessions" ON sessions;
CREATE POLICY "select_own_sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING (clerk_user_id = auth.uid()::text);

DROP POLICY IF EXISTS "insert_own_sessions" ON sessions;
CREATE POLICY "insert_own_sessions"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK (clerk_user_id = auth.uid()::text);

DROP POLICY IF EXISTS "update_own_sessions" ON sessions;
CREATE POLICY "update_own_sessions"
  ON sessions FOR UPDATE
  TO authenticated
  USING (clerk_user_id = auth.uid()::text)
  WITH CHECK (clerk_user_id = auth.uid()::text);

DROP POLICY IF EXISTS "delete_own_sessions" ON sessions;
CREATE POLICY "delete_own_sessions"
  ON sessions FOR DELETE
  TO authenticated
  USING (clerk_user_id = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- 4. updated_at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sessions_set_updated_at ON sessions;
CREATE TRIGGER sessions_set_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
