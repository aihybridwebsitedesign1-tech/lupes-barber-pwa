/*
  # Allow null barber_id for unassigned appointments

  ## Changes
  
  1. Modified Columns
    - `appointments.barber_id` - Changed to allow NULL values
      - This enables creating appointments without an assigned barber
      - Clients booking online via /book will create unassigned appointments
      - Owner/manager will assign barbers later in the workflow
  
  2. Business Rules
    - Public /book flow creates appointments with barber_id = NULL
    - Owner "New Appointment" modal can still assign a barber immediately
    - Barber dashboards filter to show only their assigned appointments
    - Owner dashboard shows "Unassigned" for NULL barber_id
  
  ## Notes
  
  - Existing appointments are unaffected (all have barber_id values)
  - Foreign key constraint on barber_id remains (validates when not NULL)
  - RLS policies continue to work correctly
  - No breaking changes to existing functionality
*/

-- Allow barber_id to be NULL for unassigned appointments
ALTER TABLE appointments
ALTER COLUMN barber_id DROP NOT NULL;
