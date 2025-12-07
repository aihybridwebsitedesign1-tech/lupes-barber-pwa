/*
  # Create Storage Buckets for Images

  1. Overview
    Creates Supabase Storage buckets for storing barber photos, service images,
    and product images with proper permissions.

  2. New Buckets
    - `barber-photos`: Profile photos for barbers
    - `service-images`: Images for services displayed to clients
    - `product-images`: Images for products in the shop

  3. Permissions
    - Public read access: Anyone can view images (needed for client site)
    - Authenticated write access: Only authenticated owners/barbers can upload
    - Owners can upload/manage all images
    - Barbers can only upload their own profile photo

  4. Security
    - File size limits enforced at application layer
    - File type validation enforced at application layer
    - RLS policies control upload permissions
*/

-- Enable storage schema if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create barber-photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'barber-photos',
  'barber-photos',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[];

-- Create service-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-images',
  'service-images',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[];

-- Create product-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[];

-- Storage policies for barber-photos

-- Policy: Anyone can view barber photos (public read)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Public can view barber photos'
  ) THEN
    CREATE POLICY "Public can view barber photos"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'barber-photos');
  END IF;
END $$;

-- Policy: Owners can upload any barber photo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Owners can upload barber photos'
  ) THEN
    CREATE POLICY "Owners can upload barber photos"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'barber-photos' AND
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role = 'OWNER'
        )
      );
  END IF;
END $$;

-- Policy: Barbers can upload their own photo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Barbers can upload own photo'
  ) THEN
    CREATE POLICY "Barbers can upload own photo"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'barber-photos' AND
        (storage.foldername(name))[1] = 'barbers/' || auth.uid()::text
      );
  END IF;
END $$;

-- Policy: Owners can update any barber photo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Owners can update barber photos'
  ) THEN
    CREATE POLICY "Owners can update barber photos"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'barber-photos' AND
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role = 'OWNER'
        )
      );
  END IF;
END $$;

-- Policy: Owners can delete any barber photo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Owners can delete barber photos'
  ) THEN
    CREATE POLICY "Owners can delete barber photos"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'barber-photos' AND
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role = 'OWNER'
        )
      );
  END IF;
END $$;

-- Storage policies for service-images

-- Policy: Anyone can view service images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Public can view service images'
  ) THEN
    CREATE POLICY "Public can view service images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'service-images');
  END IF;
END $$;

-- Policy: Owners can manage service images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Owners can manage service images'
  ) THEN
    CREATE POLICY "Owners can manage service images"
      ON storage.objects FOR ALL
      TO authenticated
      USING (
        bucket_id = 'service-images' AND
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role = 'OWNER'
        )
      )
      WITH CHECK (
        bucket_id = 'service-images' AND
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role = 'OWNER'
        )
      );
  END IF;
END $$;

-- Policy: Barbers with permission can manage service images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Barbers with permission can manage service images'
  ) THEN
    CREATE POLICY "Barbers with permission can manage service images"
      ON storage.objects FOR ALL
      TO authenticated
      USING (
        bucket_id = 'service-images' AND
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role = 'BARBER'
          AND users.can_manage_services = true
        )
      )
      WITH CHECK (
        bucket_id = 'service-images' AND
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role = 'BARBER'
          AND users.can_manage_services = true
        )
      );
  END IF;
END $$;

-- Storage policies for product-images

-- Policy: Anyone can view product images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Public can view product images'
  ) THEN
    CREATE POLICY "Public can view product images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'product-images');
  END IF;
END $$;

-- Policy: Owners can manage product images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Owners can manage product images'
  ) THEN
    CREATE POLICY "Owners can manage product images"
      ON storage.objects FOR ALL
      TO authenticated
      USING (
        bucket_id = 'product-images' AND
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role = 'OWNER'
        )
      )
      WITH CHECK (
        bucket_id = 'product-images' AND
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role = 'OWNER'
        )
      );
  END IF;
END $$;

-- Policy: Barbers with permission can manage product images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Barbers with permission can manage product images'
  ) THEN
    CREATE POLICY "Barbers with permission can manage product images"
      ON storage.objects FOR ALL
      TO authenticated
      USING (
        bucket_id = 'product-images' AND
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role = 'BARBER'
          AND users.can_manage_products = true
        )
      )
      WITH CHECK (
        bucket_id = 'product-images' AND
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role = 'BARBER'
          AND users.can_manage_products = true
        )
      );
  END IF;
END $$;