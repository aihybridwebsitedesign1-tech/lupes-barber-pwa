/*
  # Add image_url column to services table

  ## Changes
  
  1. Modified Columns
    - `services.image_url` (text, nullable) - URL for service image
      - Optional field for displaying service images in UI
      - Can be uploaded file URL or external image URL
      - Null allowed for services without images
  
  ## Notes
  
  - Non-breaking change - adds optional column
  - Existing services will have NULL image_url
  - No data migration required
  - All existing functionality continues to work
*/

-- Add image_url column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE services ADD COLUMN image_url text;
  END IF;
END $$;
