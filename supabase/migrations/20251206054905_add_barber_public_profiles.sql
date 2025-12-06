/*
  # Add Public Profile Fields for Barbers

  This migration adds fields to support public barber profiles on the client-facing site.

  ## New Fields Added to `users` table
  
  1. **show_on_client_site** (boolean)
     - Controls whether this barber appears on the public "Our Barbers" page
     - Default: false (barbers are hidden by default)
  
  2. **public_display_name** (text, nullable)
     - Optional custom name to display on the public site
     - Falls back to the barber's real name if not set
  
  3. **bio** (text, nullable)
     - Short biography or description of the barber for the public site
     - Displayed on barber profile cards
  
  4. **specialties** (text, nullable)
     - Free-text field listing barber's specialties
     - Example: "Fades, beard trims, kids cuts"
  
  5. **photo_url** (text, nullable)
     - URL to barber's profile photo for public display
     - Falls back to initials if not set

  ## Security
  
  - No RLS changes needed; existing policies already cover these fields
  - These fields are read-only for clients (no direct client access to users table)
  
  ## Notes
  
  - All fields are optional to avoid breaking existing barber records
  - Owners can configure these fields through the barber management UI
  - Public site queries only barbers where show_on_client_site = true
*/

-- Add public profile fields to users table
DO $$
BEGIN
  -- Add show_on_client_site field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'show_on_client_site'
  ) THEN
    ALTER TABLE users ADD COLUMN show_on_client_site boolean DEFAULT false;
    COMMENT ON COLUMN users.show_on_client_site IS 'Whether this barber appears on the public client-facing site';
  END IF;

  -- Add public_display_name field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'public_display_name'
  ) THEN
    ALTER TABLE users ADD COLUMN public_display_name text;
    COMMENT ON COLUMN users.public_display_name IS 'Optional custom display name for public site (falls back to name)';
  END IF;

  -- Add bio field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'bio'
  ) THEN
    ALTER TABLE users ADD COLUMN bio text;
    COMMENT ON COLUMN users.bio IS 'Short biography or description for public barber profile';
  END IF;

  -- Add specialties field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'specialties'
  ) THEN
    ALTER TABLE users ADD COLUMN specialties text;
    COMMENT ON COLUMN users.specialties IS 'Free-text list of barber specialties (e.g., "Fades, beard trims, kids cuts")';
  END IF;

  -- Add photo_url field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE users ADD COLUMN photo_url text;
    COMMENT ON COLUMN users.photo_url IS 'URL to barber profile photo for public display';
  END IF;
END $$;
