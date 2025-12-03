# Phase 4B: Payment UX & Image Upload Hardening

**Date:** December 3, 2025
**Status:** ✅ Implemented

---

## Overview

Phase 4B enhances the payment recording user experience with a modal-based interface and hardens image uploads across the application with a unified 100MB limit and shared upload helper.

---

## Changes Summary

### 1. Payment Recording UX
- Replaced inline payment form with dedicated modal component
- Added live payment calculations with clear breakdowns
- Improved labels for cash vs card totals
- Consistent UX for both owner and barber roles

### 2. Image Upload Hardening
- Created shared upload helper utility (`uploadHelper.ts`)
- Increased file size limit from 50MB to 100MB
- Unified upload logic across all three upload locations
- Better error messaging and validation
- Fixed potential upload bugs with centralized logic

### 3. Code Quality
- Removed duplicate upload logic (3 places → 1 shared helper)
- Removed duplicate payment calculation logic
- Cleaner component code with separation of concerns

---

## Payment Modal Component

### Location
`/src/components/PaymentModal.tsx`

### Features

#### **Editable Inputs:**
1. **Payment Method** (dropdown)
   - Cash
   - Card (in shop)
   - Card (online)

2. **Tip Amount** (currency input)
   - Minimum: $0.00
   - Step: $0.01
   - Validation: Must be >= 0

#### **Read-Only Breakdown:**
The modal displays a live-calculating breakdown as the user changes inputs:

1. **Service:** From `services_total`
2. **Products:** From `products_total`
3. **Subtotal:** service + products
4. **Tax:** subtotal × tax_rate (from shop_config)
5. **Tip:** User-entered amount
6. **Card Processing Fee (if applicable):** total_before_fees × processing_fee_rate
7. **Total Charged:** Main display, labeled differently for cash vs card
8. **Net Revenue:** Shown in gray as informational

#### **Labels:**
- **Cash:** "Out-the-door Total (Cash)"
- **Card:** "Card Total (includes fee)"
- **Net Revenue:** "Net Revenue (after fees)"

These labels make it clear to Lupe what the customer actually pays vs what the business keeps.

---

## Payment Math Formulas

### Step-by-Step Calculation

```typescript
// 1. Calculate subtotal
subtotal = services_total + products_total

// 2. Calculate tax
tax_amount = subtotal * tax_rate  // tax_rate from shop_config

// 3. Total before tip
total_before_tip = subtotal + tax_amount

// 4. Add tip
tip_amount = user_entered_tip  // from modal input
total_before_fees = total_before_tip + tip_amount

// 5. Calculate processing fee
processing_fee_rate =
  payment_method === 'cash' ? 0 :
  card_processing_fee_rate  // from shop_config (e.g., 0.04 for 4%)

processing_fee_amount = total_before_fees * processing_fee_rate

// 6. Final totals
total_charged = total_before_fees + processing_fee_amount
net_revenue = total_charged - processing_fee_amount
```

### Example Calculation

**Scenario:** Haircut + Product sale with tip, paid by card

```
Service total:         $25.00
Products total:        $10.00
─────────────────────────────
Subtotal:              $35.00
Tax (8%):              $ 2.80
─────────────────────────────
Total before tip:      $37.80
Tip:                   $ 5.00
─────────────────────────────
Total before fees:     $42.80
Processing Fee (4%):   $ 1.71
─────────────────────────────
Total Charged:         $44.51  ← Customer pays this
Net Revenue:           $42.80  ← Business keeps this
```

### Persisted Fields

When the user clicks "Save", the following fields are updated on the `appointments` table:

```typescript
{
  services_total: number,          // Already set from service
  products_total: number,          // Already set from products added
  tax_amount: number,              // Calculated
  tip_amount: number,              // From modal input
  processing_fee_amount: number,   // Calculated
  total_charged: number,           // Calculated
  net_revenue: number,             // Calculated
  payment_method: string,          // From modal dropdown
  paid_at: timestamp               // Now()
}
```

---

## Upload Helper Utility

### Location
`/src/lib/uploadHelper.ts`

### Constants

```typescript
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
```

### Main Function

```typescript
uploadImage(
  file: File,
  bucketName: string,
  pathPrefix: string
): Promise<UploadResult>
```

**Parameters:**
- `file`: The File object to upload
- `bucketName`: Supabase storage bucket name
- `pathPrefix`: Path prefix (e.g., `services/uuid` or `products/uuid`)

**Returns:**
```typescript
{
  success: boolean;
  url?: string;      // Public URL if successful
  error?: string;    // Error message if failed
}
```

### Validation

The helper performs the following checks:

1. **File Size:** Must be <= 100MB
   - Error: "File size must be less than 100MB"

2. **File Type:** Must be image/jpeg, image/jpg, image/png, or image/webp
   - Error: "Only JPG, PNG, and WEBP images are allowed"

3. **Upload Success:** Checks for Supabase storage errors
   - Returns actual error message from Supabase if available

### File Naming

Files are automatically renamed for uniqueness:
```
{pathPrefix}/{timestamp}_{sanitized_filename}
```

Example:
```
services/abc-123/1701619200000_haircut_photo.jpg
products/def-456/1701619210000_shampoo_image.png
appointments/ghi-789/1701619220000_transformation.jpg
```

### Helper Function

```typescript
getUploadLimitText(language: 'en' | 'es'): string
```

Returns localized helper text:
- EN: "Max 100MB. JPG, PNG, WEBP."
- ES: "Máx 100MB. JPG, PNG, WEBP."

---

## Upload Locations

All three upload locations now use the shared helper with 100MB limit:

### 1. Service Images

**Component:** `/src/components/ServiceModal.tsx`
**Bucket:** `service-images`
**Path Prefix:** `services/{serviceId}`

**Usage:**
```typescript
const result = await uploadImage(
  selectedFile,
  'service-images',
  `services/${serviceId}`
);
```

### 2. Product Images

**Component:** `/src/pages/OwnerProducts.tsx`
**Bucket:** `product-images`
**Path Prefix:** `products/{productId}`

**Usage:**
```typescript
const result = await uploadImage(
  selectedFile,
  'product-images',
  `products/${productId}`
);
```

### 3. Transformation Photos

**Component:** `/src/pages/AppointmentDetail.tsx`
**Bucket:** `transformation-photos`
**Path Prefix:** `appointments/{appointmentId}`

**Usage:**
```typescript
const result = await uploadImage(
  file,
  'transformation-photos',
  `appointments/${appointmentId}`
);
```

---

## Payment Modal Behavior

### Opening the Modal

**Trigger:** Click "Record Payment" button on AppointmentDetail

**Prerequisites:**
- Appointment must exist
- User must have `canEdit` permission (owner or assigned barber)
- Appointment must not already be paid (`paid_at` is null)

### User Interaction

1. **Payment Method Selection**
   - Default: Cash
   - Changes processing fee calculation in real-time

2. **Tip Amount Entry**
   - Default: $0.00
   - Updates totals in real-time as user types

3. **Review Breakdown**
   - All fields update live
   - User can see exactly what customer pays vs business revenue

4. **Save or Cancel**
   - **Save:** Validates tip >= 0, calculates all fields, updates database
   - **Cancel:** Closes modal, no changes made

### After Saving

1. Modal closes automatically
2. Success alert: "Payment recorded successfully!"
3. AppointmentDetail reloads data
4. Payment badge in list views updates to "Paid"
5. Payment summary section displays on AppointmentDetail
6. "Record Payment" button no longer appears

---

## Error Handling

### Upload Errors

The shared helper returns specific error messages:

1. **File too large:**
   - "File size must be less than 100MB"

2. **Wrong file type:**
   - "Only JPG, PNG, and WEBP images are allowed"

3. **Storage error:**
   - Actual error from Supabase (e.g., "Bucket not found", "Permission denied")

4. **Unexpected error:**
   - "An unexpected error occurred during upload"

All errors are displayed via `alert()` with localized messages.

### Payment Errors

1. **Invalid tip amount:**
   - Displayed in red box within modal
   - "Tip must be a valid number >= 0"

2. **Database error:**
   - Displayed in red box within modal
   - Shows actual Supabase error message

3. **Missing shop_config:**
   - Falls back to defaults: 0% tax, 4% card fee
   - Logs warning to console

---

## Integration Points

### AppointmentDetail Component

**Routes:**
- `/owner/appointments/:appointmentId`
- `/barber/appointments/:appointmentId`

**Payment Section:**
```tsx
{canEdit && !appointment.paid_at && (
  <div>
    <h3>Payment</h3>
    <button onClick={() => setShowPaymentModal(true)}>
      Record Payment
    </button>
  </div>
)}

{showPaymentModal && appointment && (
  <PaymentModal
    appointmentId={appointmentId}
    servicesTotal={appointment.services_total}
    productsTotal={appointment.products_total}
    onClose={() => setShowPaymentModal(false)}
    onSave={() => {
      setShowPaymentModal(false);
      loadAppointmentData();
    }}
  />
)}
```

### Permission Rules

**Owner:**
- Can record payment on any appointment
- Sees payment modal

**Barber:**
- Can record payment on own appointments (barber_id = user.id)
- Sees payment modal (same UX as owner)

**Note:** Phase 4B keeps payment permissions identical for owner and barber. Future phases may tighten this if needed.

---

## Files Changed

### New Files
1. `/src/lib/uploadHelper.ts` - Shared upload utility (64 lines)
2. `/src/components/PaymentModal.tsx` - Payment modal component (302 lines)

### Modified Files
1. `/src/components/ServiceModal.tsx`
   - Replaced inline upload logic with `uploadImage()` helper
   - Updated limit text to use `getUploadLimitText()`

2. `/src/pages/OwnerProducts.tsx`
   - Replaced inline upload logic with `uploadImage()` helper
   - Updated limit text to use `getUploadLimitText()`

3. `/src/pages/AppointmentDetail.tsx`
   - Replaced inline upload logic with `uploadImage()` helper
   - Replaced inline payment form with `PaymentModal` component
   - Removed old `handleRecordPayment` function
   - Removed unused state variables (`paymentMethod`, `tipAmount`, `showPaymentSection`)
   - Updated limit text to use `getUploadLimitText()`

---

## Testing Performed

### ✅ Build Test
```bash
npm run build
✓ 138 modules transformed
✓ built in 4.30s
No TypeScript errors
```

### ✅ Upload Tests (To Be Confirmed)

**Test images needed:**
- 1-5MB JPG/PNG files
- Test at each upload location

**Expected results:**
1. **Service Upload:**
   - Upload 3MB logo → Success
   - Shows "Max 100MB. JPG, PNG, WEBP."
   - Image URL saved to service

2. **Product Upload:**
   - Upload 5MB product photo → Success
   - Shows "Max 100MB. JPG, PNG, WEBP."
   - Image URL saved to product

3. **Transformation Photo:**
   - Upload 2MB before/after → Success
   - Shows "Max 100MB. JPG, PNG, WEBP."
   - Photo appears in gallery

### ✅ Payment Tests (To Be Confirmed)

**Test Case 1: Cash Payment**
```
Service: $25.00
Products: $10.00
Tax (8%): $2.80
Tip: $5.00
Processing Fee: $0.00  ← Cash = no fee
─────────────────────
Total Charged: $42.80
Net Revenue: $42.80
```

Steps:
1. Open appointment in "booked" status
2. Mark as completed
3. Click "Record Payment"
4. Select "Cash"
5. Enter tip: $5.00
6. Verify breakdown matches above
7. Click "Save"
8. Verify payment badge → "Paid"
9. Verify payment summary displays correctly

**Test Case 2: Card Payment (in shop)**
```
Service: $25.00
Products: $10.00
Tax (8%): $2.80
Tip: $5.00
Processing Fee (4%): $1.71
─────────────────────
Total Charged: $44.51
Net Revenue: $42.80
```

Steps:
1. Open appointment in "booked" status
2. Mark as completed
3. Click "Record Payment"
4. Select "Card (in shop)"
5. Enter tip: $5.00
6. Verify breakdown matches above
7. Verify label: "Card Total (includes fee)"
8. Click "Save"
9. Verify payment badge → "Paid"
10. Verify all money fields saved correctly in database

---

## Benefits

### Payment UX Improvements

1. **Clearer Labels**
   - Users know exactly what the customer pays
   - "Out-the-door total" vs "Card total with fees"
   - Net revenue clearly shown as informational

2. **Live Calculations**
   - No mental math required
   - User sees impact of tip and payment method immediately
   - Reduces errors

3. **Modal UX**
   - Focused experience, no page clutter
   - Can't accidentally click away
   - Clear Save/Cancel options

4. **Consistent Behavior**
   - Same UX for owner and barber
   - Same validation rules
   - Same error messages

### Upload Improvements

1. **Unified Logic**
   - One place to fix bugs
   - One place to update validation
   - Consistent behavior everywhere

2. **Better Error Messages**
   - Specific validation errors
   - Actual Supabase errors surfaced
   - Localized messages

3. **Higher Limit**
   - 100MB accommodates high-res photos
   - Handles modern phone cameras
   - Future-proof for 4K images

4. **File Safety**
   - Sanitized file names prevent path issues
   - Timestamp ensures uniqueness
   - Type validation prevents non-images

---

## Breaking Changes

**None.** Phase 4B is fully backward compatible.

- Database schema unchanged
- Existing appointments remain valid
- No migration required
- All Phase 1-4A features unchanged

---

## Known Limitations

1. **Upload Progress**
   - No progress bar during upload
   - User only sees "Uploading..." text
   - Future enhancement opportunity

2. **Payment Method Defaults**
   - Always defaults to "Cash"
   - Could remember last used method
   - Future UX enhancement

3. **Tip Suggestions**
   - No quick-tip buttons (10%, 15%, 20%)
   - User must manually enter amount
   - Future enhancement opportunity

4. **Receipt Generation**
   - No printed receipt option
   - Future feature

---

## Future Enhancements

### Payment UX
- Receipt generation (PDF/print)
- Quick-tip buttons (10%, 15%, 20%, Custom)
- Remember last payment method
- Split payment support
- Refund/void functionality

### Uploads
- Progress bars with percentage
- Image preview before upload
- Batch upload support
- Image cropping/editing
- Compress before upload option

### General
- Offline payment recording (PWA feature)
- Payment history on client detail
- Export payment data
- Analytics dashboard

---

## Summary

### ✅ Implemented in Phase 4B

**Payment Recording:**
- Modal-based UX with live calculations
- Clear labels for cash vs card totals
- Full breakdown display
- Validation and error handling
- Same UX for owner and barber

**Image Uploads:**
- Shared upload helper utility
- 100MB file size limit (up from 50MB)
- Unified validation and error handling
- Localized helper text
- Applied to all 3 upload locations

**Code Quality:**
- Removed 200+ lines of duplicate code
- Centralized business logic
- Better separation of concerns
- Easier to maintain and test

### 📊 Statistics
- **New Files:** 2 (uploadHelper.ts, PaymentModal.tsx)
- **Modified Files:** 3 (ServiceModal, OwnerProducts, AppointmentDetail)
- **Code Reduction:** ~200 lines of duplicated logic removed
- **Upload Limit:** 50MB → 100MB
- **Build Time:** 4.30s
- **Build Status:** ✅ Pass (No TypeScript errors)

---

**Phase 4B Complete** ✅
**Ready for Testing** 🧪
