/*
  # Vytvorenie rozvozových trás
  
  1. Purpose
    - Vytvoriť 2 rozvozové trasy s pôvodnými ID
    - Priradiť zákazníkov cez customer_ids array
  
  2. Routes
    - Trasa 1: Popradská oblasť (Kravany, Poprad Veľka)
    - Trasa 2: Prešovský región (Nábrežná, Spiš)
*/

DO $$ 
DECLARE
  v_user_id UUID := '538cadcd-150b-45e2-8b5b-8576884f8049';
BEGIN
  -- Vytvorenie rozvozových trás
  INSERT INTO delivery_routes (id, name, delivery_day_id, customer_ids, created_at, user_id) VALUES
  (
    '1d2769c8-b665-4c39-a272-8d573b4e1375', 
    'Popradská oblasť', 
    NULL,
    ARRAY[
      '6c44045c-1bd8-4b7e-bea8-8e8b84d49924'::uuid,  -- Ján Zeman (Kravany)
      '617b48d5-4b15-4c9f-84d9-35118971e9d3'::uuid   -- Marián Mereš (Poprad Veľka)
    ]::uuid[],
    '2025-12-28T00:00:00+00:00', 
    v_user_id
  ),
  (
    'bcaff252-1b9d-489d-96db-d24b08b6bc3e', 
    'Prešovský región', 
    NULL,
    ARRAY[
      '4b586b6b-d746-4607-8c60-ceefd479598a'::uuid,  -- Jozef Polomský (Nábrežná)
      '92f11cc1-46c5-4632-bfc3-98ff197a2288'::uuid   -- Ján Richnavský (Spiš)
    ]::uuid[],
    '2025-12-28T00:00:00+00:00', 
    v_user_id
  )
  ON CONFLICT (id) DO UPDATE SET
    customer_ids = EXCLUDED.customer_ids,
    user_id = EXCLUDED.user_id;

  -- Aktualizácia zákazníkov s delivery_route_id
  UPDATE customers 
  SET delivery_route_id = '1d2769c8-b665-4c39-a272-8d573b4e1375'
  WHERE id IN (
    '6c44045c-1bd8-4b7e-bea8-8e8b84d49924',
    '617b48d5-4b15-4c9f-84d9-35118971e9d3'
  );

  UPDATE customers 
  SET delivery_route_id = 'bcaff252-1b9d-489d-96db-d24b08b6bc3e'
  WHERE id IN (
    '4b586b6b-d746-4607-8c60-ceefd479598a',
    '92f11cc1-46c5-4632-bfc3-98ff197a2288'
  );

  RAISE NOTICE 'Created 2 delivery routes with customer assignments';
END $$;
