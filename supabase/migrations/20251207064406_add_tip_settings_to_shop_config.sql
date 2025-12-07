/*
  # Add Tip Settings to Shop Configuration

  ## Purpose
  Add fields to store configurable tip presets for online payments (Phase 2 feature).
  These will be used in the booking flow to show tip options when clients pay online.

  ## Changes
  1. New Columns
    - `tip_percentage_presets`: JSONB array of up to 5 tip percentages (e.g., [10, 15, 20, 25])
    - `tip_flat_presets`: JSONB array of up to 5 flat tip amounts in dollars (e.g., [5, 10, 15, 20])
    - `enable_tipping`: Boolean to enable/disable tipping feature (default: true)

  ## Default Values
  - tip_percentage_presets: [15, 18, 20, 25] (common US tipping percentages)
  - tip_flat_presets: [5, 10, 15] (common flat tip amounts)
  - enable_tipping: true

  ## Notes
  - These settings will be exposed in the Owner Settings UI
  - The booking flow will use these when Stripe is fully integrated (Phase 2)
  - Shop owners can customize tip options or disable tipping entirely
*/

-- Add tip settings columns to shop_config table
DO $$
BEGIN
  -- Add tip_percentage_presets column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shop_config' AND column_name = 'tip_percentage_presets'
  ) THEN
    ALTER TABLE shop_config ADD COLUMN tip_percentage_presets JSONB DEFAULT '[15, 18, 20, 25]'::jsonb;
  END IF;

  -- Add tip_flat_presets column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shop_config' AND column_name = 'tip_flat_presets'
  ) THEN
    ALTER TABLE shop_config ADD COLUMN tip_flat_presets JSONB DEFAULT '[5, 10, 15]'::jsonb;
  END IF;

  -- Add enable_tipping column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shop_config' AND column_name = 'enable_tipping'
  ) THEN
    ALTER TABLE shop_config ADD COLUMN enable_tipping BOOLEAN DEFAULT true;
  END IF;
END $$;
