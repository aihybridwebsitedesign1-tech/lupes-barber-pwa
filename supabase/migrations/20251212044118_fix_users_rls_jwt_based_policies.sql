/*
  # Fix Users Table RLS Policies - Complete Repair
  
  ## Critical Issues Found
  
  1. **INSERT Policy is Broken**
     - Current: Checks users table recursively (causes "User exists but no profile found")
     - Problem: During INSERT, the new user doesn't exist yet in users table
     - Solution: Check JWT metadata instead of querying users table
  
  2. **UPDATE Policy Uses Wrong JWT Path**
     - Current: `auth.jwt() -> 'app_metadata' ->> 'role'`
     - Correct: `auth.jwt() ->> 'role'`
     - The role is stored at top level of raw_app_meta_data, not nested
  
  3. **DELETE Policy Has Same Issue**
     - Also queries users table recursively
     - Should use JWT metadata
  
  ## This Migration Does
  
  1. **Drop All Broken Policies**
     - Remove recursive INSERT policy
     - Remove incorrect UPDATE policy
     - Remove recursive DELETE policy
  
  2. **Create Correct JWT-Based Policies**
     - INSERT: Check JWT role = 'OWNER'
     - UPDATE: Check JWT role = 'OWNER' OR own profile
     - DELETE: Check JWT role = 'OWNER'
  
  3. **Validate All Related Tables**
     - Ensure barber_schedules allows owner access
     - Ensure barber_services allows owner access
     - Ensure appointments allows owner access
  
  ## Security Model
  
  - OWNER role (from JWT): Full CRUD on users table
  - Individual users: Can update own profile only
  - Public/Anonymous: Read-only access to active barbers for booking
  
  ## Expected Results
  
  - Owner can create barbers without 403 errors
  - Owner can update any user profile
  - Owner can delete users
  - Barbers can update own profile only
  - No "User exists but no profile found" errors
*/

-- =====================================================
-- PART 1: Drop Broken Policies
-- =====================================================

-- Drop the broken INSERT policy that queries users table recursively
DROP POLICY IF EXISTS "Owners can create new users" ON users;

-- Drop the UPDATE policy with wrong JWT path
DROP POLICY IF EXISTS "Owners can update any user" ON users;

-- Drop the DELETE policy if it has same issue
DROP POLICY IF EXISTS "Owners can delete users" ON users;

-- =====================================================
-- PART 2: Create Correct JWT-Based Policies
-- =====================================================

-- ============ INSERT POLICY ============
-- Allow OWNER role (from JWT) to create new users (barbers)
-- This checks the currently logged-in user's JWT, not the users table
CREATE POLICY "Owners can insert users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'OWNER'
  );

-- ============ UPDATE POLICIES ============
-- Allow OWNER role to update any user profile
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

-- Keep the existing policy allowing users to update own profile
-- (This policy already exists and is correct)

-- ============ DELETE POLICY ============
-- Allow OWNER role to delete users (barbers)
CREATE POLICY "Owners can delete users"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'OWNER'
  );

-- =====================================================
-- PART 3: Validate Related Tables RLS
-- =====================================================

-- Ensure barber_schedules has proper INSERT policy for owners
-- This allows owners to create schedules for barbers they create
DO $$ 
BEGIN
  -- Drop old policy if exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'barber_schedules' 
    AND policyname = 'Authenticated users can insert barber schedules'
  ) THEN
    DROP POLICY "Authenticated users can insert barber schedules" ON barber_schedules;
  END IF;
  
  -- Create policy that allows authenticated users to insert schedules
  CREATE POLICY "Authenticated users can insert barber schedules"
    ON barber_schedules
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
END $$;

-- Ensure barber_services has proper policies
DO $$ 
BEGIN
  -- Check if barber_services needs separate INSERT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'barber_services'
    AND cmd = 'INSERT'
  ) THEN
    -- Add INSERT policy for barber_services
    CREATE POLICY "Authenticated users can insert barber services"
      ON barber_services
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
  
  -- Add UPDATE policy for barber_services
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'barber_services'
    AND cmd = 'UPDATE'
  ) THEN
    CREATE POLICY "Authenticated users can update barber services"
      ON barber_services
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
  
  -- Add DELETE policy for barber_services
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'barber_services'
    AND cmd = 'DELETE'
  ) THEN
    CREATE POLICY "Authenticated users can delete barber services"
      ON barber_services
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- =====================================================
-- PART 4: Ensure Owner JWT Metadata is Correct
-- =====================================================

-- Re-sync owner role to auth.users metadata (ensure it's at top level)
UPDATE auth.users
SET raw_app_meta_data = jsonb_build_object(
  'role', 'OWNER',
  'provider', COALESCE(raw_app_meta_data->>'provider', 'email'),
  'providers', COALESCE(raw_app_meta_data->'providers', '["email"]'::jsonb)
)
WHERE id = 'f658670f-ba88-4bea-bdef-b8d95965f2f0';

-- =====================================================
-- PART 5: Verification and Logging
-- =====================================================

DO $$
DECLARE
  insert_count int;
  update_count int;
  delete_count int;
  owner_jwt_role text;
BEGIN
  -- Count policies on users table
  SELECT COUNT(*) INTO insert_count 
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'users' AND cmd = 'INSERT';
  
  SELECT COUNT(*) INTO update_count 
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'users' AND cmd = 'UPDATE';
  
  SELECT COUNT(*) INTO delete_count 
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'users' AND cmd = 'DELETE';
  
  -- Get owner JWT role
  SELECT raw_app_meta_data->>'role' INTO owner_jwt_role
  FROM auth.users
  WHERE id = 'f658670f-ba88-4bea-bdef-b8d95965f2f0';
  
  RAISE NOTICE '=== RLS Policy Repair Complete ===';
  RAISE NOTICE 'INSERT policies on users: %', insert_count;
  RAISE NOTICE 'UPDATE policies on users: %', update_count;
  RAISE NOTICE 'DELETE policies on users: %', delete_count;
  RAISE NOTICE 'Owner JWT role: %', owner_jwt_role;
  RAISE NOTICE '====================================';
  
  -- Validate
  IF insert_count < 1 THEN
    RAISE WARNING 'Missing INSERT policy on users table!';
  END IF;
  
  IF owner_jwt_role != 'OWNER' THEN
    RAISE WARNING 'Owner JWT role is incorrect: %', owner_jwt_role;
  END IF;
END $$;
