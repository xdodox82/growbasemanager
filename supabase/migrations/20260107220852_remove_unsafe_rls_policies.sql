/*
  # Odstránenie nebezpečných RLS politík

  1. Bezpečnostné zmeny
    - Odstránenie politík s USING (true)
    - Tieto politiky umožňujú prístup všetkým autentifikovaným používateľom
    - Nahradené budú reštriktvívnejšími politikami

  2. Odstránené politiky
    - "Authenticated users can update labels" (labels)
    - "Authenticated users can update packagings" (packagings)
    - "Authenticated users can update seeds" (seeds)
    - "Authenticated users can update substrates" (substrates)
*/

-- Odstránenie nebezpečných UPDATE politík
DROP POLICY IF EXISTS "Authenticated users can update labels" ON labels;
DROP POLICY IF EXISTS "Authenticated users can update packagings" ON packagings;
DROP POLICY IF EXISTS "Authenticated users can update seeds" ON seeds;
DROP POLICY IF EXISTS "Authenticated users can update substrates" ON substrates;

-- Odstránenie nebezpečnej SELECT politiky pre customers
DROP POLICY IF EXISTS "Users can view customers based on permission" ON customers;