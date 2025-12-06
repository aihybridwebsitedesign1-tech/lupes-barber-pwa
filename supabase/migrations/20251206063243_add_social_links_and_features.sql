/*
  # Add Social Media Links and Additional Features

  1. Barber Social Media Links
    - instagram_url (text, nullable)
    - tiktok_url (text, nullable)
    - facebook_url (text, nullable)
    - website_url (text, nullable)
  
  2. Shop Social Media Links (shop_config table)
    - shop_instagram_url (text, nullable)
    - shop_facebook_url (text, nullable)
    - shop_tiktok_url (text, nullable)
    - shop_website_url (text, nullable)
  
  ## Security
  - No RLS changes needed; existing policies cover these fields
  
  ## Notes
  - All fields are optional/nullable
  - URLs are stored as plain text
  - Owner/barbers can manage their own social links
*/

-- Add social media links to users table (for barbers)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'instagram_url'
  ) THEN
    ALTER TABLE users ADD COLUMN instagram_url text;
    COMMENT ON COLUMN users.instagram_url IS 'Instagram profile URL (for barbers public profiles)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'tiktok_url'
  ) THEN
    ALTER TABLE users ADD COLUMN tiktok_url text;
    COMMENT ON COLUMN users.tiktok_url IS 'TikTok profile URL (for barbers public profiles)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'facebook_url'
  ) THEN
    ALTER TABLE users ADD COLUMN facebook_url text;
    COMMENT ON COLUMN users.facebook_url IS 'Facebook profile URL (for barbers public profiles)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'website_url'
  ) THEN
    ALTER TABLE users ADD COLUMN website_url text;
    COMMENT ON COLUMN users.website_url IS 'Personal website URL (for barbers public profiles)';
  END IF;
END $$;

-- Add social media links to shop_config table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shop_config' AND column_name = 'shop_instagram_url'
  ) THEN
    ALTER TABLE shop_config ADD COLUMN shop_instagram_url text;
    COMMENT ON COLUMN shop_config.shop_instagram_url IS 'Shop Instagram profile URL';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shop_config' AND column_name = 'shop_facebook_url'
  ) THEN
    ALTER TABLE shop_config ADD COLUMN shop_facebook_url text;
    COMMENT ON COLUMN shop_config.shop_facebook_url IS 'Shop Facebook page URL';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shop_config' AND column_name = 'shop_tiktok_url'
  ) THEN
    ALTER TABLE shop_config ADD COLUMN shop_tiktok_url text;
    COMMENT ON COLUMN shop_config.shop_tiktok_url IS 'Shop TikTok profile URL';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shop_config' AND column_name = 'shop_website_url'
  ) THEN
    ALTER TABLE shop_config ADD COLUMN shop_website_url text;
    COMMENT ON COLUMN shop_config.shop_website_url IS 'Shop website URL';
  END IF;
END $$;
