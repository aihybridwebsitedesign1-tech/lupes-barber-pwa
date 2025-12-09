/*
  # Fix Reset Function Table Names

  1. Updates
    - Fix time tracking table name from time_tracking_entries to barber_time_entries
    - Fix booking reminders table name to booking_reminders (not booking_reminders_scheduled)

  2. Safety
    - All operations remain owner-only
    - Audit logging preserved
*/

-- Update the reset_all_non_core_data function with correct table names
CREATE OR REPLACE FUNCTION reset_all_non_core_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id UUID;
  v_appointments_count INTEGER;
  v_payouts_count INTEGER;
  v_payout_items_count INTEGER;
  v_time_tracking_count INTEGER;
  v_transformations_count INTEGER;
  v_reminders_count INTEGER;
  v_inventory_count INTEGER;
  v_messages_count INTEGER;
  v_result JSONB;
BEGIN
  -- Verify caller is owner
  SELECT id INTO v_owner_id
  FROM users
  WHERE id = auth.uid()
  AND role = 'OWNER';

  IF v_owner_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Only owners can perform reset operations'
    );
  END IF;

  -- Count everything before deletion
  SELECT COUNT(*) INTO v_appointments_count FROM appointments;
  SELECT COUNT(*) INTO v_payouts_count FROM payouts;
  SELECT COUNT(*) INTO v_payout_items_count FROM payout_items;
  SELECT COUNT(*) INTO v_time_tracking_count FROM barber_time_entries;
  SELECT COUNT(*) INTO v_transformations_count FROM transformation_photos;
  SELECT COUNT(*) INTO v_reminders_count FROM booking_reminders;
  SELECT COUNT(*) INTO v_inventory_count FROM inventory_transactions;
  SELECT COUNT(*) INTO v_messages_count FROM client_messages;

  -- Delete in correct order to respect foreign keys
  DELETE FROM booking_reminders;
  DELETE FROM transformation_photos;
  DELETE FROM payout_items;
  DELETE FROM payouts;
  DELETE FROM inventory_transactions;
  DELETE FROM client_messages;
  DELETE FROM appointment_reminders_sent;
  DELETE FROM appointment_products;
  DELETE FROM appointments;
  DELETE FROM barber_time_entries;

  -- Log the action
  INSERT INTO reset_actions_history (owner_id, action_type, details)
  VALUES (
    v_owner_id,
    'reset_all_non_core_data',
    jsonb_build_object(
      'appointments_deleted', v_appointments_count,
      'payouts_deleted', v_payouts_count,
      'payout_items_deleted', v_payout_items_count,
      'time_tracking_deleted', v_time_tracking_count,
      'transformations_deleted', v_transformations_count,
      'reminders_deleted', v_reminders_count,
      'inventory_transactions_deleted', v_inventory_count,
      'messages_deleted', v_messages_count,
      'timestamp', now()
    )
  );

  v_result := jsonb_build_object(
    'success', true,
    'appointments_deleted', v_appointments_count,
    'payouts_deleted', v_payouts_count,
    'payout_items_deleted', v_payout_items_count,
    'time_tracking_deleted', v_time_tracking_count,
    'transformations_deleted', v_transformations_count,
    'reminders_deleted', v_reminders_count,
    'inventory_transactions_deleted', v_inventory_count,
    'messages_deleted', v_messages_count
  );

  RETURN v_result;
END;
$$;

-- Update reset_time_tracking function
CREATE OR REPLACE FUNCTION reset_time_tracking()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id UUID;
  v_count INTEGER;
  v_result JSONB;
BEGIN
  -- Verify caller is owner
  SELECT id INTO v_owner_id
  FROM users
  WHERE id = auth.uid()
  AND role = 'OWNER';

  IF v_owner_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Only owners can perform reset operations'
    );
  END IF;

  -- Count entries to be deleted
  SELECT COUNT(*) INTO v_count
  FROM barber_time_entries;

  -- Delete all time tracking entries
  DELETE FROM barber_time_entries;

  -- Log the action
  INSERT INTO reset_actions_history (owner_id, action_type, details)
  VALUES (
    v_owner_id,
    'reset_time_tracking',
    jsonb_build_object(
      'entries_deleted', v_count,
      'timestamp', now()
    )
  );

  v_result := jsonb_build_object(
    'success', true,
    'entries_deleted', v_count
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION reset_all_non_core_data IS 'Deletes ALL transactional data, keeping only barbers/services/products/config (FIXED TABLE NAMES)';
COMMENT ON FUNCTION reset_time_tracking IS 'Deletes all time tracking entries (FIXED TABLE NAME)';
