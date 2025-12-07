/*
  # Sync User Role to Auth Metadata

  1. Problem
    - RLS policies check `auth.jwt() -> 'app_metadata' -> 'role'`
    - But `raw_app_meta_data` in `auth.users` doesn't contain role by default
    - This causes RLS policies to block legitimate updates even when frontend checks pass

  2. Solution
    - Create a function that syncs role from `public.users` to `auth.users.raw_app_meta_data`
    - Create triggers to run this function on INSERT/UPDATE
    - Backfill existing users

  3. Changes
    - Function: `sync_user_role_to_auth_metadata()`
    - Triggers on `public.users` for INSERT and UPDATE
    - Update all existing auth.users records with role from public.users
*/

-- Function to sync role from public.users to auth.users metadata
CREATE OR REPLACE FUNCTION sync_user_role_to_auth_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the auth.users table to include role in app_metadata
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(NEW.role)
  )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on INSERT
DROP TRIGGER IF EXISTS sync_user_role_on_insert ON public.users;
CREATE TRIGGER sync_user_role_on_insert
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_role_to_auth_metadata();

-- Trigger on UPDATE (only when role changes)
DROP TRIGGER IF EXISTS sync_user_role_on_update ON public.users;
CREATE TRIGGER sync_user_role_on_update
  AFTER UPDATE OF role ON public.users
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION sync_user_role_to_auth_metadata();

-- Backfill: Sync existing users' roles to auth metadata
UPDATE auth.users au
SET raw_app_meta_data = jsonb_set(
  COALESCE(au.raw_app_meta_data, '{}'::jsonb),
  '{role}',
  to_jsonb(pu.role)
)
FROM public.users pu
WHERE au.id = pu.id;
