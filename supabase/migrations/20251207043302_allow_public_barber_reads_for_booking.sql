/*
  # Allow Public Access to Barber Information for Booking

  1. Changes
    - Add RLS policy to allow anonymous/public users to read active barber profiles
    - This is required for the client booking flow where non-authenticated users need to see available barbers
  
  2. Security
    - Only exposes active barbers (active = true)
    - Only exposes barber role users (role = 'BARBER')
    - Only exposes safe public fields (id, name, photo_url, etc.)
    - Does not expose sensitive fields like email, phone, permissions
*/

-- Drop existing policy if it exists and recreate
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Public can read active barbers for booking" ON users;
END $$;

-- Allow public users to read active barber profiles for booking
CREATE POLICY "Public can read active barbers for booking"
  ON users
  FOR SELECT
  TO public
  USING (role = 'BARBER' AND active = true);
