-- Create Transformations Storage Bucket
-- 1. New Storage Bucket: transformations for before/after transformation photos
-- 2. 100MB file size limit, allowed types: image/*
-- 3. Public read access, authenticated write/delete

-- Create transformations bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'transformations',
  'transformations',
  true,
  104857600,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view transformation images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload transformation images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own transformation images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own transformation images" ON storage.objects;

-- Policy: Anyone can view transformation images (public read)
CREATE POLICY "Anyone can view transformation images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'transformations');

-- Policy: Authenticated users can upload transformation images
CREATE POLICY "Authenticated users can upload transformation images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'transformations' AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.active = true
    )
  );

-- Policy: Users can update their own transformation images
CREATE POLICY "Users can update their own transformation images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'transformations')
  WITH CHECK (bucket_id = 'transformations');

-- Policy: Users can delete their own transformation images  
CREATE POLICY "Users can delete their own transformation images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'transformations');
