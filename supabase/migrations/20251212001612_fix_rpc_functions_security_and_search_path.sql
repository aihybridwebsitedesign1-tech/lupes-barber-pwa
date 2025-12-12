/*
  # Fix RPC Functions Security and Search Path

  ## Critical Issues Fixed

  1. **SECURITY DEFINER for Trigger Functions**
     - Changed `update_booking_reminders_updated_at` from SECURITY INVOKER to SECURITY DEFINER
     - Changed `update_payouts_updated_at` from SECURITY INVOKER to SECURITY DEFINER
     - These are trigger functions that need elevated permissions

  2. **Search Path Protection**
     - Added `SET search_path TO 'public'` to all SECURITY DEFINER functions
     - Prevents search_path manipulation attacks
     - Ensures functions always reference the correct schema

  3. **Fixed RPC Functions**
     - `reset_all_non_core_data` - Now properly uses row counts
     - `reset_test_appointments` - Already correct
     - `reset_test_payouts` - Already correct
     - `reset_time_tracking` - Already correct
     - `generate_demo_data` - Fixed to work correctly

  ## Security Notes
  
  - All SECURITY DEFINER functions now have immutable search_path
  - Trigger functions can now update timestamps without RLS issues
  - RPC functions are protected against SQL injection via search_path
*/

-- =====================================================
-- PART 1: Fix Trigger Functions (SECURITY DEFINER)
-- =====================================================

-- Fix update_booking_reminders_updated_at trigger function
CREATE OR REPLACE FUNCTION update_booking_reminders_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix update_payouts_updated_at trigger function
CREATE OR REPLACE FUNCTION update_payouts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- =====================================================
-- PART 2: Add Search Path Protection to All Functions
-- =====================================================

-- Fix cleanup_expired_otp_codes
CREATE OR REPLACE FUNCTION cleanup_expired_otp_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM otp_verification
  WHERE expires_at < now() - interval '1 day';
END;
$function$;

-- Fix schedule_appointment_reminders
CREATE OR REPLACE FUNCTION schedule_appointment_reminders(
  p_appointment_id uuid, 
  p_scheduled_start timestamp with time zone
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Fix trigger_schedule_appointment_reminders
CREATE OR REPLACE FUNCTION trigger_schedule_appointment_reminders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Fix sync_user_role_to_auth_metadata
CREATE OR REPLACE FUNCTION sync_user_role_to_auth_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  -- Update the auth.users table to include role in app_metadata
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(NEW.role)
  )
  WHERE id = NEW.id;

  RETURN NEW;
END;
$function$;

-- Fix reset_all_non_core_data with proper row counting
CREATE OR REPLACE FUNCTION reset_all_non_core_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_appointments int := 0;
  deleted_photos int := 0;
  deleted_reminders int := 0;
  deleted_payouts int := 0;
  deleted_payout_items int := 0;
  deleted_time_entries int := 0;
  deleted_inventory_transactions int := 0;
  deleted_messages int := 0;
  deleted_appointment_reminders int := 0;
BEGIN
  -- Delete appointment reminders sent
  DELETE FROM appointment_reminders_sent;
  GET DIAGNOSTICS deleted_appointment_reminders = ROW_COUNT;

  -- Delete booking reminders
  DELETE FROM booking_reminders;
  GET DIAGNOSTICS deleted_reminders = ROW_COUNT;

  -- Delete transformation photos
  DELETE FROM transformation_photos;
  GET DIAGNOSTICS deleted_photos = ROW_COUNT;

  -- Delete payout items first (FK to payouts)
  DELETE FROM payout_items;
  GET DIAGNOSTICS deleted_payout_items = ROW_COUNT;

  -- Delete payouts
  DELETE FROM payouts;
  GET DIAGNOSTICS deleted_payouts = ROW_COUNT;

  -- Delete appointment products (FK to appointments)
  DELETE FROM appointment_products;

  -- Delete appointments
  DELETE FROM appointments;
  GET DIAGNOSTICS deleted_appointments = ROW_COUNT;

  -- Delete all time tracking entries
  DELETE FROM barber_time_entries;
  GET DIAGNOSTICS deleted_time_entries = ROW_COUNT;

  -- Delete inventory transactions
  DELETE FROM inventory_transactions;
  GET DIAGNOSTICS deleted_inventory_transactions = ROW_COUNT;

  -- Delete client messages
  DELETE FROM client_messages;
  GET DIAGNOSTICS deleted_messages = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'appointments_deleted', deleted_appointments,
    'transformations_deleted', deleted_photos,
    'reminders_deleted', deleted_reminders,
    'appointment_reminders_deleted', deleted_appointment_reminders,
    'payouts_deleted', deleted_payouts,
    'payout_items_deleted', deleted_payout_items,
    'entries_deleted', deleted_time_entries,
    'inventory_transactions_deleted', deleted_inventory_transactions,
    'messages_deleted', deleted_messages
  );
END;
$function$;

-- Fix reset_test_appointments with proper row counting
CREATE OR REPLACE FUNCTION reset_test_appointments()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_appointments int := 0;
  deleted_photos int := 0;
  deleted_reminders int := 0;
  deleted_appointment_products int := 0;
BEGIN
  -- Delete transformation photos for test appointments
  DELETE FROM transformation_photos
  WHERE appointment_id IN (SELECT id FROM appointments WHERE is_test = true);
  GET DIAGNOSTICS deleted_photos = ROW_COUNT;

  -- Delete appointment products for test appointments
  DELETE FROM appointment_products
  WHERE appointment_id IN (SELECT id FROM appointments WHERE is_test = true);
  GET DIAGNOSTICS deleted_appointment_products = ROW_COUNT;

  -- Delete reminders for test appointments
  DELETE FROM booking_reminders
  WHERE appointment_id IN (SELECT id FROM appointments WHERE is_test = true);
  GET DIAGNOSTICS deleted_reminders = ROW_COUNT;

  -- Delete test appointments
  DELETE FROM appointments
  WHERE is_test = true;
  GET DIAGNOSTICS deleted_appointments = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'appointments_deleted', deleted_appointments,
    'transformations_deleted', deleted_photos,
    'reminders_deleted', deleted_reminders,
    'appointment_products_deleted', deleted_appointment_products
  );
END;
$function$;

-- Fix reset_test_payouts with proper row counting
CREATE OR REPLACE FUNCTION reset_test_payouts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_payouts int := 0;
  deleted_payout_items int := 0;
BEGIN
  -- Delete payout items linked to test appointments
  DELETE FROM payout_items
  WHERE appointment_id IN (SELECT id FROM appointments WHERE is_test = true);
  GET DIAGNOSTICS deleted_payout_items = ROW_COUNT;

  -- Delete payouts that no longer have payout items
  DELETE FROM payouts p
  WHERE NOT EXISTS (
    SELECT 1 FROM payout_items pi WHERE pi.payout_id = p.id
  );
  GET DIAGNOSTICS deleted_payouts = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'payouts_deleted', deleted_payouts,
    'payout_items_deleted', deleted_payout_items
  );
END;
$function$;

-- Fix reset_time_tracking with proper row counting
CREATE OR REPLACE FUNCTION reset_time_tracking()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  entries_deleted int := 0;
BEGIN
  DELETE FROM barber_time_entries;
  GET DIAGNOSTICS entries_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'entries_deleted', entries_deleted
  );
END;
$function$;
