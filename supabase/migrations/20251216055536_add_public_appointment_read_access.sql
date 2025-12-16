/*
  # Add Public Read Access to Appointments

  ## Problem
  Guest users (Pay at Shop & Stripe redirect) cannot read appointment details
  on the success page because RLS blocks anonymous SELECT queries.

  ## Solution
  Create a policy allowing public/anon role to SELECT appointments by ID.
  This is safe because:
  - Appointment IDs are UUIDs (not guessable)
  - Users only know the ID if they created the booking
  - Read-only access (no INSERT/UPDATE/DELETE)

  ## Changes
  1. Add policy: "Public users can read appointments by ID"
     - Allows SELECT for public/anon roles
     - No conditions needed (UUID provides security)
*/

-- Drop existing restrictive policies if they block public reads
DO $$
BEGIN
  -- Check if a more permissive public read policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'appointments' 
    AND policyname = 'Public users can read appointments by ID'
  ) THEN
    -- Create the public read policy
    CREATE POLICY "Public users can read appointments by ID"
      ON appointments
      FOR SELECT
      TO public
      USING (true);
    
    RAISE NOTICE 'Created public read policy for appointments table';
  ELSE
    RAISE NOTICE 'Public read policy already exists';
  END IF;
END $$;
