/*
  # Data Reset Tools for Shop Management

  1. Audit Log Table
    - Creates `reset_actions_history` table
    - Tracks all reset operations with full details
    - Owner-only access via RLS

  2. Reset RPC Functions (SECURITY DEFINER)
    - `reset_test_appointments()` - Removes test appointments only
    - `reset_test_payouts()` - Removes payouts linked to test appointments
    - `reset_time_tracking()` - Clears all time tracking history
    - `reset_all_non_core_data()` - Full reset except barbers/services/products/config

  3. Security
    - All functions verify caller is OWNER role
    - All operations are logged to audit table
    - RLS policies restrict access to owners only

  4. Safety Features
    - Uses CASCADE deletes where appropriate
    - Returns success/error status
    - Maintains referential integrity
*/

-- 1. Create audit log table
CREATE TABLE IF NOT EXISTS reset_actions_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'reset_test_appointments',
    'reset_test_payouts',
    'reset_time_tracking',
    'reset_all_non_core_data'
  )),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reset_actions_owner ON reset_actions_history(owner_id);
CREATE INDEX IF NOT EXISTS idx_reset_actions_created ON reset_actions_history(created_at DESC);

COMMENT ON TABLE reset_actions_history IS 'Audit log of all data reset operations';
COMMENT ON COLUMN reset_actions_history.action_type IS 'Type of reset operation performed';
COMMENT ON COLUMN reset_actions_history.details IS 'JSON details about what was deleted (counts, etc)';

-- RLS for audit log
ALTER TABLE reset_actions_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view reset history" ON reset_actions_history;
CREATE POLICY "Owners can view reset history"
  ON reset_actions_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'OWNER'
    )
  );

DROP POLICY IF EXISTS "System can insert reset history" ON reset_actions_history;
CREATE POLICY "System can insert reset history"
  ON reset_actions_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'OWNER'
    )
  );

-- 2. Function: Reset Test Appointments Only
CREATE OR REPLACE FUNCTION reset_test_appointments()
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

  -- Count appointments to be deleted
  SELECT COUNT(*) INTO v_count
  FROM appointments
  WHERE is_test = true;

  -- Delete test appointments (CASCADE will handle related records)
  DELETE FROM appointments WHERE is_test = true;

  -- Log the action
  INSERT INTO reset_actions_history (owner_id, action_type, details)
  VALUES (
    v_owner_id,
    'reset_test_appointments',
    jsonb_build_object(
      'appointments_deleted', v_count,
      'timestamp', now()
    )
  );

  v_result := jsonb_build_object(
    'success', true,
    'appointments_deleted', v_count
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION reset_test_appointments IS 'Deletes all test appointments and related data';

-- 3. Function: Reset Test Payouts Only
CREATE OR REPLACE FUNCTION reset_test_payouts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id UUID;
  v_payout_count INTEGER;
  v_item_count INTEGER;
  v_result JSONB;
  v_payout_ids UUID[];
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

  -- Find payouts that only contain test appointment items
  SELECT ARRAY_AGG(DISTINCT p.id) INTO v_payout_ids
  FROM payouts p
  WHERE NOT EXISTS (
    SELECT 1 FROM payout_items pi
    LEFT JOIN appointments a ON pi.appointment_id = a.id
    WHERE pi.payout_id = p.id
    AND (a.id IS NULL OR a.is_test = false)
  );

  -- Count items
  SELECT COUNT(*) INTO v_item_count
  FROM payout_items
  WHERE payout_id = ANY(v_payout_ids);

  -- Unmark commission_paid for appointments linked to these payouts
  UPDATE appointments
  SET commission_paid = false, payout_id = NULL
  WHERE payout_id = ANY(v_payout_ids);

  UPDATE inventory_transactions
  SET commission_paid = false, payout_id = NULL
  WHERE payout_id = ANY(v_payout_ids);

  -- Delete payout items
  DELETE FROM payout_items WHERE payout_id = ANY(v_payout_ids);

  -- Delete payouts
  v_payout_count := array_length(v_payout_ids, 1);
  DELETE FROM payouts WHERE id = ANY(v_payout_ids);

  -- Log the action
  INSERT INTO reset_actions_history (owner_id, action_type, details)
  VALUES (
    v_owner_id,
    'reset_test_payouts',
    jsonb_build_object(
      'payouts_deleted', COALESCE(v_payout_count, 0),
      'payout_items_deleted', v_item_count,
      'timestamp', now()
    )
  );

  v_result := jsonb_build_object(
    'success', true,
    'payouts_deleted', COALESCE(v_payout_count, 0),
    'payout_items_deleted', v_item_count
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION reset_test_payouts IS 'Deletes payouts linked only to test appointments';

-- 4. Function: Reset Time Tracking History
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
  FROM time_tracking_entries;

  -- Delete all time tracking entries
  DELETE FROM time_tracking_entries;

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

COMMENT ON FUNCTION reset_time_tracking IS 'Deletes all time tracking entries';

-- 5. Function: Full Reset (All Non-Core Data)
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
  SELECT COUNT(*) INTO v_time_tracking_count FROM time_tracking_entries;
  SELECT COUNT(*) INTO v_transformations_count FROM transformation_photos;
  SELECT COUNT(*) INTO v_reminders_count FROM booking_reminders_scheduled;
  SELECT COUNT(*) INTO v_inventory_count FROM inventory_transactions;
  SELECT COUNT(*) INTO v_messages_count FROM client_messages;

  -- Delete in correct order to respect foreign keys
  DELETE FROM booking_reminders_scheduled;
  DELETE FROM transformation_photos;
  DELETE FROM payout_items;
  DELETE FROM payouts;
  DELETE FROM inventory_transactions;
  DELETE FROM client_messages;
  DELETE FROM appointments;
  DELETE FROM time_tracking_entries;

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

COMMENT ON FUNCTION reset_all_non_core_data IS 'Deletes ALL transactional data, keeping only barbers/services/products/config';

-- Grant execute permissions to authenticated users (functions will check role internally)
GRANT EXECUTE ON FUNCTION reset_test_appointments() TO authenticated;
GRANT EXECUTE ON FUNCTION reset_test_payouts() TO authenticated;
GRANT EXECUTE ON FUNCTION reset_time_tracking() TO authenticated;
GRANT EXECUTE ON FUNCTION reset_all_non_core_data() TO authenticated;
