/*
  # Add Test Mode Support

  1. Overview
    Adds test mode functionality to allow shop owners to safely test the system
    without affecting real client data or sending actual SMS/payments.

  2. Changes to shop_config
    - Add `test_mode_enabled` boolean flag to enable/disable test mode
    - When enabled: SMS not sent, payments forced to "pay in shop", test appointments marked

  3. Changes to appointments
    - Add `is_test` boolean flag to mark test appointments
    - Test appointments can be bulk-deleted without affecting real client data

  4. Changes to booking_reminders
    - Add `sent_test` status option for reminders created in test mode

  5. Security
    - Only shop owners can toggle test mode
    - Test appointments clearly labeled in UI
*/

-- Add test_mode_enabled to shop_config
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shop_config' AND column_name = 'test_mode_enabled'
  ) THEN
    ALTER TABLE shop_config ADD COLUMN test_mode_enabled boolean DEFAULT false;
  END IF;
END $$;

-- Add is_test flag to appointments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'is_test'
  ) THEN
    ALTER TABLE appointments ADD COLUMN is_test boolean DEFAULT false;
  END IF;
END $$;

-- Update booking_reminders status enum to include sent_test
DO $$
BEGIN
  -- Check if the type exists and add the new value if needed
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reminder_status') THEN
    -- Add sent_test to the enum if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumtypid = 'reminder_status'::regtype
      AND enumlabel = 'sent_test'
    ) THEN
      ALTER TYPE reminder_status ADD VALUE 'sent_test';
    END IF;
  END IF;
END $$;

-- Add comment explaining test mode usage
COMMENT ON COLUMN shop_config.test_mode_enabled IS 'When true, SMS are not sent, payments forced to in-shop, and new bookings marked as test data';
COMMENT ON COLUMN appointments.is_test IS 'Marks appointment as test data for safe deletion without affecting real client records';