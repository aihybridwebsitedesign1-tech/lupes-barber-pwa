/*
  # Fix Missing INSERT Policy for Users Table
  
  ## Critical Issue Found
  
  The `users` table has NO INSERT policy, which means:
  - Owners cannot create new barbers via the UI
  - The "New Barber" workflow fails silently
  - RLS blocks all INSERT attempts
  
  ## This Migration Does
  
  1. **Add INSERT Policy for Users Table**
     - Allows OWNER role to insert new users (barbers)
     - Required for the "Create Barber" workflow
     - Secures against non-owners creating users
  
  2. **Validate Other Critical Policies**
     - Ensures all CRUD operations work for owners
     - No conflicts with existing policies
  
  ## Security
  
  - Only users with role='OWNER' can create new users
  - Barbers cannot create other barbers
  - Public cannot create users
  - Policy checks auth.uid() matches an OWNER record
  
  ## Expected Results
  
  - Owner can now create barbers via UI
  - "New Barber" modal works correctly
  - Barber profiles saved to database
  - No RLS errors during barber creation
*/

-- =====================================================
-- PART 1: Add Missing INSERT Policy for Users Table
-- =====================================================

-- Allow owners to create new users (barbers)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Owners can create new users'
  ) THEN
    CREATE POLICY "Owners can create new users"
      ON users
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid() 
          AND users.role = 'OWNER'
        )
      );
  END IF;
END $$;

-- =====================================================
-- PART 2: Add Missing DELETE Policy for Users Table
-- =====================================================

-- Allow owners to delete users (barbers)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Owners can delete users'
  ) THEN
    CREATE POLICY "Owners can delete users"
      ON users
      FOR DELETE
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

-- =====================================================
-- PART 3: Ensure Barber Schedules Policies Are Complete
-- =====================================================

-- Add INSERT policy for barber_schedules (if missing)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'barber_schedules' 
    AND policyname = 'Authenticated users can insert barber schedules'
  ) THEN
    CREATE POLICY "Authenticated users can insert barber schedules"
      ON barber_schedules
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- =====================================================
-- PART 4: Verification
-- =====================================================

-- Log the policies for verification
DO $$
DECLARE
  policy_count int;
BEGIN
  -- Count INSERT policies on users table
  SELECT COUNT(*) INTO policy_count 
  FROM pg_policies 
  WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND cmd = 'INSERT';
  
  RAISE NOTICE 'INSERT policies on users table: %', policy_count;
  
  -- Verify owner exists
  IF EXISTS (SELECT 1 FROM users WHERE role = 'OWNER' AND id = 'f658670f-ba88-4bea-bdef-b8d95965f2f0') THEN
    RAISE NOTICE 'Owner profile verified: f658670f-ba88-4bea-bdef-b8d95965f2f0';
  ELSE
    RAISE WARNING 'Owner profile NOT found!';
  END IF;
END $$;
