/*
  # Oprava automatického user_id pre planting_plans
  
  1. Problem
    - planting_plans tabuľka nemá trigger na auto-vyplnenie user_id
    - RLS politika INSERT vyžaduje user_id, ktorý je NULL pri vytváraní
    - Existujú duplicitné INSERT politiky
  
  2. Solution
    - Pridať trigger pre auto-vyplnenie user_id
    - Aktualizovať RLS politiky
    - Odstrániť duplicitné politiky
  
  3. Security
    - Každý planting plan bude automaticky priradený k autentifikovanému užívateľovi
    - RLS zabezpečí, že užívatelia vidia iba svoje plány
*/

-- Add trigger for planting_plans
DROP TRIGGER IF EXISTS set_planting_plans_user_id ON planting_plans;
CREATE TRIGGER set_planting_plans_user_id
  BEFORE INSERT ON planting_plans
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- Remove duplicate and overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can insert planting plans" ON planting_plans;
DROP POLICY IF EXISTS "Users can insert own planting plans" ON planting_plans;

-- Create correct INSERT policy that allows COALESCE
CREATE POLICY "Users can insert own planting plans"
  ON planting_plans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));
