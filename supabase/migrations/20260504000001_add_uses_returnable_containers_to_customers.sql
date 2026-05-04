/*
  # Add uses_returnable_containers to customers

  1. Changes
    - Add `uses_returnable_containers` BOOLEAN DEFAULT false to customers table
    - Indicates if the customer uses returnable/reusable containers instead of disposable packaging
*/

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS uses_returnable_containers BOOLEAN NOT NULL DEFAULT false;
