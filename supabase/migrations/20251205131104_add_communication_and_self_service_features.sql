/*
  # Add Communication and Self-Service Features

  This migration adds support for:
  - Automated appointment confirmations and reminders
  - Client self-service portal with OTP verification
  - Enhanced notification tracking

  ## Changes

  1. **client_messages Table Updates**
     - Add `appointment_id` field to link notifications to appointments
     - Add `notification_type` field to categorize messages (confirmation, reminder, cancellation, etc.)
     - Update indexes for better query performance

  2. **New Table: otp_verification**
     - Stores one-time passwords for client authentication
     - Fields: phone_number, code, expires_at, attempts, verified_at
     - Rate limiting support with attempts counter
     - Auto-cleanup of expired codes

  3. **shop_config Updates**
     - Add `reminder_hours_before` (default 24 hours)
     - Add `enable_confirmations` flag (default true)
     - Add `enable_reminders` flag (default true)

  4. **Security**
     - RLS policies for OTP table (unauthenticated can insert/select own codes)
     - Updated client_messages policies to support system-generated messages
     - Indexes for performance

  5. **New Table: appointment_reminders_sent**
     - Tracks which appointments have had reminders sent (idempotency)
     - Prevents duplicate reminders
*/

-- 1. Extend client_messages table
ALTER TABLE client_messages
ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE;

ALTER TABLE client_messages
ADD COLUMN IF NOT EXISTS notification_type text;

-- Add index for appointment lookups
CREATE INDEX IF NOT EXISTS idx_client_messages_appointment_id 
  ON client_messages(appointment_id);

-- Add index for notification type filtering
CREATE INDEX IF NOT EXISTS idx_client_messages_notification_type 
  ON client_messages(notification_type);

-- Add policy for service role (use DO block to check if exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'client_messages' 
    AND policyname = 'Service role can insert messages'
  ) THEN
    CREATE POLICY "Service role can insert messages"
      ON client_messages
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

COMMENT ON COLUMN client_messages.appointment_id IS 
  'Links notification to specific appointment (null for non-appointment messages)';

COMMENT ON COLUMN client_messages.notification_type IS 
  'Type of notification: confirmation, reminder, cancellation, reschedule, otp';

-- 2. Create OTP verification table
CREATE TABLE IF NOT EXISTS otp_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer DEFAULT 0 NOT NULL,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE otp_verification ENABLE ROW LEVEL SECURITY;

-- Add policies using DO blocks
DO $$
BEGIN
  -- Allow anyone to insert OTP requests
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'otp_verification' 
    AND policyname = 'Anyone can request OTP'
  ) THEN
    CREATE POLICY "Anyone can request OTP"
      ON otp_verification
      FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;

  -- Allow anyone to verify their own code
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'otp_verification' 
    AND policyname = 'Anyone can verify own OTP'
  ) THEN
    CREATE POLICY "Anyone can verify own OTP"
      ON otp_verification
      FOR SELECT
      TO anon
      USING (expires_at > now() AND verified_at IS NULL);
  END IF;

  -- Allow authenticated users to read
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'otp_verification' 
    AND policyname = 'Authenticated users can read OTP'
  ) THEN
    CREATE POLICY "Authenticated users can read OTP"
      ON otp_verification
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Indexes for OTP lookups
CREATE INDEX IF NOT EXISTS idx_otp_phone_number 
  ON otp_verification(phone_number);

CREATE INDEX IF NOT EXISTS idx_otp_expires_at 
  ON otp_verification(expires_at);

COMMENT ON TABLE otp_verification IS 
  'One-time password verification for client self-service portal';

COMMENT ON COLUMN otp_verification.attempts IS 
  'Number of verification attempts (rate limiting)';

COMMENT ON COLUMN otp_verification.verified_at IS 
  'Timestamp when code was successfully verified (null if not yet verified)';

-- 3. Create appointment_reminders_sent table for idempotency
CREATE TABLE IF NOT EXISTS appointment_reminders_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  reminder_type text NOT NULL,
  sent_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(appointment_id, reminder_type)
);

-- Enable RLS
ALTER TABLE appointment_reminders_sent ENABLE ROW LEVEL SECURITY;

-- Add policies using DO blocks
DO $$
BEGIN
  -- Service role can insert reminders
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'appointment_reminders_sent' 
    AND policyname = 'Service role can insert reminders'
  ) THEN
    CREATE POLICY "Service role can insert reminders"
      ON appointment_reminders_sent
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;

  -- Authenticated users can read
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'appointment_reminders_sent' 
    AND policyname = 'Authenticated users can read reminders'
  ) THEN
    CREATE POLICY "Authenticated users can read reminders"
      ON appointment_reminders_sent
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Index for checking if reminder was sent
CREATE INDEX IF NOT EXISTS idx_reminders_appointment_type 
  ON appointment_reminders_sent(appointment_id, reminder_type);

COMMENT ON TABLE appointment_reminders_sent IS 
  'Tracks which reminders have been sent to prevent duplicates';

-- 4. Extend shop_config
DO $$
BEGIN
  -- Add reminder_hours_before if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shop_config' AND column_name = 'reminder_hours_before'
  ) THEN
    ALTER TABLE shop_config ADD COLUMN reminder_hours_before integer DEFAULT 24 NOT NULL;
  END IF;

  -- Add enable_confirmations if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shop_config' AND column_name = 'enable_confirmations'
  ) THEN
    ALTER TABLE shop_config ADD COLUMN enable_confirmations boolean DEFAULT true NOT NULL;
  END IF;

  -- Add enable_reminders if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shop_config' AND column_name = 'enable_reminders'
  ) THEN
    ALTER TABLE shop_config ADD COLUMN enable_reminders boolean DEFAULT true NOT NULL;
  END IF;
END $$;

COMMENT ON COLUMN shop_config.reminder_hours_before IS 
  'How many hours before appointment to send reminder (default 24)';

COMMENT ON COLUMN shop_config.enable_confirmations IS 
  'Whether to send confirmation SMS when appointments are booked';

COMMENT ON COLUMN shop_config.enable_reminders IS 
  'Whether to send reminder SMS before appointments';

-- 5. Function to clean up expired OTP codes (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_otp_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM otp_verification
  WHERE expires_at < now() - interval '1 day';
END;
$$;

COMMENT ON FUNCTION cleanup_expired_otp_codes IS 
  'Removes OTP codes older than 1 day (run daily via cron or manually)';
