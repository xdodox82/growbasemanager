/*
  # Add comprehensive worker permissions

  1. Changes
    - Add all menu item permissions to worker_permissions table
    - Dashboard, all navigation items, costs, inventory, reports, settings
    - All fields are boolean with default false for security
  
  2. Purpose
    - Allow granular control over what workers can see
    - Admin can toggle access to each menu item individually
*/

DO $$
BEGIN
  -- Dashboard
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'worker_permissions' AND column_name = 'can_view_dashboard'
  ) THEN
    ALTER TABLE worker_permissions ADD COLUMN can_view_dashboard boolean DEFAULT true;
  END IF;

  -- Crops
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'worker_permissions' AND column_name = 'can_view_crops'
  ) THEN
    ALTER TABLE worker_permissions ADD COLUMN can_view_crops boolean DEFAULT true;
  END IF;

  -- Blends
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'worker_permissions' AND column_name = 'can_view_blends'
  ) THEN
    ALTER TABLE worker_permissions ADD COLUMN can_view_blends boolean DEFAULT true;
  END IF;

  -- Prep Planting
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'worker_permissions' AND column_name = 'can_view_prep_planting'
  ) THEN
    ALTER TABLE worker_permissions ADD COLUMN can_view_prep_planting boolean DEFAULT true;
  END IF;

  -- Prep Packaging
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'worker_permissions' AND column_name = 'can_view_prep_packaging'
  ) THEN
    ALTER TABLE worker_permissions ADD COLUMN can_view_prep_packaging boolean DEFAULT true;
  END IF;

  -- Balenie
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'worker_permissions' AND column_name = 'can_view_balenie'
  ) THEN
    ALTER TABLE worker_permissions ADD COLUMN can_view_balenie boolean DEFAULT true;
  END IF;

  -- Calendar
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'worker_permissions' AND column_name = 'can_view_calendar'
  ) THEN
    ALTER TABLE worker_permissions ADD COLUMN can_view_calendar boolean DEFAULT true;
  END IF;

  -- Costs - Fuel
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'worker_permissions' AND column_name = 'can_view_costs_fuel'
  ) THEN
    ALTER TABLE worker_permissions ADD COLUMN can_view_costs_fuel boolean DEFAULT false;
  END IF;

  -- Costs - AdBlue
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'worker_permissions' AND column_name = 'can_view_costs_adblue'
  ) THEN
    ALTER TABLE worker_permissions ADD COLUMN can_view_costs_adblue boolean DEFAULT false;
  END IF;

  -- Costs - Water
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'worker_permissions' AND column_name = 'can_view_costs_water'
  ) THEN
    ALTER TABLE worker_permissions ADD COLUMN can_view_costs_water boolean DEFAULT false;
  END IF;

  -- Costs - Electricity
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'worker_permissions' AND column_name = 'can_view_costs_electricity'
  ) THEN
    ALTER TABLE worker_permissions ADD COLUMN can_view_costs_electricity boolean DEFAULT false;
  END IF;

  -- Costs - Other
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'worker_permissions' AND column_name = 'can_view_costs_other'
  ) THEN
    ALTER TABLE worker_permissions ADD COLUMN can_view_costs_other boolean DEFAULT false;
  END IF;

  -- Seeds
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'worker_permissions' AND column_name = 'can_view_seeds'
  ) THEN
    ALTER TABLE worker_permissions ADD COLUMN can_view_seeds boolean DEFAULT true;
  END IF;

  -- Packaging
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'worker_permissions' AND column_name = 'can_view_packaging'
  ) THEN
    ALTER TABLE worker_permissions ADD COLUMN can_view_packaging boolean DEFAULT true;
  END IF;

  -- Substrate
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'worker_permissions' AND column_name = 'can_view_substrate'
  ) THEN
    ALTER TABLE worker_permissions ADD COLUMN can_view_substrate boolean DEFAULT true;
  END IF;

  -- Labels
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'worker_permissions' AND column_name = 'can_view_labels'
  ) THEN
    ALTER TABLE worker_permissions ADD COLUMN can_view_labels boolean DEFAULT true;
  END IF;

  -- Consumables
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'worker_permissions' AND column_name = 'can_view_consumables'
  ) THEN
    ALTER TABLE worker_permissions ADD COLUMN can_view_consumables boolean DEFAULT true;
  END IF;

  -- Reports
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'worker_permissions' AND column_name = 'can_view_reports'
  ) THEN
    ALTER TABLE worker_permissions ADD COLUMN can_view_reports boolean DEFAULT false;
  END IF;

  -- Settings
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'worker_permissions' AND column_name = 'can_view_settings'
  ) THEN
    ALTER TABLE worker_permissions ADD COLUMN can_view_settings boolean DEFAULT false;
  END IF;
END $$;
