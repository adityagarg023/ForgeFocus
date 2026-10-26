/*
# Add explicit deny-all RLS policies on sessions

## Purpose
The sessions table uses a server-only database layer: route handlers
verify Clerk identity and use the service_role key (which bypasses
RLS) with ownership enforced in every query. The browser never talks
to the table directly — anon and authenticated have no grants.

RLS was enabled with zero policies as defense-in-depth. However, the
"RLS enabled but no policies" advisor check flags this as a potential
misconfiguration. Adding explicit always-false policies for the
client-facing roles makes the deny intent unambiguous and ensures
that even if a GRANT is accidentally added later, no rows are
exposed.

## Changes
  - Add four deny-all policies (SELECT, INSERT, UPDATE, DELETE) for
    the `authenticated` role, each with USING/WITH CHECK = false.
  - Add four deny-all policies for the `anon` role.
  - No GRANTs are added — the policies are defense-in-depth only.

## Security impact
  - service_role: unaffected (bypasses RLS)
  - authenticated: explicitly denied all access via policies
  - anon: explicitly denied all access via policies
  - Even with an accidental GRANT, the policies block all rows.
*/

-- ---------------------------------------------------------------------------
-- Deny-all policies for authenticated role
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "deny_select_authenticated" ON sessions;
CREATE POLICY "deny_select_authenticated"
  ON sessions FOR SELECT
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS "deny_insert_authenticated" ON sessions;
CREATE POLICY "deny_insert_authenticated"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "deny_update_authenticated" ON sessions;
CREATE POLICY "deny_update_authenticated"
  ON sessions FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "deny_delete_authenticated" ON sessions;
CREATE POLICY "deny_delete_authenticated"
  ON sessions FOR DELETE
  TO authenticated
  USING (false);

-- ---------------------------------------------------------------------------
-- Deny-all policies for anon role
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "deny_select_anon" ON sessions;
CREATE POLICY "deny_select_anon"
  ON sessions FOR SELECT
  TO anon
  USING (false);

DROP POLICY IF EXISTS "deny_insert_anon" ON sessions;
CREATE POLICY "deny_insert_anon"
  ON sessions FOR INSERT
  TO anon
  WITH CHECK (false);

DROP POLICY IF EXISTS "deny_update_anon" ON sessions;
CREATE POLICY "deny_update_anon"
  ON sessions FOR UPDATE
  TO anon
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "deny_delete_anon" ON sessions;
CREATE POLICY "deny_delete_anon"
  ON sessions FOR DELETE
  TO anon
  USING (false);
