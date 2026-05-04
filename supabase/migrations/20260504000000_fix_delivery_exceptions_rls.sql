/*
  # Fix permissive RLS policy on delivery_exceptions

  1. Security changes
    - Drop USING (true) policy that allows any authenticated user to see all rows
    - Replace with user-scoped policies matching the pattern from other tables
    - SELECT/INSERT/UPDATE/DELETE all require auth.uid() = user_id
*/

-- Drop the permissive catch-all policy
DROP POLICY IF EXISTS "Authenticated users can manage delivery exceptions" ON public.delivery_exceptions;

-- SELECT: own records only
CREATE POLICY "Users can view own delivery exceptions"
  ON public.delivery_exceptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: auto-assign user_id to current user
CREATE POLICY "Users can insert own delivery exceptions"
  ON public.delivery_exceptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: own records only
CREATE POLICY "Users can update own delivery exceptions"
  ON public.delivery_exceptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: own records or admin
CREATE POLICY "Users can delete own delivery exceptions"
  ON public.delivery_exceptions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Ensure user_id defaults to current user on insert
ALTER TABLE public.delivery_exceptions
  ALTER COLUMN user_id SET DEFAULT auth.uid();
