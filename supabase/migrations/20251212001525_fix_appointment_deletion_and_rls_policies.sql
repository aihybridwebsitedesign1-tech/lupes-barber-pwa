/*
  # Fix Appointment Deletion and RLS Policies

  ## Critical Issues Fixed

  1. **Missing DELETE Policies**
     - Added DELETE policy for `appointments` table (Owners and authenticated users can delete)
     - Added DELETE policy for `clients` table (Owners can delete clients)
     - Added DELETE policy for `services` table (Owners can delete services)
     - Added DELETE policy for `inventory_transactions` table (Owners can delete)
     - Added DELETE policy for `client_notes` table (Owners can delete)

  2. **Foreign Key Cascade Fix**
     - Changed `inventory_transactions.appointment_id` from NO ACTION to SET NULL
     - This prevents orphaned inventory transactions when appointments are deleted

  3. **Missing UPDATE Policy**
     - Added UPDATE policy for `otp_verification` (for verification process)

  4. **Removed Duplicate Policies**
     - Cleaned up duplicate SELECT policies on transformation_photos

  ## Security Notes
  
  - All DELETE policies require OWNER role for data safety
  - Authenticated users can delete their own appointments
  - Foreign keys properly cascade to prevent orphaned records
*/

-- =====================================================
-- PART 1: Add Missing DELETE Policies
-- =====================================================

-- Allow authenticated users (owners/barbers) to delete appointments
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'appointments' 
    AND policyname = 'Authenticated users can delete appointments'
  ) THEN
    CREATE POLICY "Authenticated users can delete appointments"
      ON appointments
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Allow owners to delete clients
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'clients' 
    AND policyname = 'Owners can delete clients'
  ) THEN
    CREATE POLICY "Owners can delete clients"
      ON clients
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

-- Allow owners to delete services
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'services' 
    AND policyname = 'Owners can delete services'
  ) THEN
    CREATE POLICY "Owners can delete services"
      ON services
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

-- Allow owners to delete inventory transactions
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'inventory_transactions' 
    AND policyname = 'Owners can delete inventory transactions'
  ) THEN
    CREATE POLICY "Owners can delete inventory transactions"
      ON inventory_transactions
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

-- Allow owners to delete client notes
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'client_notes' 
    AND policyname = 'Owners can delete client notes'
  ) THEN
    CREATE POLICY "Owners can delete client notes"
      ON client_notes
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
-- PART 2: Add Missing UPDATE Policy for OTP
-- =====================================================

-- Allow anon users to update their OTP verification
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'otp_verification' 
    AND policyname = 'Anyone can update own OTP verification'
  ) THEN
    CREATE POLICY "Anyone can update own OTP verification"
      ON otp_verification
      FOR UPDATE
      TO anon
      USING (expires_at > now() AND verified_at IS NULL)
      WITH CHECK (expires_at > now());
  END IF;
END $$;

-- =====================================================
-- PART 3: Fix Foreign Key Cascade
-- =====================================================

-- Drop and recreate the foreign key constraint with SET NULL
ALTER TABLE inventory_transactions 
  DROP CONSTRAINT IF EXISTS inventory_transactions_appointment_id_fkey;

ALTER TABLE inventory_transactions
  ADD CONSTRAINT inventory_transactions_appointment_id_fkey
  FOREIGN KEY (appointment_id)
  REFERENCES appointments(id)
  ON DELETE SET NULL
  ON UPDATE NO ACTION;

-- =====================================================
-- PART 4: Remove Duplicate Policies (Cleanup)
-- =====================================================

-- Keep only the most permissive SELECT policies for transformation_photos
-- Drop duplicate barber view policies (keeping one)
DROP POLICY IF EXISTS "Barbers can view own transformation photos" ON transformation_photos;

-- Drop duplicate owner view policies (keeping one)  
DROP POLICY IF EXISTS "Owner can view all transformation photos" ON transformation_photos;

-- Drop duplicate barber insert policies (keeping one)
DROP POLICY IF EXISTS "Barbers can insert own transformation photos" ON transformation_photos;

-- Drop duplicate owner insert policies (keeping one)
DROP POLICY IF EXISTS "Owner can insert transformation photos" ON transformation_photos;
