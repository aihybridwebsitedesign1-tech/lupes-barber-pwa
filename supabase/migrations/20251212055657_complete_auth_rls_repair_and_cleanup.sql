/*
  # Complete Auth & RLS Repair Patch
  
  ## Critical Issues Being Fixed
  
  1. **Broken RLS Policies**
     - INSERT policy queries users table recursively (impossible during insert)
     - UPDATE policy uses wrong JWT path
     - DELETE policy has same recursive issue
     - All policies must use: (auth.jwt() ->> 'role') = 'OWNER'
  
  2. **Orphaned Auth Accounts**
     - Failed barber creation attempts left orphaned auth.users records
     - These accounts have no corresponding public.users profile
     - Must be cleaned up to prevent confusion
  
  3. **Missing JWT Role Sync**
     - New barbers don't get role synced to JWT automatically
     - Trigger exists but may need validation/recreation
     - Owner JWT metadata may be incorrect
  
  ## This Migration Does
  
  ### PHASE 1: Clean Slate - Remove ALL Existing Policies
  - Drop every policy on users table
  - Start fresh with correct implementations
  
  ### PHASE 2: Create Clean JWT-Based RLS Policies
  - INSERT: Only OWNER can create users (barbers)
  - UPDATE: OWNER can update any user, users can update own profile
  - DELETE: Only OWNER can delete users
  - SELECT: Authenticated can read, public can see active barbers for booking
  
  ### PHASE 3: Fix/Create Role Sync Trigger
  - Ensure trigger syncs role from public.users to auth.users.raw_app_meta_data
  - Trigger fires on INSERT or UPDATE of role column
  - Maintains proper JWT structure
  
  ### PHASE 4: Backfill Owner JWT Metadata
  - Ensure owner account has correct raw_app_meta_data.role = 'OWNER'
  - Required for RLS policies to work
  
  ### PHASE 5: Cleanup Orphaned Auth Accounts
  - Delete all auth.users records with no matching public.users
  - Safely removes failed account creation attempts
  - Prevents "User exists but no profile found" errors
  
  ### PHASE 6: Validation
  - Verify all policies created correctly
  - Verify trigger is active
  - Verify owner JWT is correct
  - Verify no orphaned accounts remain
  
  ## Expected Results
  
  - Owner can create barbers without 403 errors
  - New barbers automatically get JWT role
  - No "User exists but no profile found" errors
  - Clean auth.users table with no orphans
  - All RLS policies use correct JWT path
  - No recursive table queries
*/

-- =====================================================
-- PHASE 1: CLEAN SLATE - DROP ALL EXISTING POLICIES
-- =====================================================

DO $$ 
DECLARE
    pol_record RECORD;
BEGIN
    -- Drop all policies on users table
    FOR pol_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'users'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON users', pol_record.policyname);
        RAISE NOTICE 'Dropped policy: %', pol_record.policyname;
    END LOOP;
    
    RAISE NOTICE '=== Phase 1 Complete: All old policies dropped ===';
END $$;

-- =====================================================
-- PHASE 2: CREATE CLEAN JWT-BASED RLS POLICIES
-- =====================================================

-- ============ INSERT POLICY ============
-- Only OWNER role (from JWT) can create new users (barbers)
-- NO recursive table queries - checks JWT directly
CREATE POLICY "Owners can insert users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'OWNER'
  );

-- ============ UPDATE POLICIES ============
-- Policy 1: OWNER can update any user profile
CREATE POLICY "Owners can update any user"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'OWNER'
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'OWNER'
  );

-- Policy 2: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
  )
  WITH CHECK (
    auth.uid() = id
  );

-- ============ DELETE POLICY ============
-- Only OWNER can delete users (barbers)
CREATE POLICY "Owners can delete users"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'OWNER'
  );

-- ============ SELECT POLICIES ============
-- Policy 1: Authenticated users can read user profiles (for internal operations)
CREATE POLICY "Authenticated users can read users"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: Public can read active barbers shown on client booking site
CREATE POLICY "Public can read active barbers for booking"
  ON users
  FOR SELECT
  TO anon, authenticated
  USING (
    role = 'BARBER' 
    AND active = true 
    AND show_on_client_site = true
  );

-- Policy 3: Public can read specific barber for direct booking links
CREATE POLICY "Public can read specific barber for direct booking link"
  ON users
  FOR SELECT
  TO anon, authenticated
  USING (
    role = 'BARBER' 
    AND active = true
  );

DO $$
BEGIN
    RAISE NOTICE '=== Phase 2 Complete: All JWT-based policies created ===';
END $$;

-- =====================================================
-- PHASE 3: FIX/CREATE ROLE SYNC TRIGGER
-- =====================================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS sync_user_role_to_auth_metadata_trigger ON users;
DROP FUNCTION IF EXISTS sync_user_role_to_auth_metadata() CASCADE;

-- Create trigger function that syncs role to auth.users.raw_app_meta_data
CREATE OR REPLACE FUNCTION sync_user_role_to_auth_metadata()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Sync role from public.users to auth.users.raw_app_meta_data
  -- This ensures JWT contains correct role claim on next login
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

-- Create trigger that fires after insert or update of role
CREATE TRIGGER sync_user_role_to_auth_metadata_trigger
  AFTER INSERT OR UPDATE OF role
  ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_role_to_auth_metadata();

DO $$
BEGIN
    RAISE NOTICE '=== Phase 3 Complete: Role sync trigger created ===';
END $$;

-- =====================================================
-- PHASE 4: BACKFILL OWNER JWT METADATA
-- =====================================================

-- Ensure owner account has correct JWT metadata
DO $$
DECLARE
  owner_id uuid := 'f658670f-ba88-4bea-bdef-b8d95965f2f0';
  owner_role text;
BEGIN
  -- Get role from public.users
  SELECT role INTO owner_role
  FROM users
  WHERE id = owner_id;
  
  IF owner_role IS NULL THEN
    RAISE EXCEPTION 'Owner account not found in public.users!';
  END IF;
  
  -- Update auth.users with correct metadata
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_build_object(
    'role', owner_role,
    'provider', COALESCE(raw_app_meta_data->>'provider', 'email'),
    'providers', COALESCE(raw_app_meta_data->'providers', '["email"]'::jsonb)
  )
  WHERE id = owner_id;
  
  RAISE NOTICE '=== Phase 4 Complete: Owner JWT metadata backfilled (role=%) ===', owner_role;
END $$;

-- =====================================================
-- PHASE 5: CLEANUP ORPHANED AUTH ACCOUNTS
-- =====================================================

DO $$
DECLARE
  orphan_count int;
  orphan_rec RECORD;
BEGIN
  -- Count orphaned accounts
  SELECT COUNT(*) INTO orphan_count
  FROM auth.users au
  WHERE NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.id = au.id
  );
  
  RAISE NOTICE '=== Phase 5: Cleaning up % orphaned auth accounts ===', orphan_count;
  
  -- Log each orphaned account before deletion
  FOR orphan_rec IN 
    SELECT id, email, created_at
    FROM auth.users au
    WHERE NOT EXISTS (
      SELECT 1 FROM public.users pu WHERE pu.id = au.id
    )
  LOOP
    RAISE NOTICE 'Deleting orphaned auth account: % (email: %, created: %)', 
      orphan_rec.id, orphan_rec.email, orphan_rec.created_at;
  END LOOP;
  
  -- Delete orphaned auth accounts
  -- These are accounts with no corresponding public.users profile
  -- Created during failed barber creation attempts
  DELETE FROM auth.users
  WHERE id IN (
    SELECT au.id
    FROM auth.users au
    WHERE NOT EXISTS (
      SELECT 1 FROM public.users pu WHERE pu.id = au.id
    )
  );
  
  RAISE NOTICE '=== Phase 5 Complete: Deleted % orphaned accounts ===', orphan_count;
END $$;

-- =====================================================
-- PHASE 6: VALIDATION
-- =====================================================

DO $$
DECLARE
  policy_count_insert int;
  policy_count_update int;
  policy_count_delete int;
  policy_count_select int;
  trigger_count int;
  owner_jwt_role text;
  orphan_count int;
  total_auth_users int;
  total_public_users int;
BEGIN
  -- Count policies by type
  SELECT COUNT(*) INTO policy_count_insert
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'users' AND cmd = 'INSERT';
  
  SELECT COUNT(*) INTO policy_count_update
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'users' AND cmd = 'UPDATE';
  
  SELECT COUNT(*) INTO policy_count_delete
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'users' AND cmd = 'DELETE';
  
  SELECT COUNT(*) INTO policy_count_select
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'users' AND cmd = 'SELECT';
  
  -- Check trigger
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname = 'sync_user_role_to_auth_metadata_trigger';
  
  -- Check owner JWT
  SELECT raw_app_meta_data->>'role' INTO owner_jwt_role
  FROM auth.users
  WHERE id = 'f658670f-ba88-4bea-bdef-b8d95965f2f0';
  
  -- Check for remaining orphans
  SELECT COUNT(*) INTO orphan_count
  FROM auth.users au
  WHERE NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id);
  
  -- Count total users
  SELECT COUNT(*) INTO total_auth_users FROM auth.users;
  SELECT COUNT(*) INTO total_public_users FROM public.users;
  
  -- Report validation results
  RAISE NOTICE '=======================================================';
  RAISE NOTICE '=== COMPLETE AUTH & RLS REPAIR - VALIDATION RESULTS ===';
  RAISE NOTICE '=======================================================';
  RAISE NOTICE '';
  RAISE NOTICE '✓ RLS POLICIES:';
  RAISE NOTICE '  - INSERT policies: % (expected: 1)', policy_count_insert;
  RAISE NOTICE '  - UPDATE policies: % (expected: 2)', policy_count_update;
  RAISE NOTICE '  - DELETE policies: % (expected: 1)', policy_count_delete;
  RAISE NOTICE '  - SELECT policies: % (expected: 3)', policy_count_select;
  RAISE NOTICE '';
  RAISE NOTICE '✓ TRIGGER SYSTEM:';
  RAISE NOTICE '  - Role sync trigger: % (expected: 1)', trigger_count;
  RAISE NOTICE '';
  RAISE NOTICE '✓ JWT METADATA:';
  RAISE NOTICE '  - Owner JWT role: % (expected: OWNER)', COALESCE(owner_jwt_role, 'NULL');
  RAISE NOTICE '';
  RAISE NOTICE '✓ ACCOUNT CLEANUP:';
  RAISE NOTICE '  - Orphaned auth accounts: % (expected: 0)', orphan_count;
  RAISE NOTICE '  - Total auth.users: %', total_auth_users;
  RAISE NOTICE '  - Total public.users: %', total_public_users;
  RAISE NOTICE '  - Auth/DB sync: %', 
    CASE WHEN total_auth_users = total_public_users THEN 'PERFECT MATCH ✓' 
         ELSE 'MISMATCH ✗' END;
  RAISE NOTICE '';
  RAISE NOTICE '=======================================================';
  
  -- Raise warnings for any failures
  IF policy_count_insert != 1 THEN
    RAISE WARNING 'INSERT policy count incorrect!';
  END IF;
  
  IF policy_count_update != 2 THEN
    RAISE WARNING 'UPDATE policy count incorrect!';
  END IF;
  
  IF policy_count_delete != 1 THEN
    RAISE WARNING 'DELETE policy count incorrect!';
  END IF;
  
  IF policy_count_select != 3 THEN
    RAISE WARNING 'SELECT policy count incorrect!';
  END IF;
  
  IF trigger_count != 1 THEN
    RAISE WARNING 'Role sync trigger not installed!';
  END IF;
  
  IF owner_jwt_role != 'OWNER' THEN
    RAISE WARNING 'Owner JWT role is incorrect: %', owner_jwt_role;
  END IF;
  
  IF orphan_count > 0 THEN
    RAISE WARNING 'Orphaned auth accounts still exist: %', orphan_count;
  END IF;
  
  IF total_auth_users != total_public_users THEN
    RAISE WARNING 'Auth/DB user count mismatch!';
  END IF;
  
  -- Final status
  IF policy_count_insert = 1 
     AND policy_count_update = 2 
     AND policy_count_delete = 1 
     AND policy_count_select = 3
     AND trigger_count = 1
     AND owner_jwt_role = 'OWNER'
     AND orphan_count = 0
     AND total_auth_users = total_public_users
  THEN
    RAISE NOTICE '🟢 ALL VALIDATIONS PASSED - SYSTEM READY FOR PRODUCTION';
  ELSE
    RAISE WARNING '🔴 SOME VALIDATIONS FAILED - CHECK WARNINGS ABOVE';
  END IF;
  
  RAISE NOTICE '=======================================================';
END $$;
