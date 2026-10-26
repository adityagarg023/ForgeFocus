/*
# Fix security and performance advisories on sessions table

## Changes

### 1. Function search_path (security)
  - Recreate set_updated_at() with an explicit search_path = pg_catalog
    to prevent search_path injection. This resolves the
    "function_search_path_mutable" security warning.

### 2. RLS policy performance (auth_rls_initplan)
  - Replace auth.uid() with (SELECT auth.uid()) in all four policies.
    This wraps the call in a subselect so Postgres evaluates it once
    per query (init plan) instead of once per row, improving
    performance at scale.

### 3. Revoke excess anon grants
  - Revoke all privileges from the anon role on sessions. The previous
    migration's GRANT to authenticated was correct, but Supabase may
    have granted anon by default. Anonymous users should NOT access
    this table — the app requires Clerk sign-in to persist sessions.
    Only authenticated users get CRUD access.

## Tables modified
  - sessions (policies rewritten, grants adjusted)

## Functions modified
  - set_updated_at() — recreated with search_path = pg_catalog
*/

-- ---------------------------------------------------------------------------
-- 1. Recreate set_updated_at with explicit search_path
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS sessions_set_updated_at ON sessions;
DROP FUNCTION IF EXISTS set_updated_at();

CREATE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER sessions_set_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Revoke anon privileges (app requires sign-in)
-- ---------------------------------------------------------------------------
REVOKE SELECT, INSERT, UPDATE, DELETE ON sessions FROM anon;

-- ---------------------------------------------------------------------------
-- 3. Rewrite RLS policies with (SELECT auth.uid()) for performance
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "select_own_sessions" ON sessions;
CREATE POLICY "select_own_sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING (clerk_user_id = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "insert_own_sessions" ON sessions;
CREATE POLICY "insert_own_sessions"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK (clerk_user_id = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "update_own_sessions" ON sessions;
CREATE POLICY "update_own_sessions"
  ON sessions FOR UPDATE
  TO authenticated
  USING (clerk_user_id = (SELECT auth.uid())::text)
  WITH CHECK (clerk_user_id = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "delete_own_sessions" ON sessions;
CREATE POLICY "delete_own_sessions"
  ON sessions FOR DELETE
  TO authenticated
  USING (clerk_user_id = (SELECT auth.uid())::text);
