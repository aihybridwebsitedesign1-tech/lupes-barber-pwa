/*
  # Add accept_online_bookings flag for barbers

  1. Changes
    - Add `accept_online_bookings` boolean column to users table
    - Default to true for new records
    - Backfill existing active barbers who have show_on_client_site=true
    
  2. Purpose
    - Allow owners to control which barbers appear in the public booking flow
    - Separate from show_on_client_site (which controls "Our Barbers" page)
    - Direct booking links will bypass this flag but still require active=true
    
  3. Security
    - Update RLS policy to include accept_online_bookings in public booking queries
*/

-- Add the column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS accept_online_bookings boolean DEFAULT true;

-- Add helpful comment
COMMENT ON COLUMN users.accept_online_bookings IS 'Whether this barber accepts online bookings through the public booking flow. Direct links still work if active=true.';

-- Backfill existing barbers: set to true for active barbers with show_on_client_site=true
UPDATE users
SET accept_online_bookings = true
WHERE role = 'BARBER' 
  AND active = true 
  AND show_on_client_site = true
  AND accept_online_bookings IS NULL;

-- Set to false for barbers who are either inactive or hidden from client site
UPDATE users
SET accept_online_bookings = false
WHERE role = 'BARBER'
  AND (active = false OR show_on_client_site = false OR show_on_client_site IS NULL)
  AND accept_online_bookings IS NULL;

-- Update the public RLS policy for barbers to include accept_online_bookings
DROP POLICY IF EXISTS "Public can read active barbers for booking" ON users;

CREATE POLICY "Public can read active barbers for booking"
  ON users FOR SELECT
  TO public
  USING (
    role = 'BARBER' 
    AND active = true 
    AND show_on_client_site = true
    AND accept_online_bookings = true
  );

-- Also add a policy for reading a SPECIFIC barber by ID (for direct booking links)
-- This allows anonymous users to read a specific barber even if accept_online_bookings=false
CREATE POLICY "Public can read specific barber for direct booking link"
  ON users FOR SELECT
  TO public
  USING (
    role = 'BARBER' 
    AND active = true
    -- No check on accept_online_bookings or show_on_client_site for direct links
  );
