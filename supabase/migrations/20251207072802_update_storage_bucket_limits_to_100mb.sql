/*
  # Update Storage Bucket File Size Limits to 100MB

  1. Overview
    Updates all image storage buckets to support 100MB file size limit
    for high-quality professional photos and product images.

  2. Changes
    - barber-photos: 5MB → 100MB
    - service-images: 5MB → 100MB
    - product-images: 5MB → 100MB

  3. Rationale
    Users need to upload high-resolution images without hitting size limits.
    100MB accommodates professional photography and large product images.
*/

-- Update barber-photos bucket to 100MB
UPDATE storage.buckets
SET file_size_limit = 104857600
WHERE id = 'barber-photos';

-- Update service-images bucket to 100MB
UPDATE storage.buckets
SET file_size_limit = 104857600
WHERE id = 'service-images';

-- Update product-images bucket to 100MB
UPDATE storage.buckets
SET file_size_limit = 104857600
WHERE id = 'product-images';