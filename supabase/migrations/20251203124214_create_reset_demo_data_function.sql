/*
  # Create reset_demo_data function

  1. Purpose
    - Provides a SECURITY DEFINER function to delete all demo/appointment data
    - Bypasses RLS policies for reliable deletion
    - Called from Owner Settings "Delete All Appointments & Demo Data"

  2. Tables Cleared (in FK-safe order)
    - appointment_products
    - transformation_photos
    - barber_time_off
    - barber_schedules
    - client_notes (if exists)
    - appointments
    - clients

  3. Tables NOT Touched
    - users (barbers and owner)
    - services
    - products
    - shop_config
    - All other configuration tables

  4. Security
    - SECURITY DEFINER runs with function owner privileges
    - Bypasses RLS policies
    - Granted to authenticated users (owner can call it)
*/

-- Drop function if it exists (for idempotency)
DROP FUNCTION IF EXISTS public.reset_demo_data();

-- Create the reset function
CREATE OR REPLACE FUNCTION public.reset_demo_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete in FK-safe order (children before parents)

  -- 1. Delete appointment products (FK to appointments)
  DELETE FROM public.appointment_products;

  -- 2. Delete transformation photos (FK to appointments)
  DELETE FROM public.transformation_photos;

  -- 3. Delete barber time off (independent)
  DELETE FROM public.barber_time_off;

  -- 4. Delete barber schedules (independent)
  DELETE FROM public.barber_schedules;

  -- 5. Delete client notes (FK to clients) - handle if table doesn't exist
  BEGIN
    DELETE FROM public.client_notes;
  EXCEPTION
    WHEN undefined_table THEN
      -- Table doesn't exist, skip silently
      NULL;
  END;

  -- 6. Delete appointments (FK to clients)
  DELETE FROM public.appointments;

  -- 7. Delete clients (independent after appointments deleted)
  DELETE FROM public.clients;

  -- Success - no return value needed
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.reset_demo_data() TO authenticated;