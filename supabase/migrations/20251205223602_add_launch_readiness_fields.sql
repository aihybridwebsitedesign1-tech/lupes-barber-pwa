/*
  # Launch Readiness: Add Payment, Policy, and Commission Fields

  1. Payment Fields for Stripe Integration
    - `appointments.payment_status` - Track payment state (unpaid, paid, refunded, partial)
    - `appointments.payment_provider` - Payment method (stripe, cash, card, null)
    - `appointments.stripe_session_id` - Stripe Checkout Session ID
    - `appointments.stripe_payment_intent_id` - Stripe Payment Intent ID
    - `appointments.amount_due` - Total amount owed for this appointment
    - `appointments.amount_paid` - Amount actually paid

  2. Policy & Fee Configuration
    - `shop_config.default_commission_rate` - Default commission rate (0.50 = 50%)
    - `shop_config.no_show_fee_amount` - Fee charged for no-shows
    - `shop_config.late_cancel_fee_amount` - Fee charged for late cancellations
    - `shop_config.apply_fees_automatically` - Whether fees apply automatically
    - Add 'late_cancel' to appointments.status enum

  3. Commission Overrides
    - `users.commission_rate_override` - Per-barber commission rate override

  4. Security
    - All existing RLS policies remain unchanged
    - New fields are accessible with existing role-based policies
*/

-- Add late_cancel status to appointments
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'appointments' AND constraint_name = 'appointments_status_check'
  ) THEN
    ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
  END IF;
END $$;

ALTER TABLE appointments ADD CONSTRAINT appointments_status_check 
  CHECK (status = ANY (ARRAY['booked'::text, 'completed'::text, 'no_show'::text, 'cancelled'::text, 'late_cancel'::text]));

-- Add payment fields to appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid' 
  CHECK (payment_status IN ('unpaid', 'paid', 'refunded', 'partial'));

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_provider text;

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS stripe_session_id text;

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS amount_due numeric DEFAULT 0;

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS amount_paid numeric DEFAULT 0;

COMMENT ON COLUMN appointments.payment_status IS 'Payment status: unpaid, paid, refunded, partial';
COMMENT ON COLUMN appointments.payment_provider IS 'Payment provider: stripe, cash, card, or null for unpaid';
COMMENT ON COLUMN appointments.stripe_session_id IS 'Stripe Checkout Session ID for online payments';
COMMENT ON COLUMN appointments.stripe_payment_intent_id IS 'Stripe Payment Intent ID';
COMMENT ON COLUMN appointments.amount_due IS 'Total amount owed for this appointment';
COMMENT ON COLUMN appointments.amount_paid IS 'Amount actually paid';

-- Add policy and commission fields to shop_config
ALTER TABLE shop_config ADD COLUMN IF NOT EXISTS default_commission_rate numeric DEFAULT 0.50;

ALTER TABLE shop_config ADD COLUMN IF NOT EXISTS no_show_fee_amount numeric DEFAULT 0;

ALTER TABLE shop_config ADD COLUMN IF NOT EXISTS late_cancel_fee_amount numeric DEFAULT 0;

ALTER TABLE shop_config ADD COLUMN IF NOT EXISTS apply_fees_automatically boolean DEFAULT false;

COMMENT ON COLUMN shop_config.default_commission_rate IS 'Default commission rate for barbers (0.50 = 50%)';
COMMENT ON COLUMN shop_config.no_show_fee_amount IS 'Fee charged for no-show appointments';
COMMENT ON COLUMN shop_config.late_cancel_fee_amount IS 'Fee charged for late cancellations';
COMMENT ON COLUMN shop_config.apply_fees_automatically IS 'Whether to automatically apply no-show/late-cancel fees';

-- Add commission override to users (barbers)
ALTER TABLE users ADD COLUMN IF NOT EXISTS commission_rate_override numeric;

COMMENT ON COLUMN users.commission_rate_override IS 'Per-barber commission rate override (overrides shop default if set)';

-- Update existing appointments to have default payment fields
UPDATE appointments 
SET 
  payment_status = 'unpaid',
  amount_due = COALESCE(total_charged, services_total + products_total),
  amount_paid = CASE 
    WHEN paid_at IS NOT NULL THEN COALESCE(total_charged, services_total + products_total)
    ELSE 0 
  END
WHERE payment_status IS NULL;

-- Set payment_status to 'paid' for completed appointments with paid_at
UPDATE appointments
SET 
  payment_status = 'paid',
  payment_provider = COALESCE(payment_method, 'cash')
WHERE status = 'completed' 
  AND paid_at IS NOT NULL 
  AND payment_status = 'unpaid';
