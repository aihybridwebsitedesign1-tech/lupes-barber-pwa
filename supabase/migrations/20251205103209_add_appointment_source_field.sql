/*
  # Add source tracking to appointments

  1. Changes
    - Add `source` field to appointments table to track booking origin
    - Values: 'owner', 'barber', 'client_web', 'walk_in'
    - Default to 'owner' for existing appointments
    - Allows tracking of client web bookings vs owner/barber bookings

  2. Notes
    - Non-breaking change: uses DEFAULT for existing rows
    - Enables analytics on booking channels
    - Can be used for commission rules in future
*/

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS source text DEFAULT 'owner';

COMMENT ON COLUMN appointments.source IS 'Source of booking: owner, barber, client_web, walk_in';
