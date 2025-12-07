# Image Upload System Documentation

## Overview

The barbershop application uses Supabase Storage for managing all images including barber profile photos, service images, and product images. This document describes the complete image storage architecture, upload flows, and security model.

## Storage Buckets

### Created Buckets

Three public buckets store all application images:

1. **`barber-photos`**
   - Purpose: Barber profile photos
   - Path convention: `barbers/{barber_id}/{timestamp}_{filename}`
   - Max size: 100MB per file
   - Allowed types: JPG, JPEG, PNG, WEBP

2. **`service-images`**
   - Purpose: Service promotional images
   - Path convention: `services/{service_id}/{timestamp}_{filename}`
   - Max size: 100MB per file
   - Allowed types: JPG, JPEG, PNG, WEBP

3. **`product-images`**
   - Purpose: Product catalog images
   - Path convention: `products/{product_id}/{timestamp}_{filename}`
   - Max size: 100MB per file
   - Allowed types: JPG, JPEG, PNG, WEBP

### Bucket Configuration

All buckets are configured with:
- **Public access**: Enabled (anyone can view via public URL)
- **File size limit**: 100MB enforced at storage level (allows high-quality professional photography)
- **MIME type restrictions**: Only image/jpeg, image/jpg, image/png, image/webp
- **RLS policies**: Control who can upload/delete

## Database Schema

### Image URL Storage

Image URLs are stored in the following database columns:

**`users` table** (for barbers):
```sql
photo_url text NULL  -- Public URL to barber's profile photo
```

**`services` table**:
```sql
image_url text NULL  -- Public URL to service promotional image
```

**`products` table**:
```sql
image_url text NULL  -- Public URL to product catalog image
```

These columns store the complete public URL returned by Supabase Storage (e.g., `https://project.supabase.co/storage/v1/object/public/barber-photos/barbers/123/1234567890_photo.jpg`).

## Upload Helper API

### Location
`src/lib/uploadHelper.ts`

### Functions

#### `uploadImage(file, bucketName, pathPrefix)`

Uploads an image file to Supabase Storage.

**Parameters:**
- `file: File` - The image file to upload
- `bucketName: string` - Bucket name ('barber-photos', 'service-images', or 'product-images')
- `pathPrefix: string` - Path prefix within bucket (e.g., 'barbers/user-id-123')

**Returns:**
```typescript
{
  success: boolean;
  url?: string;      // Public URL if successful
  path?: string;     // Storage path if successful
  error?: string;    // Error message if failed
}
```

**Validation:**
- File size must be ≤ 100MB
- File type must be JPG, JPEG, PNG, or WEBP
- Filename is sanitized (special characters replaced with underscore)
- Timestamp prefix added to prevent conflicts

**Example:**
```typescript
const result = await uploadImage(
  selectedFile,
  'barber-photos',
  `barbers/${barberId}`
);

if (result.success) {
  // Store result.url in database
  console.log('Uploaded to:', result.url);
} else {
  // Show result.error to user
  alert(result.error);
}
```

#### `deleteImage(bucketName, filePath)`

Deletes an image from Supabase Storage.

**Parameters:**
- `bucketName: string` - Bucket name
- `filePath: string` - Full path to file within bucket (e.g., 'barbers/123/1234567890_photo.jpg')

**Returns:**
```typescript
{
  success: boolean;
  error?: string;    // Error message if failed
}
```

**Example:**
```typescript
const path = extractPathFromUrl(imageUrl, 'barber-photos');
if (path) {
  const result = await deleteImage('barber-photos', path);
  if (!result.success) {
    console.error('Delete failed:', result.error);
  }
}
```

#### `extractPathFromUrl(url, bucketName)`

Extracts the storage path from a public Supabase Storage URL.

**Parameters:**
- `url: string` - Full public URL (e.g., 'https://.../.../barber-photos/barbers/123/file.jpg')
- `bucketName: string` - Bucket name to extract path for

**Returns:**
- `string` - The path within the bucket (e.g., 'barbers/123/file.jpg')
- `null` - If URL is invalid or doesn't contain the bucket

**Example:**
```typescript
const url = 'https://project.supabase.co/storage/v1/object/public/barber-photos/barbers/123/photo.jpg';
const path = extractPathFromUrl(url, 'barber-photos');
// Returns: 'barbers/123/photo.jpg'
```

#### `getUploadLimitText(language)`

Returns localized text describing upload limits.

**Parameters:**
- `language: 'en' | 'es'` - Language for text

**Returns:**
- English: "Max 100MB. JPG, PNG, WEBP."
- Spanish: "Máx 100MB. JPG, PNG, WEBP."

## Security & Permissions

### Row Level Security (RLS) Policies

#### Barber Photos

**Public Read:**
```sql
-- Anyone can view barber photos
CREATE POLICY "Public can view barber photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'barber-photos');
```

**Owner Upload:**
```sql
-- Owners can upload any barber photo
CREATE POLICY "Owners can upload barber photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'barber-photos' AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'OWNER')
  );
```

**Barber Self-Upload:**
```sql
-- Barbers can upload their own photo
CREATE POLICY "Barbers can upload own photo"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'barber-photos' AND
    (storage.foldername(name))[1] = 'barbers/' || auth.uid()::text
  );
```

**Owner Delete:**
```sql
-- Owners can delete any barber photo
CREATE POLICY "Owners can delete barber photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'barber-photos' AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'OWNER')
  );
```

#### Service & Product Images

**Public Read:**
```sql
-- Anyone can view service/product images
CREATE POLICY "Public can view service images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'service-images');
```

**Owner Management:**
```sql
-- Owners can manage all service/product images
CREATE POLICY "Owners can manage service images"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'service-images' AND ...)
  WITH CHECK (bucket_id = 'service-images' AND ...);
```

**Barber with Permission:**
```sql
-- Barbers with can_manage_services/can_manage_products can upload
CREATE POLICY "Barbers with permission can manage service images"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'service-images' AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'BARBER'
      AND users.can_manage_services = true
    )
  );
```

### Permission Summary

| Action | Owner | Barber (self) | Barber (can_manage_*) | Public |
|--------|-------|---------------|----------------------|--------|
| **Barber Photos** |
| View | ✓ | ✓ | ✓ | ✓ |
| Upload own | ✓ | ✓ | - | ✗ |
| Upload any | ✓ | ✗ | ✗ | ✗ |
| Delete | ✓ | ✗ | ✗ | ✗ |
| **Service Images** |
| View | ✓ | ✓ | ✓ | ✓ |
| Upload | ✓ | ✗ | ✓* | ✗ |
| Delete | ✓ | ✗ | ✓* | ✗ |
| **Product Images** |
| View | ✓ | ✓ | ✓ | ✓ |
| Upload | ✓ | ✗ | ✓** | ✗ |
| Delete | ✓ | ✗ | ✓** | ✗ |

*Requires `can_manage_services` permission
**Requires `can_manage_products` permission

## Implementation Patterns

### Component Pattern for Image Upload

All image upload components follow this pattern:

```typescript
import { useState } from 'react';
import { uploadImage, deleteImage, extractPathFromUrl, getUploadLimitText } from '../lib/uploadHelper';
import { supabase } from '../lib/supabase';

function ImageUploadComponent() {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const result = await uploadImage(
        selectedFile,
        'barber-photos',
        `barbers/${userId}`
      );

      if (!result.success) {
        alert(result.error);
        return;
      }

      setImageUrl(result.url!);
      setSelectedFile(null);

      // Save to database
      await supabase
        .from('users')
        .update({ photo_url: result.url })
        .eq('id', userId);

      alert('Image uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!imageUrl) return;
    if (!confirm('Remove this image?')) return;

    setUploading(true);
    try {
      const path = extractPathFromUrl(imageUrl, 'barber-photos');
      if (path) {
        await deleteImage('barber-photos', path);
      }

      setImageUrl('');

      // Update database
      await supabase
        .from('users')
        .update({ photo_url: null })
        .eq('id', userId);

      alert('Image removed successfully!');
    } catch (error) {
      console.error('Remove error:', error);
      alert('Failed to remove image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {imageUrl ? (
        <div>
          <img src={imageUrl} alt="Preview" style={{ maxWidth: '200px' }} />
          <button onClick={handleRemove} disabled={uploading}>
            Remove Image
          </button>
        </div>
      ) : (
        <div>
          <input type="file" accept="image/*" onChange={handleFileSelect} />
          {selectedFile && (
            <div>
              <p>{selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</p>
              <button onClick={handleUpload} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          )}
          <p style={{ fontSize: '12px', color: '#666' }}>
            {getUploadLimitText('en')}
          </p>
        </div>
      )}
    </div>
  );
}
```

### Display Pattern with Error Handling

All client-facing views use robust image error handling to prevent broken image icons:

**For Service and Product Cards:**

Services and products use a **clean, no-placeholder approach**:
- If image exists and loads: Display 200px tall image at top of card
- If no image or image fails to load: Show NO placeholder icon, just text content
- Cards without images have slightly more padding to maintain visual balance

```typescript
// Track image errors per item
const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

// Determine if image should display
const hasImage = service.image_url && !imageErrors[service.id];

return (
  <div className="service-card">
    {hasImage && (
      <img
        src={service.image_url!}
        alt={service.name_en}
        style={{ width: '100%', height: '200px', objectFit: 'cover' }}
        onError={() => {
          // Hide image if it fails to load - no broken icon shown
          setImageErrors(prev => ({ ...prev, [service.id]: true }));
        }}
      />
    )}

    <div style={{ padding: hasImage ? '1.5rem' : '2rem 1.5rem' }}>
      <h3>{service.name_en}</h3>
      <p>{service.description_en}</p>
      <div className="price">${service.base_price.toFixed(2)}</div>
    </div>
  </div>
);
```

**Key Benefits:**
- No broken image icons ever shown to users
- Invalid URLs fail gracefully and silently
- Clean, professional appearance
- Cards without images still look polished
- Image errors don't break layout

**For Barber Photos:**

Barbers can use initials as fallback since profile photos are less critical:

```typescript
{barber.photo_url ? (
  <img
    src={barber.photo_url}
    alt={barber.name}
    style={{
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      objectFit: 'cover'
    }}
  />
) : (
  <div
    style={{
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      backgroundColor: '#ddd',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      fontSize: '24px',
      color: '#666'
    }}
  >
    {getInitials(barber.name)}
  </div>
)}
```

## File Size & Format Constraints

### Application-Level Validation

The `uploadImage` function enforces:

- **Max file size**: 100MB (104,857,600 bytes)
  - Validation occurs before upload attempt
  - Error: "File size must be less than 100MB"
  - Large limit accommodates high-quality professional photography

- **Allowed formats**: JPG, JPEG, PNG, WEBP
  - Checked via `file.type` MIME type
  - Error: "Only JPG, PNG, and WEBP images are allowed"

- **Filename sanitization**: Special characters replaced with `_`
  - Prevents path traversal and encoding issues
  - Example: `my photo!.jpg` → `my_photo_.jpg`

### Storage-Level Enforcement

Supabase Storage buckets are configured with:

```sql
file_size_limit: 104857600 -- 100MB in bytes
allowed_mime_types: ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
```

If application validation is bypassed, storage will still reject invalid uploads.

## Current Implementation Status

### ✅ Completed

1. **Storage Infrastructure**
   - All three buckets created with proper configuration
   - RLS policies implemented for secure access control
   - Public read access enabled for client-facing views

2. **Upload Helper Library**
   - `uploadImage()` with validation and error handling
   - `deleteImage()` for cleanup operations
   - `extractPathFromUrl()` for path extraction
   - `getUploadLimitText()` for localized UI text
   - Updated to 5MB limit (from 100MB)

3. **Service Image Management**
   - ServiceModal has upload/delete functionality
   - Uses `service-images` bucket
   - Stores URL in `services.image_url`

4. **Product Image Management**
   - OwnerProducts has upload/delete functionality
   - Uses `product-images` bucket
   - Stores URL in `products.image_url`

### 🚧 Implemented (Existing Code)

5. **Client Views**
   - ClientBarbers displays barber photos with fallback initials
   - ClientBook shows barber cards with photos
   - ClientServices and ClientProducts display images

### ⚠️ Limitations / Future Enhancements

1. **Barber Profile Photos**
   - NewBarberModal does not currently include photo upload
   - Owners must edit barbers after creation to add photos
   - Consider adding photo upload to barber creation flow

2. **Image Optimization**
   - No automatic image resizing or compression
   - Client uploads full-resolution images
   - Consider adding Supabase Image Transformations

3. **Bulk Operations**
   - No batch upload functionality
   - No bulk delete for old images
   - Consider cleanup jobs for unused images

4. **Progress Indicators**
   - Upload shows simple loading state
   - No progress bar for large files
   - Consider adding progress tracking

5. **Drag and Drop**
   - File inputs are basic `<input type="file">`
   - No drag-and-drop interface
   - Consider enhancing UX with drop zones

## Troubleshooting

### Upload Fails: "Failed to upload image"

**Check:**
1. User has proper permissions (Owner or has can_manage_* permission)
2. File size is under 5MB
3. File type is JPG, PNG, or WEBP
4. Network connection is stable
5. Supabase project storage quota not exceeded

### Image Not Displaying

**Check:**
1. `photo_url` or `image_url` column contains valid URL
2. URL starts with `https://` and includes bucket name
3. Bucket has public read access enabled
4. Image file actually exists at that path
5. Browser console for CORS or network errors

### Permission Denied on Upload

**Check:**
1. User is authenticated (`auth.uid()` is not null)
2. User role matches policy requirements:
   - Owner: Can upload anything
   - Barber: Can only upload own photo
   - Barber with permission: Can upload services/products
3. Path matches required pattern for barber self-upload

### Old Images Not Cleaned Up

**Manual Cleanup:**
```sql
-- Find products with images that no longer exist
SELECT id, name_en, image_url
FROM products
WHERE image_url IS NOT NULL
AND image_url NOT LIKE '%product-images%';

-- Set to null if needed
UPDATE products
SET image_url = NULL
WHERE image_url IS NOT NULL
AND image_url NOT LIKE '%product-images%';
```

**Automated Cleanup** (future):
- Create a cron job to scan for orphaned images
- Delete files not referenced in any database record
- Run monthly or when storage quota is nearing limit

## Path Conventions

### Standard Patterns

Follow these conventions for consistency:

**Barber Photos:**
```
barbers/{user_id}/{timestamp}_{sanitized_filename}
Example: barbers/123e4567-e89b-12d3-a456-426614174000/1699564800000_profile_photo.jpg
```

**Service Images:**
```
services/{service_id}/{timestamp}_{sanitized_filename}
Example: services/456e4567-e89b-12d3-a456-426614174001/1699564800000_haircut_promo.jpg
```

**Product Images:**
```
products/{product_id}/{timestamp}_{sanitized_filename}
Example: products/789e4567-e89b-12d3-a456-426614174002/1699564800000_pomade_bottle.jpg
```

### Why These Conventions?

1. **Organized by entity type**: Easy to browse in storage console
2. **Scoped by ID**: Permissions can be applied per-entity
3. **Timestamp prefix**: Prevents filename conflicts
4. **Sanitized names**: Prevents path traversal and encoding issues

## Best Practices

### For Developers

1. **Always validate on client before upload**
   - Check file size and type before calling `uploadImage()`
   - Show clear error messages to users
   - Don't rely solely on server-side validation

2. **Clean up old images when replacing**
   - Extract path from old URL
   - Delete old file before saving new URL
   - Handle errors gracefully (old file might be gone)

3. **Use fallback images**
   - Always show placeholder for missing images
   - Use initials, icons, or generic images
   - Don't break layout if image fails to load

4. **Store full URLs in database**
   - Don't store just paths or filenames
   - Include full public URL from `getPublicUrl()`
   - Makes displaying images simpler

5. **Handle loading states**
   - Disable buttons during upload/delete
   - Show progress indicators
   - Prevent double-submissions

### For Owners/Administrators

1. **Image Guidelines for Clients**
   - Use high-quality photos
   - Keep file sizes under 3MB for fast loading
   - Use landscape orientation for services/products
   - Use square/portrait for barber photos

2. **Regular Maintenance**
   - Review storage usage monthly
   - Delete unused images
   - Update outdated photos
   - Check for broken image links

3. **Security**
   - Don't share storage API keys
   - Only grant necessary permissions to barbers
   - Review RLS policies if access issues occur

## Testing Checklist

### Upload Tests

- [ ] Owner can upload barber photo
- [ ] Owner can upload service image
- [ ] Owner can upload product image
- [ ] Barber can upload own profile photo
- [ ] Barber with permission can upload service image
- [ ] Barber with permission can upload product image
- [ ] Upload fails for file > 5MB
- [ ] Upload fails for non-image file (PDF, etc.)
- [ ] Upload fails for unauthenticated user

### Display Tests

- [ ] Barber photos display on ClientBarbers
- [ ] Barber photos display on ClientBook
- [ ] Service images display on ClientServices
- [ ] Product images display on ClientProducts
- [ ] Fallback initials show when no barber photo
- [ ] Fallback icon shows when no service/product image
- [ ] Images don't break layout on mobile
- [ ] Images load quickly (<2s)

### Delete Tests

- [ ] Owner can remove barber photo
- [ ] Owner can remove service image
- [ ] Owner can remove product image
- [ ] Delete removes file from storage
- [ ] Delete updates database record
- [ ] Delete fails gracefully if file already gone

## Summary

The image upload system provides:

✅ Secure, role-based access control
✅ Public image hosting for client-facing views
✅ Simple upload API with validation
✅ Proper error handling and user feedback
✅ Organized file structure
✅ Graceful fallbacks for missing images

The system is production-ready for basic image management needs. Future enhancements can add image optimization, drag-and-drop UX, and automated cleanup.
