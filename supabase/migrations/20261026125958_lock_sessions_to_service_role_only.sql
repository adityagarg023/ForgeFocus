/*
# Lock down sessions table to service_role-only access

## Purpose
ForgeFocus uses Clerk for authentication, not Supabase Auth. The previous
RLS policies compared clerk_user_id against auth.uid()::text, but
auth.uid() returns a Supabase Auth UUID which will never match a Clerk
user ID string. Those policies were non-functional — they would block
all access even for legitimate users.

The correct security model for a Clerk-authenticated app is a
**server-only database layer**:
  1. Next.js route handlers verify identity via Clerk's auth().
  2. Route handlers use the Supabase service_role key (which bypasses
     RLS) to query the database.
  3. Every query filters by clerk_user_id, derived from the verified
     Clerk session — never from client-supplied input.

This migration locks the table down so only service_role can access it.
The browser (anon / authenticated roles) has no direct access at all.

## Changes

### 1. Revoke all privileges from authenticated and anon
  - The browser never talks to this table directly. All access goes
    through route handlers using the service_role key.

### 2. Drop all existing RLS policies
  - The auth.uid()-based policies are non-functional with Clerk and
    are removed. RLS remains ENABLED as a defense-in-depth measure:
    even if a grant were accidentally added, without a policy no rows
    are visible.

### 3. Grant access to service_role only
  - service_role bypasses RLS entirely, so no policies are needed.
    Route handlers enforce ownership in every query.

## Tables modified
  - sessions

## Security impact
  - anon role: no privileges (cannot read or write)
  - authenticated role: no privileges (cannot read or write)
  - service_role: full CRUD (bypasses RLS)
  - RLS: ENABLED, no policies (deny-by-default for non-service roles)
*/

-- ---------------------------------------------------------------------------
-- 1. Revoke all client-facing privileges
-- ---------------------------------------------------------------------------
REVOKE SELECT, INSERT, UPDATE, DELETE ON sessions FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON sessions FROM authenticated;

-- ---------------------------------------------------------------------------
-- 2. Drop non-functional auth.uid()-based policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "select_own_sessions" ON sessions;
DROP POLICY IF EXISTS "insert_own_sessions" ON sessions;
DROP POLICY IF EXISTS "update_own_sessions" ON sessions;
DROP POLICY IF EXISTS "delete_own_sessions" ON sessions;

-- ---------------------------------------------------------------------------
-- 3. Grant CRUD to service_role only
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON sessions TO service_role;
