-- Fix Security Advisor: RLS policies that are always true (permissive).
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0024_permissive_rls_policy
--
-- holidays: restrict INSERT/UPDATE/DELETE to users with role 'admin' or 'super_admin' in public.auth_users.
-- worker_notifications: restrict writes to service_role only; keep SELECT for authenticated.

-- ========== public.holidays ==========
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.holidays;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.holidays;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.holidays;

CREATE POLICY "Allow delete for admins"
  ON public.holidays FOR DELETE TO authenticated
  USING (
    (SELECT role FROM public.auth_users WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

CREATE POLICY "Allow insert for admins"
  ON public.holidays FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM public.auth_users WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

CREATE POLICY "Allow update for admins"
  ON public.holidays FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM public.auth_users WHERE id = auth.uid()) IN ('admin', 'super_admin')
  )
  WITH CHECK (
    (SELECT role FROM public.auth_users WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

-- ========== public.worker_notifications ==========
-- Replace permissive "Allow all operations from API" with role-based policies.
DROP POLICY IF EXISTS "Allow all operations from API" ON public.worker_notifications;

-- SELECT: allowed for authenticated (worker dashboard, etc.). Allowed by Security Advisor.
CREATE POLICY "Allow read for authenticated"
  ON public.worker_notifications FOR SELECT TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE: only admins (and service_role). API/server can use supabaseAdmin for writes.
CREATE POLICY "Allow insert for admins"
  ON public.worker_notifications FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM public.auth_users WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

CREATE POLICY "Allow update for admins"
  ON public.worker_notifications FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM public.auth_users WHERE id = auth.uid()) IN ('admin', 'super_admin')
  )
  WITH CHECK (
    (SELECT role FROM public.auth_users WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

CREATE POLICY "Allow delete for admins"
  ON public.worker_notifications FOR DELETE TO authenticated
  USING (
    (SELECT role FROM public.auth_users WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );
