/*
  # Update Transformation Photos Schema

  1. Changes to existing transformation_photos table:
    - Remove `type` and `notes` columns (old schema)
    - Add `before_image_url` (text, nullable)
    - Add `after_image_url` (text, required)
    - Add `created_by` (uuid, FK to users)
    - Add `is_featured` (boolean, default false)

  2. Add permission to users table:
    - Add `can_manage_transformation_photos` (boolean, default true)

  3. Update RLS policies to match new schema and permissions
*/

-- Add can_manage_transformation_photos permission to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'can_manage_transformation_photos'
  ) THEN
    ALTER TABLE users ADD COLUMN can_manage_transformation_photos boolean DEFAULT true;
  END IF;
END $$;

-- Drop old columns if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transformation_photos' AND column_name = 'type') THEN
    ALTER TABLE transformation_photos DROP COLUMN type;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transformation_photos' AND column_name = 'notes') THEN
    ALTER TABLE transformation_photos DROP COLUMN notes;
  END IF;
END $$;

-- Rename image_url to after_image_url if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transformation_photos' AND column_name = 'image_url') THEN
    ALTER TABLE transformation_photos RENAME COLUMN image_url TO after_image_url;
  END IF;
END $$;

-- Add new columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transformation_photos' AND column_name = 'before_image_url') THEN
    ALTER TABLE transformation_photos ADD COLUMN before_image_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transformation_photos' AND column_name = 'created_by') THEN
    ALTER TABLE transformation_photos ADD COLUMN created_by uuid REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transformation_photos' AND column_name = 'is_featured') THEN
    ALTER TABLE transformation_photos ADD COLUMN is_featured boolean DEFAULT false;
  END IF;
END $$;

-- Make after_image_url NOT NULL (if data exists, make sure it has values first)
ALTER TABLE transformation_photos ALTER COLUMN after_image_url SET NOT NULL;

-- Drop all existing policies on transformation_photos
DROP POLICY IF EXISTS "Owner can view all transformation photos" ON transformation_photos;
DROP POLICY IF EXISTS "Owner can insert transformation photos" ON transformation_photos;
DROP POLICY IF EXISTS "Owner can update all transformation photos" ON transformation_photos;
DROP POLICY IF EXISTS "Owner can delete all transformation photos" ON transformation_photos;
DROP POLICY IF EXISTS "Barbers can view own transformation photos" ON transformation_photos;
DROP POLICY IF EXISTS "Barbers can insert own transformation photos" ON transformation_photos;
DROP POLICY IF EXISTS "Barbers can update own transformation photos" ON transformation_photos;
DROP POLICY IF EXISTS "Barbers can delete own transformation photos" ON transformation_photos;
DROP POLICY IF EXISTS "Authenticated users can read transformation photos" ON transformation_photos;
DROP POLICY IF EXISTS "Authenticated users can insert transformation photos" ON transformation_photos;
DROP POLICY IF EXISTS "Authenticated users can update transformation photos" ON transformation_photos;
DROP POLICY IF EXISTS "Authenticated users can delete transformation photos" ON transformation_photos;

-- Create new RLS policies

-- Owner can view all transformation photos
CREATE POLICY "Owner can view all transformation photos"
  ON transformation_photos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'OWNER'
    )
  );

-- Owner can insert transformation photos for any appointment
CREATE POLICY "Owner can insert transformation photos"
  ON transformation_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'OWNER'
    )
  );

-- Owner can update all transformation photos
CREATE POLICY "Owner can update all transformation photos"
  ON transformation_photos
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'OWNER'
    )
  );

-- Owner can delete all transformation photos
CREATE POLICY "Owner can delete all transformation photos"
  ON transformation_photos
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'OWNER'
    )
  );

-- Barbers can view their own transformation photos
CREATE POLICY "Barbers can view own transformation photos"
  ON transformation_photos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.id = transformation_photos.barber_id
      AND users.role = 'BARBER'
    )
  );

-- Barbers can insert their own transformation photos
CREATE POLICY "Barbers can insert own transformation photos"
  ON transformation_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.id = transformation_photos.barber_id
      AND users.role = 'BARBER'
      AND users.can_manage_transformation_photos = true
    )
  );

-- Barbers can update their own transformation photos
CREATE POLICY "Barbers can update own transformation photos"
  ON transformation_photos
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.id = transformation_photos.barber_id
      AND users.role = 'BARBER'
      AND users.can_manage_transformation_photos = true
    )
  );

-- Barbers can delete their own transformation photos
CREATE POLICY "Barbers can delete own transformation photos"
  ON transformation_photos
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.id = transformation_photos.barber_id
      AND users.role = 'BARBER'
      AND users.can_manage_transformation_photos = true
    )
  );

-- Update comments
COMMENT ON TABLE transformation_photos IS 'Before/after transformation photos for completed appointments';
COMMENT ON COLUMN transformation_photos.before_image_url IS 'Optional before photo URL from Supabase Storage';
COMMENT ON COLUMN transformation_photos.after_image_url IS 'Required after photo URL from Supabase Storage';
COMMENT ON COLUMN transformation_photos.is_featured IS 'Whether this transformation should be featured in marketing/gallery';
COMMENT ON COLUMN transformation_photos.created_by IS 'User who uploaded this transformation';
