/*
  # Operations Sprint: Per-Barber Rules, Payouts, Time Tracking

  ## Overview
  This migration adds final operational features for Lupe's Barber:
  - Per-barber booking rule overrides
  - Manual payout tracking
  - Time clock in/out system

  ## 1. Per-Barber Booking Rules
  Add override fields to users table for barbers:
  - min_hours_before_booking_override (nullable integer)
  - min_hours_before_cancellation_override (nullable integer)
  - booking_interval_minutes_override (nullable integer)
  
  When set, these override the shop_config defaults for that specific barber.

  ## 2. Payouts Table
  Create payouts table to track when owner pays barbers:
  - id, barber_id, amount, method, date_paid, notes, created_at
  - Method can be: Cash, Zelle, Venmo, Check, Other
  - Links to barber (user) with foreign key

  ## 3. Time Tracking
  Create barber_time_entries table for clock in/out:
  - id, barber_id, entry_type, timestamp, note, created_at
  - Entry types: clock_in, clock_out, break_start, break_end
  - Tracks when barbers start/end work and breaks

  ## Security
  - All tables have RLS enabled
  - Authenticated users can read/write (fine-grained permissions handled in app layer)
*/

-- =====================================================
-- 1. PER-BARBER BOOKING RULE OVERRIDES
-- =====================================================

-- Add booking rule override fields to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS min_hours_before_booking_override integer,
  ADD COLUMN IF NOT EXISTS min_hours_before_cancellation_override integer,
  ADD COLUMN IF NOT EXISTS booking_interval_minutes_override integer;

COMMENT ON COLUMN users.min_hours_before_booking_override IS 'Per-barber override for minimum hours before booking (overrides shop_config.min_book_ahead_hours)';
COMMENT ON COLUMN users.min_hours_before_cancellation_override IS 'Per-barber override for minimum hours before cancellation (overrides shop_config.min_cancel_ahead_hours)';
COMMENT ON COLUMN users.booking_interval_minutes_override IS 'Per-barber override for booking interval minutes (overrides shop_config client/barber_booking_interval_minutes)';

-- =====================================================
-- 2. PAYOUTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount >= 0),
  method text NOT NULL CHECK (method IN ('Cash', 'Zelle', 'Venmo', 'Check', 'Other')),
  date_paid date NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS and add policies
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read payouts"
  ON payouts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert payouts"
  ON payouts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update payouts"
  ON payouts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete payouts"
  ON payouts FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payouts_barber_id ON payouts(barber_id);
CREATE INDEX IF NOT EXISTS idx_payouts_date_paid ON payouts(date_paid DESC);

-- =====================================================
-- 3. TIME TRACKING TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS barber_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_type text NOT NULL CHECK (entry_type IN ('clock_in', 'clock_out', 'break_start', 'break_end')),
  timestamp timestamptz NOT NULL DEFAULT now(),
  note text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS and add policies
ALTER TABLE barber_time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read time entries"
  ON barber_time_entries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert time entries"
  ON barber_time_entries FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update time entries"
  ON barber_time_entries FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete time entries"
  ON barber_time_entries FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_barber_time_entries_barber_id ON barber_time_entries(barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_time_entries_timestamp ON barber_time_entries(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_barber_time_entries_entry_type ON barber_time_entries(entry_type);
