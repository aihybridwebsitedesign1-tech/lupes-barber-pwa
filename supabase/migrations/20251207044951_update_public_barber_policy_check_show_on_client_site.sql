/*
  # Update Public Barber Access Policy

  1. Changes
    - Update the public barber read policy to also check show_on_client_site = true
    - This ensures only barbers who want to be visible on the client website appear in the booking flow
  
  2. Security
    - Only exposes barbers who are: active, have role BARBER, AND have show_on_client_site enabled
    - Maintains public read access for the booking flow
*/

-- Drop and recreate the policy with the additional check
DROP POLICY IF EXISTS "Public can read active barbers for booking" ON users;

CREATE POLICY "Public can read active barbers for booking"
  ON users
  FOR SELECT
  TO public
  USING (role = 'BARBER' AND active = true AND show_on_client_site = true);
