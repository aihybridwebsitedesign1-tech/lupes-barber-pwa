/*
  # Fix Auth/Database User Mismatch
  
  ## Critical Issue
  
  The real Supabase Auth user (f658670f-ba88-4bea-bdef-b8d95965f2f0) does NOT exist in public.users table.
  Three placeholder/orphan users exist in public.users that have no corresponding auth.users records.
  
  ## This Migration Does
  
  1. **Delete Orphan Users** (3 placeholder users with no auth records)
     - 457ff073-8136-4e4a-8f16-73f45331a759 (Lupe Owner - wrong ID)
     - b7468ac0-276c-4515-b65a-3997131a11a6 (Carlos Martinez - demo barber)
     - 1d3f38ac-baee-49e6-9ee9-a971491292fd (Mike Johnson - demo barber)
     
  2. **CASCADE Delete Related Records**
     - barber_schedules: 14 rows total (7 per barber) - AUTO CASCADE
     - barber_services: AUTO CASCADE if any
     - barber_time_entries: AUTO CASCADE if any
     - barber_time_off: AUTO CASCADE if any
     - payouts: AUTO CASCADE if any
     - appointments: barber_id will be SET NULL (foreign key already configured)
     
  3. **Create Correct Owner Profile**
     - id: f658670f-ba88-4bea-bdef-b8d95965f2f0 (matches auth.users)
     - name: Lupe (Owner)
     - email: lupesbarbershop2025@gmail.com
     - role: OWNER
     - All owner permissions enabled
  
  ## Safety
  
  - All foreign keys already configured with proper CASCADE/SET NULL
  - No orphaned records will remain
  - Owner can immediately log in after this migration
  
  ## Expected Results
  
  - Orphan users deleted: 3
  - Barber schedules deleted: 14 (via CASCADE)
  - Owner profile created: 1
  - Auth/DB alignment: FIXED
*/

-- =====================================================
-- PART 1: Delete Orphan Users (CASCADE handles children)
-- =====================================================

-- Delete orphan user 1: Wrong Lupe Owner ID
DELETE FROM users 
WHERE id = '457ff073-8136-4e4a-8f16-73f45331a759';

-- Delete orphan user 2: Carlos Martinez (demo barber)
DELETE FROM users 
WHERE id = 'b7468ac0-276c-4515-b65a-3997131a11a6';

-- Delete orphan user 3: Mike Johnson (demo barber)
DELETE FROM users 
WHERE id = '1d3f38ac-baee-49e6-9ee9-a971491292fd';

-- =====================================================
-- PART 2: Create Correct Owner Profile
-- =====================================================

-- Insert owner profile that matches the real auth.users ID
INSERT INTO users (
  id,
  name,
  phone,
  email,
  role,
  language,
  active,
  -- Owner permissions
  can_view_shop_reports,
  can_view_own_stats,
  can_manage_services,
  can_manage_products,
  can_manage_barbers,
  can_manage_schedules,
  can_manage_appointments,
  can_manage_clients,
  can_send_sms,
  can_manage_transformation_photos,
  -- Barber settings
  accept_online_bookings,
  show_on_client_site,
  -- Commission rates (defaults)
  service_commission_rate,
  product_commission_rate,
  tip_commission_rate,
  -- Timestamps
  created_at,
  updated_at
) VALUES (
  'f658670f-ba88-4bea-bdef-b8d95965f2f0',  -- Real auth.users ID
  'Lupe (Owner)',
  '555-0100',
  'lupesbarbershop2025@gmail.com',
  'OWNER',
  'en',
  true,
  -- All owner permissions enabled
  true,  -- can_view_shop_reports
  true,  -- can_view_own_stats
  true,  -- can_manage_services
  true,  -- can_manage_products
  true,  -- can_manage_barbers
  true,  -- can_manage_schedules
  true,  -- can_manage_appointments
  true,  -- can_manage_clients
  true,  -- can_send_sms
  true,  -- can_manage_transformation_photos
  -- Barber settings (N/A for owner but set for completeness)
  true,  -- accept_online_bookings
  false, -- show_on_client_site (owner doesn't show on client booking)
  -- Commission rates (standard defaults)
  0.5000,  -- service_commission_rate (50%)
  0.1000,  -- product_commission_rate (10%)
  1.0000,  -- tip_commission_rate (100%)
  -- Timestamps
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  active = EXCLUDED.active,
  can_view_shop_reports = EXCLUDED.can_view_shop_reports,
  can_view_own_stats = EXCLUDED.can_view_own_stats,
  can_manage_services = EXCLUDED.can_manage_services,
  can_manage_products = EXCLUDED.can_manage_products,
  can_manage_barbers = EXCLUDED.can_manage_barbers,
  can_manage_schedules = EXCLUDED.can_manage_schedules,
  can_manage_appointments = EXCLUDED.can_manage_appointments,
  can_manage_clients = EXCLUDED.can_manage_clients,
  can_send_sms = EXCLUDED.can_send_sms,
  can_manage_transformation_photos = EXCLUDED.can_manage_transformation_photos,
  updated_at = now();

-- =====================================================
-- PART 3: Sync role to auth.users metadata
-- =====================================================

-- Update auth.users metadata to include role
-- This ensures RLS policies that check auth.jwt() work correctly
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"OWNER"'
)
WHERE id = 'f658670f-ba88-4bea-bdef-b8d95965f2f0';

-- =====================================================
-- PART 4: Verification Query (for logs)
-- =====================================================

-- This will be logged for verification
DO $$
DECLARE
  user_count int;
  auth_count int;
BEGIN
  -- Count users in public.users
  SELECT COUNT(*) INTO user_count FROM users;
  
  -- Count users in auth.users
  SELECT COUNT(*) INTO auth_count FROM auth.users;
  
  RAISE NOTICE 'Migration complete:';
  RAISE NOTICE '  - Users in public.users: %', user_count;
  RAISE NOTICE '  - Users in auth.users: %', auth_count;
  RAISE NOTICE '  - Owner profile created for: f658670f-ba88-4bea-bdef-b8d95965f2f0';
END $$;
