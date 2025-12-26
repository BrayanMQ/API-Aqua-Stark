-- Enable Row-Level Security (RLS) on sync_queue table
-- This migration implements RLS policies for the sync_queue table to restrict access to backend only
-- Note: Backend uses service_role which bypasses RLS, so these policies protect against accidental anon key usage
-- This table is internal system data and must NOT be accessible via public or authenticated roles

-- Enable RLS if not already enabled
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Deny all public access to sync_queue" ON sync_queue;
DROP POLICY IF EXISTS "Deny all public insert to sync_queue" ON sync_queue;
DROP POLICY IF EXISTS "Deny all public update to sync_queue" ON sync_queue;
DROP POLICY IF EXISTS "Deny all public delete to sync_queue" ON sync_queue;
DROP POLICY IF EXISTS "Deny all authenticated access to sync_queue" ON sync_queue;

-- SELECT Policy: Deny all public access
-- This policy explicitly denies SELECT operations for public role
-- service_role bypasses RLS, so backend access continues to work
CREATE POLICY "Deny all public access to sync_queue"
ON sync_queue
FOR SELECT
TO public
USING (false);

-- INSERT Policy: Deny all public access
-- This policy explicitly denies INSERT operations for public role
-- service_role bypasses RLS, so backend access continues to work
CREATE POLICY "Deny all public insert to sync_queue"
ON sync_queue
FOR INSERT
TO public
WITH CHECK (false);

-- UPDATE Policy: Deny all public access
-- This policy explicitly denies UPDATE operations for public role
-- service_role bypasses RLS, so backend access continues to work
CREATE POLICY "Deny all public update to sync_queue"
ON sync_queue
FOR UPDATE
TO public
USING (false)
WITH CHECK (false);

-- DELETE Policy: Deny all public access
-- This policy explicitly denies DELETE operations for public role
-- service_role bypasses RLS, so backend access continues to work
CREATE POLICY "Deny all public delete to sync_queue"
ON sync_queue
FOR DELETE
TO public
USING (false);

-- Also deny access for authenticated role (defense in depth)
-- Even though we don't use Supabase Auth, this prevents future accidental access
CREATE POLICY "Deny all authenticated access to sync_queue"
ON sync_queue
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- Add comment documenting RLS policies
COMMENT ON TABLE sync_queue IS 'RLS enabled: Backend-only access. All public and authenticated access denied. Backend uses service_role which bypasses RLS.';

