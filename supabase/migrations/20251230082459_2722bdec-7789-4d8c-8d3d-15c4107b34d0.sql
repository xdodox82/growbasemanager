-- Fix: Restrict customer data access to admins only
-- Currently all authenticated users can view all customer sensitive data

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;

-- Create new policy that restricts SELECT to admins only
CREATE POLICY "Admins can view customers"
ON public.customers
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Also restrict INSERT to admins only (currently allows all authenticated users)
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON public.customers;

CREATE POLICY "Admins can insert customers"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));