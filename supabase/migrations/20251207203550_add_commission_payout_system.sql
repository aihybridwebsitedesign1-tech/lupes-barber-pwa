/*
  # Commission-Based Payout System

  1. Commission Rates on Barbers
    - Add `service_commission_rate` (default 50%)
    - Add `product_commission_rate` (default 10%)
    - Add `tip_commission_rate` (default 100%)

  2. Commission Tracking on Transactions
    - Add `commission_paid` boolean to appointments
    - Add `payout_id` to appointments
    - Add `commission_paid` boolean to inventory_transactions
    - Add `payout_id` to inventory_transactions

  3. Enhanced Payouts Table
    - Add `start_date` and `end_date` for payout period
    - Add `calculated_amount` vs `actual_amount_paid`
    - Add `override_flag` and `override_note`
    - Add `calculation_breakdown` JSON field
    - Rename `method` to `payment_method` for consistency
    - Add `updated_at` timestamp

  4. Payout Items Linking Table
    - Creates `payout_items` for detailed commission tracking
    - Links individual appointments/sales to payouts

  5. Security
    - RLS policies for owner-only access to payouts
    - Read-only access for barbers to their own payouts
*/

-- 1. Add commission rate fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS service_commission_rate DECIMAL(5,4) DEFAULT 0.5000,
ADD COLUMN IF NOT EXISTS product_commission_rate DECIMAL(5,4) DEFAULT 0.1000,
ADD COLUMN IF NOT EXISTS tip_commission_rate DECIMAL(5,4) DEFAULT 1.0000;

COMMENT ON COLUMN users.service_commission_rate IS 'Commission rate for services (0.5000 = 50%)';
COMMENT ON COLUMN users.product_commission_rate IS 'Commission rate for product sales (0.1000 = 10%)';
COMMENT ON COLUMN users.tip_commission_rate IS 'Commission rate for tips (1.0000 = 100%)';

-- 2. Add commission tracking to appointments
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS commission_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payout_id UUID REFERENCES payouts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_commission_paid ON appointments(commission_paid) WHERE commission_paid = false;
CREATE INDEX IF NOT EXISTS idx_appointments_payout_id ON appointments(payout_id);

-- 3. Add commission tracking to inventory_transactions (for product sales)
ALTER TABLE inventory_transactions
ADD COLUMN IF NOT EXISTS commission_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payout_id UUID REFERENCES payouts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_commission_paid 
  ON inventory_transactions(commission_paid) WHERE commission_paid = false AND type = 'sale';
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_payout_id ON inventory_transactions(payout_id);

-- 4. Enhance payouts table (preserve existing data)
DO $$
BEGIN
  -- Add start_date if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payouts' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE payouts ADD COLUMN start_date DATE NOT NULL DEFAULT CURRENT_DATE;
    ALTER TABLE payouts ALTER COLUMN start_date DROP DEFAULT;
  END IF;

  -- Add end_date if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payouts' AND column_name = 'end_date'
  ) THEN
    ALTER TABLE payouts ADD COLUMN end_date DATE NOT NULL DEFAULT CURRENT_DATE;
    ALTER TABLE payouts ALTER COLUMN end_date DROP DEFAULT;
  END IF;

  -- Add calculated_amount if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payouts' AND column_name = 'calculated_amount'
  ) THEN
    ALTER TABLE payouts ADD COLUMN calculated_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
  END IF;

  -- Rename amount to actual_amount_paid if not already done
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payouts' AND column_name = 'amount'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payouts' AND column_name = 'actual_amount_paid'
  ) THEN
    ALTER TABLE payouts RENAME COLUMN amount TO actual_amount_paid;
  END IF;

  -- Add override fields if not exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payouts' AND column_name = 'override_flag'
  ) THEN
    ALTER TABLE payouts ADD COLUMN override_flag BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payouts' AND column_name = 'override_note'
  ) THEN
    ALTER TABLE payouts ADD COLUMN override_note TEXT;
  END IF;

  -- Rename method to payment_method if not already done
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payouts' AND column_name = 'method'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payouts' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE payouts RENAME COLUMN method TO payment_method;
  END IF;

  -- Add calculation_breakdown if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payouts' AND column_name = 'calculation_breakdown'
  ) THEN
    ALTER TABLE payouts ADD COLUMN calculation_breakdown JSONB;
  END IF;

  -- Add updated_at if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payouts' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE payouts ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN payouts.start_date IS 'Start date of payout period (inclusive)';
COMMENT ON COLUMN payouts.end_date IS 'End date of payout period (inclusive)';
COMMENT ON COLUMN payouts.calculated_amount IS 'Auto-calculated commission amount';
COMMENT ON COLUMN payouts.actual_amount_paid IS 'Actual amount paid to barber';
COMMENT ON COLUMN payouts.override_flag IS 'True if actual differs from calculated';
COMMENT ON COLUMN payouts.override_note IS 'Required explanation when override_flag is true';
COMMENT ON COLUMN payouts.calculation_breakdown IS 'JSON breakdown of services/products/tips';

-- Add constraint: override_note required when override_flag is true
ALTER TABLE payouts DROP CONSTRAINT IF EXISTS payouts_override_note_required;
ALTER TABLE payouts ADD CONSTRAINT payouts_override_note_required
  CHECK (
    (override_flag = false) OR 
    (override_flag = true AND override_note IS NOT NULL AND LENGTH(TRIM(override_note)) > 0)
  );

-- Add indexes for date range queries
CREATE INDEX IF NOT EXISTS idx_payouts_barber_dates ON payouts(barber_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_payouts_date_range ON payouts(start_date, end_date);

-- 5. Create payout_items linking table
CREATE TABLE IF NOT EXISTS payout_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id UUID NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  inventory_transaction_id UUID REFERENCES inventory_transactions(id) ON DELETE SET NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('service', 'product', 'tip')),
  revenue_amount NUMERIC(10,2) NOT NULL,
  commission_rate DECIMAL(5,4) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT payout_items_one_reference CHECK (
    (appointment_id IS NOT NULL AND inventory_transaction_id IS NULL) OR
    (appointment_id IS NULL AND inventory_transaction_id IS NOT NULL)
  )
);

COMMENT ON TABLE payout_items IS 'Links individual commission items to payouts';
COMMENT ON COLUMN payout_items.item_type IS 'Type: service, product, or tip';
COMMENT ON COLUMN payout_items.revenue_amount IS 'Base revenue amount before commission';
COMMENT ON COLUMN payout_items.commission_rate IS 'Rate applied (e.g., 0.5000 = 50%)';
COMMENT ON COLUMN payout_items.commission_amount IS 'Calculated commission for this item';

CREATE INDEX IF NOT EXISTS idx_payout_items_payout_id ON payout_items(payout_id);
CREATE INDEX IF NOT EXISTS idx_payout_items_appointment_id ON payout_items(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payout_items_inventory_id ON payout_items(inventory_transaction_id);

-- 6. RLS Policies

-- Payouts: Owner full access, barbers read their own
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can manage all payouts" ON payouts;
CREATE POLICY "Owners can manage all payouts"
  ON payouts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'OWNER'
    )
  );

DROP POLICY IF EXISTS "Barbers can view their own payouts" ON payouts;
CREATE POLICY "Barbers can view their own payouts"
  ON payouts
  FOR SELECT
  TO authenticated
  USING (barber_id = auth.uid());

-- Payout Items: Same access as payouts
ALTER TABLE payout_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can manage all payout items" ON payout_items;
CREATE POLICY "Owners can manage all payout items"
  ON payout_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'OWNER'
    )
  );

DROP POLICY IF EXISTS "Barbers can view their own payout items" ON payout_items;
CREATE POLICY "Barbers can view their own payout items"
  ON payout_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM payouts 
      WHERE payouts.id = payout_items.payout_id 
      AND payouts.barber_id = auth.uid()
    )
  );

-- 7. Update trigger for payouts
CREATE OR REPLACE FUNCTION update_payouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_payouts_updated_at ON payouts;
CREATE TRIGGER trigger_update_payouts_updated_at
  BEFORE UPDATE ON payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_payouts_updated_at();
