# Transformation Photos Feature

## Overview

The Transformation Photos feature allows owners and barbers to upload before/after photos for completed appointments. This feature is designed to showcase the barber's work and build a portfolio of transformations.

## Database Schema

### Table: `transformation_photos`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `appointment_id` | uuid | References `appointments.id` (CASCADE DELETE) |
| `barber_id` | uuid | References `users.id` (CASCADE DELETE) |
| `client_id` | uuid | References `clients.id` (SET NULL on delete) |
| `before_image_url` | text | Optional before photo URL from Storage |
| `after_image_url` | text | Required after photo URL from Storage |
| `created_by` | uuid | User who uploaded (references `users.id`) |
| `created_at` | timestamptz | Auto-generated timestamp |
| `is_featured` | boolean | Whether to feature in gallery (default: false) |

### Indexes

- `transformation_photos_appointment_id_idx` on `appointment_id`
- `transformation_photos_barber_id_idx` on `barber_id`
- `transformation_photos_client_id_idx` on `client_id`
- `transformation_photos_created_at_idx` on `created_at` (DESC)

## Storage Bucket

### Bucket: `transformations`

- **Size Limit:** 100MB per file
- **Allowed Types:** `image/jpeg`, `image/jpg`, `image/png`, `image/webp`, `image/gif`
- **Public Access:** Yes (read-only)
- **Path Convention:** `{barber_id}/{appointment_id}/{timestamp}_{role}.{ext}`
  - Example: `abc123/def456/1701234567890_before.jpg`
  - Example: `abc123/def456/1701234567890_after.jpg`

## Permissions & RLS Policies

### Owner (Full Access)

Owners can view, add, update, and delete all transformation photos.

**Policies:**
- `Owner can view all transformation photos` - SELECT
- `Owner can insert transformation photos` - INSERT
- `Owner can update all transformation photos` - UPDATE
- `Owner can delete all transformation photos` - DELETE

### Barber (Own Photos Only)

Barbers can manage transformation photos for appointments where they are the assigned barber.

**Requirements:**
- Must be assigned barber for the appointment (`barber_id = auth.uid()`)
- Must have permission `can_manage_transformation_photos = true`

**Policies:**
- `Barbers can view own transformation photos` - SELECT
- `Barbers can insert own transformation photos` - INSERT (with permission check)
- `Barbers can update own transformation photos` - UPDATE (with permission check)
- `Barbers can delete own transformation photos` - DELETE (with permission check)

### Public/Client

Clients have no direct access to the `transformation_photos` table. Access is controlled through the application layer.

## Usage

### Adding Transformation Photos

1. Navigate to a **completed** appointment
2. Scroll to "Transformation Photos" section
3. Click "Add Transformation Photos"
4. Upload:
   - **Before Photo** (optional)
   - **After Photo** (required)
5. Click "Save Transformation"

### Viewing Transformation Photos

Transformation photos are displayed in the appointment detail view when the appointment status is `completed`.

**Display:**
- Before photo on left (if present)
- After photo on right
- Upload timestamp
- Delete button (if user has permission)

### Deleting Transformation Photos

1. Navigate to the appointment with transformation photos
2. Click the trash icon (🗑️) on the photo card
3. Confirm deletion
4. Both before and after images are deleted from Storage and the database record is removed

## Permission Management

### Barber Permission: `can_manage_transformation_photos`

**Default:** `true` for all barbers

**To modify:**
1. Go to "Barbers" page (Owner only)
2. Click on a barber
3. Scroll to "Permissions" section
4. Toggle "Can manage transformation photos (add/delete)"
5. Click "Save Changes"

**Effect:**
- When **enabled**: Barber can add and delete their own transformation photos
- When **disabled**: Barber can view but not manage transformation photos

## Technical Implementation

### Components

1. **TransformationPhotosModal** (`src/components/TransformationPhotosModal.tsx`)
   - Modal for uploading before/after photos
   - Handles file validation and upload
   - Creates database record

2. **AppointmentDetail** (`src/pages/AppointmentDetail.tsx`)
   - Displays transformation photos section
   - Shows before/after photo pairs in a grid
   - Handles deletion with permission checks

3. **BarberPermissionsModal** (`src/components/BarberPermissionsModal.tsx`)
   - Includes checkbox for `can_manage_transformation_photos`
   - Saves permission to database

### Upload Process

1. User selects before (optional) and after (required) photos
2. Files are validated (type, size)
3. Images uploaded to `transformations` bucket using `uploadImage()` helper
4. Database record created with image URLs
5. Appointment detail view refreshed

### Delete Process

1. User clicks delete button
2. Permission check (Owner OR assigned barber with permission)
3. Confirmation dialog
4. Images deleted from Storage using `deleteImage()` helper
5. Database record deleted
6. UI updated

## Migration Files

- **`update_transformation_photos_schema.sql`**
  - Adds `can_manage_transformation_photos` column to `users` table
  - Updates `transformation_photos` schema
  - Creates all RLS policies

- **`create_transformations_storage_bucket.sql`**
  - Creates `transformations` storage bucket
  - Sets file size limit and allowed types
  - Creates storage policies

## Future Enhancements

- **Public Gallery:** Feature best transformations on a public gallery page
- **Social Sharing:** Allow clients to share their transformations
- **Tagging:** Add tags/categories for different styles (fade, beard, color, etc.)
- **Before/After Slider:** Interactive slider to compare before/after
- **Bulk Upload:** Upload multiple transformations at once
- **Client Consent:** Add client consent checkbox before featuring publicly

## Best Practices

1. **Photo Quality:** Encourage high-quality, well-lit photos
2. **Consistency:** Take photos from same angle and distance
3. **Client Privacy:** Always get client consent before featuring publicly
4. **Storage Management:** Periodically review and clean up old photos
5. **Regular Backups:** Include transformation photos in backup strategy

## Troubleshooting

### Photos Not Uploading

- Check file size (must be under 100MB)
- Verify file type (JPG, PNG, WEBP, GIF only)
- Ensure appointment status is `completed`
- Check user has `can_manage_transformation_photos` permission

### Cannot Delete Photos

- Verify user is Owner OR assigned barber
- Check `can_manage_transformation_photos` permission (for barbers)
- Ensure no network errors (check console)

### Photos Not Displaying

- Verify image URLs in database are valid
- Check Storage bucket policies (should allow public read)
- Inspect browser console for CORS or network errors

---

**End of Transformation Photos Documentation**
