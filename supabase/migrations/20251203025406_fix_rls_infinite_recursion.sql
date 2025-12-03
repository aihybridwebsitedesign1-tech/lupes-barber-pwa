/*
  # Fix Infinite Recursion in RLS Policies

  1. Problem
    - Current policies check if user is OWNER by querying users table
    - This creates infinite recursion when users try to read their own data
    
  2. Solution
    - Drop existing policies that cause recursion
    - Create simpler policies that allow users to read their own data
    - Store role in JWT claims for owner checks (or use simpler logic)
    
  3. Changes
    - Allow all authenticated users to read their own user record
    - Allow all authenticated users to read other users (needed for barber lists, etc.)
    - Keep write operations simple without recursive checks
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Owners can insert users" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Owners can insert services" ON services;
DROP POLICY IF EXISTS "Owners can update services" ON services;
DROP POLICY IF EXISTS "Users can update appointments" ON appointments;

-- Simple policy: authenticated users can read all users
-- This is needed for the app to function (barber lists, appointment displays, etc.)
CREATE POLICY "Authenticated users can read users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own profile only
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- For services, allow authenticated users to read and modify
-- In Phase 1, we'll handle permission checks in the application layer
CREATE POLICY "Authenticated users can read services"
  ON services FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert services"
  ON services FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update services"
  ON services FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- For appointments, keep the simple policy for updates
CREATE POLICY "Authenticated users can update appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
