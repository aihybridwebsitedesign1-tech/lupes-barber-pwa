# Phase 4K: Appointment Edit, Client CRUD, Barber Management - Progress Report

**Date:** December 3, 2025
**Status:** 🟡 In Progress (Core infrastructure complete, UI integration needed)

---

## ✅ Completed

### 1. Database Migrations

**Migration:** `phase4k_add_permissions_and_soft_delete.sql`

**Added Columns:**
- `users.can_manage_appointments` (boolean, default false)
  - Allows barbers to edit/delete any appointment regardless of status
- `users.can_manage_clients` (boolean, default false)
  - Allows barbers to add/edit/delete clients
- `clients.is_deleted` (boolean, default false)
  - Soft delete flag for clients with appointment history
- `clients.notes` (text, default '')
  - General notes field for client preferences/info

**Index Created:**
- `idx_clients_is_deleted` on `clients(is_deleted) WHERE is_deleted = false`
  - Optimizes filtering out soft-deleted clients

### 2. Fixed preferred_language Error

**Problem:**
- Code referenced `preferred_language` column
- Actual column name is `language`
- Caused "Could not find the 'preferred_language' column" error

**Fixed Files:**
- `src/components/BarberPermissionsModal.tsx`
  - Line 49: Changed `data.preferred_language` → `data.language`
  - Line 85: Changed `preferred_language: preferredLanguage` → `language: preferredLanguage`
- `src/components/NewBarberModal.tsx`
  - Line 69: Changed `preferred_language: preferredLanguage` → `language: preferredLanguage`

### 3. Updated Permission Management

**BarberPermissionsModal.tsx:**
- Added `canManageAppointments` and `canManageClients` state variables
- Load these permissions from database
- Save these permissions on update
- Added UI checkboxes:
  - "Can manage appointments (edit/delete any)"
  - "Can manage clients (add/edit/delete)"

**NewBarberModal.tsx:**
- Added `can_manage_appointments: false` and `can_manage_clients: false` to new barber insert
- New barbers start with no special permissions (owner can grant later)

### 4. Updated TypeScript Types

**src/lib/supabase.ts:**
- Added to `users.Row` type:
  - `can_manage_appointments: boolean`
  - `can_manage_clients: boolean`
- Added to `clients.Row` type:
  - `notes: string`
  - `is_deleted: boolean`

**Result:**
- AuthContext now recognizes new permission fields
- TypeScript compilation passes
- Components can access `userData.can_manage_appointments` and `userData.can_manage_clients`

### 5. Created EditAppointmentModal Component

**File:** `src/components/EditAppointmentModal.tsx`

**Features:**
- Permission check: Only owner or users with `can_manage_appointments` can edit
- Loads appointment data with client info
- Loads active barbers and services
- Editable fields:
  - Date and time (separate inputs)
  - Barber (dropdown of active barbers + "Any barber" option)
  - Service (dropdown with price and duration)
  - Status (Booked/Completed/No Show/Cancelled)
  - Client info (first name, last name, phone, email)
- Updates both appointment and client records on save
- Calculates scheduled_end based on service duration
- Error handling and validation
- Responsive modal design

**Not Yet Integrated:**
- Needs to be imported and used in OwnerAppointments.tsx
- Needs to be imported and used in AppointmentDetail.tsx
- Need to add "Edit" buttons to trigger modal

---

## 🟡 In Progress / Not Started

### 6. Appointment Search (Not Started)

**File to Update:** `src/pages/OwnerAppointments.tsx`

**Requirements:**
- Add search input at top of page
- Filter appointments by:
  - Client name (first_name + last_name)
  - Client phone
  - Barber name
  - Status text
- Client-side filtering (no backend changes needed)
- Show count: "Showing X of Y appointments"

**Implementation Approach:**
```typescript
const [searchQuery, setSearchQuery] = useState('');

const filteredAppointments = appointments.filter(apt => {
  const query = searchQuery.toLowerCase();
  const clientName = `${apt.client?.first_name} ${apt.client?.last_name}`.toLowerCase();
  const barberName = apt.barber?.name?.toLowerCase() || '';
  const status = apt.status.toLowerCase();

  return clientName.includes(query) ||
         apt.client?.phone.includes(query) ||
         barberName.includes(query) ||
         status.includes(query);
});
```

### 7. Integrate Edit Button in OwnerAppointments (Not Started)

**File to Update:** `src/pages/OwnerAppointments.tsx`

**Requirements:**
- Import EditAppointmentModal
- Add "Edit" button to each appointment row (if owner or can_manage_appointments)
- State to track which appointment is being edited
- Show modal when edit clicked
- Refresh list after save

**Button Placement:**
- Next to "View" button in actions column
- Only visible if: `userData.role === 'OWNER' || userData.can_manage_appointments`

### 8. Enhanced Delete with Type-to-Confirm (Not Started)

**Files to Update:**
- `src/pages/OwnerAppointments.tsx`
- `src/pages/AppointmentDetail.tsx`

**Requirements:**
- Override existing delete restrictions for owner/can_manage_appointments users
- Allow deleting ANY appointment (including completed/paid)
- Two-step confirmation:
  1. Regular confirm dialog: "This will permanently delete this appointment and its related data"
  2. Type-to-confirm modal: User must type "DELETE" to enable delete button
- On delete:
  - Delete appointment_products records
  - Delete transformation_photos records (DB + storage files)
  - Delete appointment record
  - Refresh UI / navigate back

**Implementation:**
- Create `ConfirmDeleteModal` component with text input
- Check if user typed exactly "DELETE" (case-sensitive)
- Only enable "Delete" button when text matches
- Show loading state during deletion

### 9. Update OwnerBarbers with Active/Inactive Sections (Not Started)

**File to Update:** `src/pages/OwnerBarbers.tsx`

**Requirements:**
- Load all barbers (active and inactive)
- Group into two sections:
  - "Active Barbers" - active === true
  - "Inactive Barbers" - active === false
- Separate heading for each section
- Keep all existing actions (Manage, Edit Schedule, Time Off) for active barbers
- For inactive barbers: Show "Manage" button only (to re-activate)
- When toggling active status in BarberPermissionsModal:
  - Immediately move barber to correct section on save

**Layout:**
```tsx
<div>
  <h2>Active Barbers ({activeBarbers.length})</h2>
  {activeBarbers.map(barber => ...)}
</div>

<div style={{ marginTop: '3rem' }}>
  <h2>Inactive Barbers ({inactiveBarbers.length})</h2>
  {inactiveBarbers.map(barber => ...)}
</div>
```

### 10. Create NewClientModal Component (Not Started)

**File to Create:** `src/components/NewClientModal.tsx`

**Requirements:**
- Permission check: Only owner or users with `can_manage_clients` can create
- Fields:
  - First name (required)
  - Last name (required)
  - Phone (required)
  - Email (optional)
  - Preferred language (EN/ES)
  - Notes (textarea, optional)
- Insert into clients table
- Set is_deleted = false (default)
- Validation: required fields must be filled
- Call onSave callback to refresh list

**Similar to:** NewBarberModal structure

### 11. Update OwnerClients Page (Not Started)

**File to Update:** `src/pages/OwnerClients.tsx`

**Requirements:**
- Add "New Client" button at top (if owner or can_manage_clients)
- Filter out soft-deleted clients: `.eq('is_deleted', false)`
- Show NewClientModal when button clicked
- Add "Edit" button to each client row (if owner or can_manage_clients)
- Add "Delete" button to each client row (if owner or can_manage_clients)
- Edit button → opens EditClientModal (component to create)
- Delete button:
  - Check if client has appointments
  - If no appointments: hard delete (confirm dialog)
  - If has appointments: soft delete (set is_deleted = true)

### 12. Update ClientDetail Page (Not Started)

**File to Update:** `src/pages/ClientDetail.tsx`

**Requirements:**
- Add "Edit Client" button at top (if owner or can_manage_clients)
- Add "Delete Client" button at top (if owner or can_manage_clients)
- Edit button → opens EditClientModal
- Delete button → same logic as OwnerClients (hard vs soft)
- After delete, navigate back to /owner/clients

### 13. Create EditClientModal Component (Not Started)

**File to Create:** `src/components/EditClientModal.tsx`

**Requirements:**
- Permission check: Only owner or users with `can_manage_clients` can edit
- Load client data
- Edit fields:
  - First name
  - Last name
  - Phone
  - Email
  - Preferred language
  - Notes
- Update clients record
- Call onSave callback

**Similar to:** EditAppointmentModal structure (simpler, fewer fields)

### 14. Responsive Layout Polish (Not Started)

**Files to Check:**
- All modal components
- OwnerAppointments.tsx
- OwnerBarbers.tsx
- OwnerClients.tsx
- AppointmentDetail.tsx
- ClientDetail.tsx

**Breakpoints to Test:**
- Small phones: 320–414px
- Tablets: 768–834px
- Desktop: 1024px+

**Common Fixes:**
- Modal max-width: Use `width: 90%` or `width: calc(100% - 2rem)`
- Tables: Wrap in `overflow-x: auto` container on mobile
- Form inputs: Stack vertically on mobile (use grid with responsive columns)
- Buttons: Stack vertically or wrap on mobile
- Font sizes: Reduce slightly on mobile if needed
- Padding: Reduce on mobile (2rem → 1rem)

**Example Responsive Grid:**
```tsx
// Desktop: 2 columns, Mobile: 1 column
style={{
  display: 'grid',
  gridTemplateColumns: window.innerWidth < 640 ? '1fr' : '1fr 1fr',
  gap: '1rem'
}}

// Better: Use media queries in separate stylesheet if needed
```

---

## Build Status

**Last Build:** December 3, 2025
**Status:** ✅ PASSING
**Bundle Size:** 532.56 KB (gzip: 135.52 KB)

**Command:**
```bash
npm run build
```

**Result:**
```
✓ 142 modules transformed
✓ built in 5.00s
```

---

## Permission Matrix

| Permission | Owner | Barber (Default) | Barber (can_manage_appointments) | Barber (can_manage_clients) |
|------------|-------|------------------|----------------------------------|-----------------------------|
| View appointments | ✓ | ✓ | ✓ | ✓ |
| Edit any appointment | ✓ | ✗ | ✓ | ✗ |
| Delete any appointment | ✓ | ✗ | ✓ | ✗ |
| View clients | ✓ | ✓ | ✓ | ✓ |
| Add client | ✓ | ✗ | ✗ | ✓ |
| Edit client | ✓ | ✗ | ✗ | ✓ |
| Delete client | ✓ | ✗ | ✗ | ✓ |
| Manage barber permissions | ✓ | ✗ | ✗ | ✗ |

---

## Database Schema Changes

### users Table
```sql
-- New columns
can_manage_appointments boolean DEFAULT false
can_manage_clients boolean DEFAULT false
```

### clients Table
```sql
-- New columns
is_deleted boolean DEFAULT false
notes text DEFAULT ''

-- New index
CREATE INDEX idx_clients_is_deleted ON clients(is_deleted) WHERE is_deleted = false;
```

---

## Next Steps (Priority Order)

1. **Create NewClientModal** (highest priority for client management)
2. **Update OwnerClients with CRUD** (client add/edit/delete)
3. **Create EditClientModal** (for editing client info)
4. **Update ClientDetail with edit/delete buttons**
5. **Add appointment search to OwnerAppointments** (filtering)
6. **Integrate EditAppointmentModal in OwnerAppointments** (add Edit button)
7. **Integrate EditAppointmentModal in AppointmentDetail** (add Edit button)
8. **Create ConfirmDeleteModal** (type-to-confirm delete)
9. **Update appointment delete logic** (use ConfirmDeleteModal)
10. **Update OwnerBarbers with Active/Inactive sections**
11. **Responsive polish pass** (test all breakpoints)
12. **Final QA and build**

---

## Testing Checklist (When Complete)

### Permissions
- [ ] Owner can edit any appointment
- [ ] Barber with can_manage_appointments can edit any appointment
- [ ] Regular barber cannot edit appointments
- [ ] Owner can manage clients
- [ ] Barber with can_manage_clients can manage clients
- [ ] Regular barber cannot manage clients

### Appointment Editing
- [ ] Edit appointment from OwnerAppointments list
- [ ] Edit appointment from AppointmentDetail page
- [ ] Change date/time correctly updates scheduled_start and scheduled_end
- [ ] Change barber correctly updates assignment
- [ ] Change service correctly updates duration
- [ ] Change status correctly updates appointment status
- [ ] Client info updates save correctly
- [ ] Modal closes and list refreshes after save

### Appointment Deletion (Enhanced)
- [ ] Delete any appointment as owner (including completed/paid)
- [ ] Delete any appointment with can_manage_appointments
- [ ] Type-to-confirm modal requires "DELETE" exactly
- [ ] Related appointment_products deleted
- [ ] Related transformation_photos deleted (DB + storage)
- [ ] Appointment deleted
- [ ] UI refreshes after delete

### Appointment Search
- [ ] Search by client first name
- [ ] Search by client last name
- [ ] Search by client phone
- [ ] Search by barber name
- [ ] Search by status
- [ ] Count shows "Showing X of Y"

### Client CRUD
- [ ] Create new client with all fields
- [ ] Edit existing client
- [ ] Hard delete client with no appointments
- [ ] Soft delete client with appointments
- [ ] Soft-deleted clients hidden from lists
- [ ] Soft-deleted clients still show in appointment history

### Barber Management
- [ ] Active barbers show in "Active Barbers" section
- [ ] Inactive barbers show in "Inactive Barbers" section
- [ ] Toggle active status moves barber between sections
- [ ] New permissions show in BarberPermissionsModal
- [ ] Permissions save correctly

### Responsive
- [ ] All modals fit on 320px screen
- [ ] Tables scroll horizontally on mobile
- [ ] Forms stack correctly on mobile
- [ ] Buttons wrap/stack on mobile
- [ ] No horizontal overflow on any page

---

## Known Issues / Limitations

1. **Time slot validation not implemented**
   - EditAppointmentModal doesn't check if new time conflicts with other appointments
   - Future: Add availability check before allowing save

2. **No appointment history when soft-deleting clients**
   - Clients with appointments can be soft-deleted
   - Their appointments remain visible (correct)
   - But no clear indicator that client is soft-deleted in appointment view
   - Future: Add "(Deleted)" indicator next to client name in appointment

3. **No CSV import for clients**
   - Phase 4K scope: Basic CRUD only
   - CSV import deferred to future phase (post-contract)

4. **No bulk operations**
   - Can't select multiple appointments/clients for bulk delete
   - Future enhancement if needed

---

## Files Modified

1. `supabase/migrations/phase4k_add_permissions_and_soft_delete.sql` (created)
2. `src/lib/supabase.ts` (updated types)
3. `src/components/BarberPermissionsModal.tsx` (fixed language, added permissions)
4. `src/components/NewBarberModal.tsx` (fixed language field)
5. `src/components/EditAppointmentModal.tsx` (created)

## Files to Create

1. `src/components/NewClientModal.tsx`
2. `src/components/EditClientModal.tsx`
3. `src/components/ConfirmDeleteModal.tsx`

## Files to Update

1. `src/pages/OwnerAppointments.tsx`
2. `src/pages/AppointmentDetail.tsx`
3. `src/pages/OwnerBarbers.tsx`
4. `src/pages/OwnerClients.tsx`
5. `src/pages/ClientDetail.tsx`

---

**Phase 4K Status:** 🟡 Core infrastructure complete (~40%), UI integration and remaining features needed (~60%)
