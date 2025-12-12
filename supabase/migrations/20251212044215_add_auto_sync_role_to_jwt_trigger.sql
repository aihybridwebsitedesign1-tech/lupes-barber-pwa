/*
  # Auto-Sync User Role to JWT Metadata
  
  ## Problem Identified
  
  When creating a new barber via `supabase.auth.signUp()`:
  - Frontend passes `role: 'BARBER'` in options.data
  - This sets raw_user_meta_data (user-controlled data)
  - But RLS policies check auth.jwt() ->> 'role' (from raw_app_meta_data)
  - New barbers don't have role in raw_app_meta_data automatically
  
  ## Solution
  
  Create a trigger on public.users table that:
  1. Fires AFTER INSERT or UPDATE on public.users
  2. Automatically syncs the role from public.users to auth.users.raw_app_meta_data
  3. Ensures JWT will contain correct role claim on next login
  
  ## Benefits
  
  - Barbers created via frontend will have proper JWT role
  - Owner can create barbers without manual JWT sync
  - All users have consistent JWT metadata
  - RLS policies work correctly for all users
  
  ## Security
  
  - Trigger runs with elevated privileges
  - Only syncs role from trusted public.users table
  - Cannot be bypassed by user input
  - Maintains audit trail via updated_at
*/

-- =====================================================
-- PART 1: Create Trigger Function
-- =====================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS sync_user_role_to_auth_metadata() CASCADE;

-- Create function that syncs role to auth.users metadata
CREATE OR REPLACE FUNCTION sync_user_role_to_auth_metadata()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update auth.users with role from public.users
  -- This ensures the JWT will contain the correct role claim
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_build_object(
    'role', NEW.role,
    'provider', COALESCE(raw_app_meta_data->>'provider', 'email'),
    'providers', COALESCE(raw_app_meta_data->'providers', '["email"]'::jsonb)
  )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- PART 2: Create Trigger on Users Table
-- =====================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_user_role_to_auth_metadata_trigger ON users;

-- Create trigger that fires after insert or update
CREATE TRIGGER sync_user_role_to_auth_metadata_trigger
  AFTER INSERT OR UPDATE OF role
  ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_role_to_auth_metadata();

-- =====================================================
-- PART 3: Backfill Existing Users (Owner)
-- =====================================================

-- Ensure owner has correct JWT metadata
UPDATE auth.users
SET raw_app_meta_data = jsonb_build_object(
  'role', u.role,
  'provider', COALESCE(auth.users.raw_app_meta_data->>'provider', 'email'),
  'providers', COALESCE(auth.users.raw_app_meta_data->'providers', '["email"]'::jsonb)
)
FROM users u
WHERE auth.users.id = u.id
  AND u.id = 'f658670f-ba88-4bea-bdef-b8d95965f2f0';

-- =====================================================
-- PART 4: Verification
-- =====================================================

DO $$
DECLARE
  trigger_count int;
  owner_jwt_role text;
BEGIN
  -- Count triggers on users table
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname = 'sync_user_role_to_auth_metadata_trigger';
  
  -- Get owner JWT role
  SELECT raw_app_meta_data->>'role' INTO owner_jwt_role
  FROM auth.users
  WHERE id = 'f658670f-ba88-4bea-bdef-b8d95965f2f0';
  
  RAISE NOTICE '=== JWT Auto-Sync Trigger Installed ===';
  RAISE NOTICE 'Trigger count: %', trigger_count;
  RAISE NOTICE 'Owner JWT role: %', owner_jwt_role;
  RAISE NOTICE '======================================';
  
  IF trigger_count = 0 THEN
    RAISE WARNING 'Trigger not installed correctly!';
  END IF;
  
  IF owner_jwt_role IS NULL THEN
    RAISE WARNING 'Owner JWT role not set!';
  END IF;
END $$;
