/*
  # Add Booking Reminders Scheduling Table

  1. Overview
    Creates a robust reminder scheduling system that pre-schedules reminders
    when appointments are created. This replaces the time-window matching approach
    with explicit scheduled reminder records.

  2. New Tables
    - `booking_reminders`
      - `id` (uuid, primary key)
      - `appointment_id` (uuid, references appointments)
      - `scheduled_for` (timestamptz) - when to send this reminder
      - `reminder_type` ('primary' | 'secondary') - which reminder this is
      - `reminder_offset_hours` (integer) - how many hours before appointment
      - `status` ('pending' | 'sent' | 'failed' | 'skipped' | 'cancelled')
      - `sent_at` (timestamptz, nullable) - when reminder was actually sent
      - `error_message` (text, nullable) - error details if failed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  3. Benefits
    - Pre-scheduled reminders are visible and manageable
    - Easy to reschedule when appointments change
    - Clear audit trail of reminder status
    - Idempotent processing (status transitions prevent duplicates)
    - Graceful handling when SMS is disabled

  4. Security
    - Enable RLS on booking_reminders
    - Service role can manage all reminders (for cron job)
    - Owners can view reminders for visibility/debugging
*/

-- Create booking_reminders table
CREATE TABLE IF NOT EXISTS booking_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  scheduled_for timestamptz NOT NULL,
  reminder_type text NOT NULL CHECK (reminder_type IN ('primary', 'secondary')),
  reminder_offset_hours integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped', 'cancelled')),
  sent_at timestamptz DEFAULT NULL,
  error_message text DEFAULT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(appointment_id, reminder_type)
);

-- Create index for efficient cron queries
CREATE INDEX IF NOT EXISTS idx_booking_reminders_due 
  ON booking_reminders(scheduled_for, status) 
  WHERE status = 'pending';

-- Create index for appointment lookups
CREATE INDEX IF NOT EXISTS idx_booking_reminders_appointment 
  ON booking_reminders(appointment_id);

-- Enable RLS
ALTER TABLE booking_reminders ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything (for cron job)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'booking_reminders' 
    AND policyname = 'Service role can manage all reminders'
  ) THEN
    CREATE POLICY "Service role can manage all reminders"
      ON booking_reminders
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Policy: Owners can view reminders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'booking_reminders' 
    AND policyname = 'Owners can view reminders'
  ) THEN
    CREATE POLICY "Owners can view reminders"
      ON booking_reminders
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role = 'OWNER'
        )
      );
  END IF;
END $$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_booking_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_booking_reminders_updated_at ON booking_reminders;
CREATE TRIGGER trigger_booking_reminders_updated_at
  BEFORE UPDATE ON booking_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_reminders_updated_at();

-- Function to schedule reminders for an appointment
CREATE OR REPLACE FUNCTION schedule_appointment_reminders(
  p_appointment_id uuid,
  p_scheduled_start timestamptz
)
RETURNS void AS $$
DECLARE
  v_shop_config RECORD;
  v_primary_scheduled_for timestamptz;
  v_secondary_scheduled_for timestamptz;
  v_now timestamptz := now();
BEGIN
  -- Get shop config
  SELECT enable_reminders, reminder_hours_before, reminder_hours_before_secondary
  INTO v_shop_config
  FROM shop_config
  LIMIT 1;

  -- If reminders are disabled or no config, exit
  IF v_shop_config IS NULL OR v_shop_config.enable_reminders IS NOT TRUE THEN
    RETURN;
  END IF;

  -- Calculate primary reminder time
  v_primary_scheduled_for := p_scheduled_start - (COALESCE(v_shop_config.reminder_hours_before, 24) || ' hours')::interval;

  -- Only schedule if in the future
  IF v_primary_scheduled_for > v_now THEN
    INSERT INTO booking_reminders (
      appointment_id,
      scheduled_for,
      reminder_type,
      reminder_offset_hours,
      status
    ) VALUES (
      p_appointment_id,
      v_primary_scheduled_for,
      'primary',
      COALESCE(v_shop_config.reminder_hours_before, 24),
      'pending'
    )
    ON CONFLICT (appointment_id, reminder_type) 
    DO UPDATE SET
      scheduled_for = EXCLUDED.scheduled_for,
      reminder_offset_hours = EXCLUDED.reminder_offset_hours,
      status = 'pending',
      sent_at = NULL,
      error_message = NULL,
      updated_at = now();
  END IF;

  -- Calculate secondary reminder time (if configured)
  IF v_shop_config.reminder_hours_before_secondary IS NOT NULL THEN
    v_secondary_scheduled_for := p_scheduled_start - (v_shop_config.reminder_hours_before_secondary || ' hours')::interval;

    -- Only schedule if in the future
    IF v_secondary_scheduled_for > v_now THEN
      INSERT INTO booking_reminders (
        appointment_id,
        scheduled_for,
        reminder_type,
        reminder_offset_hours,
        status
      ) VALUES (
        p_appointment_id,
        v_secondary_scheduled_for,
        'secondary',
        v_shop_config.reminder_hours_before_secondary,
        'pending'
      )
      ON CONFLICT (appointment_id, reminder_type) 
      DO UPDATE SET
        scheduled_for = EXCLUDED.scheduled_for,
        reminder_offset_hours = EXCLUDED.reminder_offset_hours,
        status = 'pending',
        sent_at = NULL,
        error_message = NULL,
        updated_at = now();
    END IF;
  ELSE
    -- Secondary reminder is disabled, remove any existing secondary reminder
    DELETE FROM booking_reminders 
    WHERE appointment_id = p_appointment_id 
    AND reminder_type = 'secondary';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically schedule reminders when appointments are created or updated
CREATE OR REPLACE FUNCTION trigger_schedule_appointment_reminders()
RETURNS TRIGGER AS $$
BEGIN
  -- Only schedule for booked appointments
  IF NEW.status = 'booked' THEN
    PERFORM schedule_appointment_reminders(NEW.id, NEW.scheduled_start);
  ELSE
    -- If appointment is cancelled or completed, cancel pending reminders
    UPDATE booking_reminders
    SET status = 'cancelled', updated_at = now()
    WHERE appointment_id = NEW.id
    AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to appointments table
DROP TRIGGER IF EXISTS trigger_appointments_schedule_reminders ON appointments;
CREATE TRIGGER trigger_appointments_schedule_reminders
  AFTER INSERT OR UPDATE OF scheduled_start, status ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_schedule_appointment_reminders();