/*
  # Fix Owner Can Update Barber Active Status

  ## Problem
  Current RLS policy "Users can update own profile" only allows users to update their own record.
  This prevents OWNER from updating barber active status and permissions.

  ## Solution
  Add a new policy that allows OWNER role to update any user record.
  
  ## Changes
  - Add policy "Owners can update any user" with OWNER role check
  - Uses app_metadata.role = 'OWNER' from JWT to avoid recursive queries
  
  ## Security
  - Only affects users with OWNER role in their JWT
  - Maintains existing policy for users updating their own profile
*/

-- Allow owners to update any user (for managing barber permissions and active status)
CREATE POLICY "Owners can update any user"
  ON users FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'OWNER'
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'OWNER'
  );
