/*
  # Add inventory_processed flag to appointments

  1. Changes
    - Add `inventory_processed` boolean field to appointments table
    - Defaults to false
    - Used to ensure inventory transactions are idempotent (no double-decrement)

  2. Security
    - No RLS changes needed (inherits from appointments table)
*/

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS inventory_processed boolean DEFAULT false;

-- Create index for queries that check inventory processing status
CREATE INDEX IF NOT EXISTS idx_appointments_inventory_processed ON appointments(inventory_processed);
