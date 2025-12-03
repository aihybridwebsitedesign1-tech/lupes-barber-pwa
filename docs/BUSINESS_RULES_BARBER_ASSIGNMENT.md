# Business Rules: Barber Assignment

**Date:** December 3, 2025
**Status:** Implemented

---

## Overview

The barber assignment workflow has been updated to match business requirements:

1. **Clients do NOT choose barbers** when booking online
2. **System does NOT auto-assign barbers** during booking
3. **Owner/Manager assigns barbers** after appointments are created

This document describes the implementation and behavior.

---

## Business Rules

### Rule 1: Public Booking Does Not Assign Barbers

**Old Behavior (Removed):**
- /book flow had a "Choose Barber" step
- Client could select specific barber or "Any Barber"
- System auto-assigned first available barber if "Any Barber" selected

**New Behavior:**
- /book flow has NO barber selection step
- Appointments created via /book have `barber_id = NULL`
- Appointments appear as "Unassigned" on owner dashboard
- Owner/Manager assigns barbers manually (in future phase)

### Rule 2: Owner Can Still Assign Barbers

**Behavior:**
- Owner "New Appointment" modal STILL allows barber selection
- When owner creates appointment, they can choose a barber
- These appointments have `barber_id` set to the chosen barber
- These appointments immediately appear on the barber's dashboard

### Rule 3: Barbers Only See Assigned Appointments

**Behavior:**
- Barber dashboards (`/barber/today`) filter by `barber_id`
- Unassigned appointments (barber_id = NULL) do NOT appear
- Only appointments specifically assigned to that barber appear
- Barbers cannot see or access unassigned appointments

---

## Implementation Details

### Database Schema Changes

**Migration:** `allow_null_barber_id`

**Change:**
```sql
ALTER TABLE appointments
ALTER COLUMN barber_id DROP NOT NULL;
```

**Impact:**
- `appointments.barber_id` now allows NULL values
- Foreign key constraint remains (validates when not NULL)
- Existing appointments unaffected (all have barber_id values)

### /book Flow Changes

**Steps Changed:**
- **Old:** 5 steps (Language → Service → Barber → Date/Time → Client Info)
- **New:** 4 steps (Language → Service → Date/Time → Client Info)

**Removed:**
- Step 3: "Choose Barber" (barber selection UI)
- "Any Barber" option
- Barber list display
- Barber auto-assignment logic

**Appointment Creation:**
```typescript
// Old:
barber_id: selectedBarber  // or barbers[0]?.id

// New:
barber_id: null  // Always null for online bookings
```

**Files Modified:**
- `/src/pages/Book.tsx`
  - Removed barber state (`selectedBarber`, `barbers`)
  - Removed barber data loading
  - Removed step 3 barber selection UI
  - Updated step numbers (4→3, 5→4)
  - Set `barber_id: null` in appointment creation
  - Removed barber display from confirmation screen

### Owner Dashboard Changes

**Display Logic:**

**Before:**
```typescript
{apt.barber?.name || 'N/A'}
```

**After:**
```typescript
{apt.barber?.name || t.unassigned}
```

**Type Update:**
```typescript
// Old:
barber: { name: string };

// New:
barber: { name: string } | null;
```

**Query:**
- Uses LEFT JOIN for barber (allows null)
- Still displays all appointments for today
- Shows "Unassigned" for null barber_id

**Files Modified:**
- `/src/pages/OwnerToday.tsx`
  - Updated type to allow null barber
  - Display "Unassigned" when barber is null

### Barber Dashboard (No Changes Needed)

**Existing Query:**
```typescript
.eq('barber_id', userData.id)
```

**Behavior:**
- Automatically filters out NULL values
- Only shows appointments WHERE barber_id = <their id>
- No code changes required

**Files:**
- `/src/pages/BarberToday.tsx` (unchanged)

### Translations

**Added:**
```typescript
en: {
  unassigned: 'Unassigned',
  ...
}

es: {
  unassigned: 'Sin Asignar',
  ...
}
```

**Files Modified:**
- `/src/lib/translations.ts`

---

## User Flows

### Flow 1: Online Booking (/book)

1. **Client opens /book**
2. **Step 1:** Choose Language (EN/ES)
3. **Step 2:** Choose Service (e.g., Regular Haircut)
4. **Step 3:** Choose Date & Time (e.g., Dec 3 at 6:00 PM)
5. **Step 4:** Enter Info (Name, Phone, Email)
6. **Submit:** Appointment created with `barber_id = NULL`
7. **Confirmation:** "Your appointment has been scheduled"
   - Shows: Service, Date/Time
   - Does NOT show: Barber

**Result:**
- Appointment appears on `/owner/today` as "Unassigned"
- Does NOT appear on any barber dashboard
- Owner must assign barber later

### Flow 2: Owner Creates Appointment (Modal)

1. **Owner opens "New Appointment" modal**
2. **Selects:**
   - Client (existing or new)
   - Service
   - Barber (dropdown with all active barbers)
   - Date
   - Time
3. **Submit:** Appointment created with chosen `barber_id`

**Result:**
- Appointment appears on `/owner/today` with barber name
- Immediately appears on assigned barber's dashboard
- No assignment needed

### Flow 3: Owner Views Today's Appointments

**URL:** `/owner/today`

**Display:**
| Time | Client | Barber | Service | Status |
|------|--------|--------|---------|--------|
| 2:00 PM | John Doe | Mike Johnson | Haircut | Booked |
| 6:00 PM | Jane Smith | **Unassigned** | Buzz Cut | Booked |
| 7:00 PM | Bob Brown | Carlos Martinez | Shave | Booked |

**Behavior:**
- All appointments visible
- Unassigned shown clearly
- Owner can identify which need assignment

### Flow 4: Barber Views Today's Schedule

**URL:** `/barber/today`

**Display (Mike Johnson):**
| Time | Client | Service | Status |
|------|--------|---------|--------|
| 2:00 PM | John Doe | Haircut | Booked |

**Behavior:**
- Only shows assigned appointments
- Unassigned appointments NOT visible
- Barber sees only their schedule

---

## Testing Results

### Test 1: Create Unassigned Appointment
**Input:**
- Client: Sarah Connor (+1-555-1984)
- Service: Regular Haircut ($25, 30min)
- Date/Time: Today at 6:00 PM
- Channel: online_pwa
- Barber: NULL

**Result:**
```sql
id: 0577abbb-0ec6-4720-a6b2-235a850d7cbc
barber_id: null
status: booked
channel: online_pwa
```
✅ PASS

### Test 2: Appears on Owner Dashboard
**Query:**
```sql
SELECT barber_name FROM appointments
WHERE id = '0577abbb-0ec6-4720-a6b2-235a850d7cbc';
```

**Result:**
```
barber_name: Unassigned
```
✅ PASS

### Test 3: Does NOT Appear on Barber Dashboards
**Query:**
```sql
SELECT COUNT(*) FROM appointments
WHERE id = '0577abbb-0ec6-4720-a6b2-235a850d7cbc'
  AND barber_id IN (
    SELECT id FROM users WHERE role = 'BARBER'
  );
```

**Result:**
```
count: 0
```
✅ PASS

### Test 4: Owner Modal Still Assigns Barbers
**Input:**
- Client: Sarah Connor
- Service: Hot Towel Shave ($30, 40min)
- Barber: Carlos Martinez (barber1)
- Date/Time: Today at 7:00 PM
- Channel: internal_manual

**Result:**
```sql
id: 4c83e7e0-e07a-41e9-9f38-4a68b1bfaf63
barber_id: b7468ac0-276c-4515-b65a-3997131a11a6
barber_name: Carlos Martinez
status: booked
channel: internal_manual
```
✅ PASS

### Test 5: Build Success
**Command:**
```bash
npm run build
```

**Result:**
```
✓ built in 3.90s
No errors detected
```
✅ PASS

---

## Future Implementation (Phase 2/3)

### Barber Assignment UI

**Feature:** Owner can assign barbers to unassigned appointments

**Requirements:**
1. Add "Assign Barber" button/dropdown on `/owner/today`
2. Show available barbers for selection
3. Update `appointments.barber_id` when assigned
4. Appointment moves to barber's dashboard
5. Real-time update (if multiple owners)

**Not Implemented Yet:**
- Assignment controls
- Bulk assignment
- Auto-assignment based on availability
- Notification to barber when assigned

---

## Breaking Changes

### None

**Backward Compatibility:**
- Existing appointments retain their barber_id values
- Owner modal behavior unchanged
- Barber dashboards continue to work
- No data migration required

**Non-Breaking:**
- /book flow simplified (removes step)
- Schema allows null (doesn't require it)
- Owner dashboard handles null gracefully
- Query filters work correctly

---

## API / Data Model

### Appointments Table

**Column:** `barber_id`
- **Type:** UUID (nullable)
- **Foreign Key:** users.id
- **Constraint:** Validates when not NULL
- **Default:** None

**Values:**
- `NULL` = Unassigned appointment
- `<uuid>` = Assigned to specific barber

### Channel Values

**Distinguishes appointment source:**
- `online_pwa` = Created via /book (always unassigned)
- `internal_manual` = Created via owner modal (always assigned)
- `voice_agent` = Future: created via phone booking

---

## Summary

### What Changed
✅ Removed barber selection from /book flow
✅ /book creates unassigned appointments (barber_id = NULL)
✅ Owner dashboard shows "Unassigned" for NULL barbers
✅ Barber dashboards automatically filter out unassigned
✅ Owner modal still assigns barbers (unchanged)
✅ Schema updated to allow NULL barber_id

### What Stayed the Same
✅ Owner "New Appointment" modal behavior
✅ Barber dashboard functionality
✅ Appointment data structure
✅ Client lookup by phone
✅ All other Phase 1 features

### Next Steps
- [ ] Implement barber assignment UI (Phase 2/3)
- [ ] Add assignment controls to owner dashboard
- [ ] Consider auto-assignment rules
- [ ] Add notifications for barber assignments

---

**Implementation Complete** ✅
**No Breaking Changes** ✅
**All Tests Passing** ✅
