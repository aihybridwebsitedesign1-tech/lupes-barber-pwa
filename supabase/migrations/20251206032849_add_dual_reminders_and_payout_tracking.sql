/*
  # Add Dual SMS Reminders and Enhanced Payout Tracking

  1. Changes to shop_config
    - Add `reminder_hours_before_secondary` (nullable integer)
    - Allows owners to configure two reminder times (e.g., 24h and 1h before appointment)
    - If null, only primary reminder is sent

  2. Changes to appointment_reminders_sent
    - Add `reminder_offset_hours` column to track which reminder offset was sent
    - Prevents duplicate reminders at the same offset
    - Supports idempotent reminder processing

  3. Security
    - No RLS changes needed (existing policies apply)
*/

-- Add secondary reminder hours to shop_config
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shop_config' AND column_name = 'reminder_hours_before_secondary'
  ) THEN
    ALTER TABLE shop_config ADD COLUMN reminder_hours_before_secondary integer DEFAULT NULL;
  END IF;
END $$;

-- Add reminder offset tracking to appointment_reminders_sent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointment_reminders_sent' AND column_name = 'reminder_offset_hours'
  ) THEN
    ALTER TABLE appointment_reminders_sent ADD COLUMN reminder_offset_hours integer DEFAULT 24;
  END IF;
END $$;

-- Update the unique constraint to include reminder_offset_hours
-- This allows multiple reminders per appointment (one for each offset)
DO $$
BEGIN
  -- Drop old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointment_reminders_sent_appointment_id_key'
  ) THEN
    ALTER TABLE appointment_reminders_sent DROP CONSTRAINT appointment_reminders_sent_appointment_id_key;
  END IF;

  -- Add new composite unique constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointment_reminders_sent_appointment_offset_key'
  ) THEN
    ALTER TABLE appointment_reminders_sent
    ADD CONSTRAINT appointment_reminders_sent_appointment_offset_key
    UNIQUE (appointment_id, reminder_offset_hours);
  END IF;
END $$;
