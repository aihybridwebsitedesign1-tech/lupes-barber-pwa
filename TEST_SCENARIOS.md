# Test Scenarios - Lupe's Barber Control Panel

This document provides step-by-step manual test scenarios for QA testing. Each scenario can be checked off as you complete it.

---

## Prerequisites

Before testing, ensure:
- [ ] You have owner account credentials
- [ ] At least one barber exists in the system
- [ ] At least one service is active
- [ ] You know whether SMS (Twilio) is configured or not

---

## 1. Booking Flow - Normal Mode (Test Mode OFF)

### Scenario 1.1: Complete Booking Happy Path

**Goal:** Client books an appointment successfully.

**Steps:**
1. Go to Settings > Test Mode
2. Ensure "Enable Test Mode" is UNCHECKED
3. Save if needed
4. Navigate to the client booking page (`/book`)
5. Select a barber from the list
6. Select a service
7. Choose tomorrow's date
8. Select an available time slot
9. Enter contact information (name, phone)
10. Click "Next" to confirmation page
11. Verify summary shows correct barber, service, date, time
12. Click "Confirm Booking" (or "Pay & Confirm" if Stripe enabled)
13. Verify success message appears
14. As owner, go to "Today" or "Calendar" and find the appointment
15. Verify NO "TEST" badge appears

**Expected Result:**
- Appointment created successfully
- No TEST badge
- If SMS configured, client receives confirmation text

---

### Scenario 1.2: Booking Validation - Past Date

**Goal:** System prevents booking in the past.

**Steps:**
1. Navigate to client booking page
2. Select barber and service
3. Try to select yesterday's date
4. Observe that past dates are disabled or show no slots

**Expected Result:**
- Cannot select past dates
- No available time slots for past dates

---

### Scenario 1.3: Booking Validation - Minimum Notice

**Goal:** System enforces minimum booking notice.

**Setup:** Set "Minimum Hours Notice" to 2 in Settings.

**Steps:**
1. Navigate to client booking page
2. Select barber and service
3. Select today's date
4. Observe available time slots
5. Verify that slots within the next 2 hours are NOT available

**Expected Result:**
- Slots less than 2 hours away are not shown
- Only future slots (2+ hours away) are bookable

---

### Scenario 1.4: Booking Validation - Barber Schedule

**Goal:** Clients can only book during barber's working hours.

**Setup:** Set a barber's schedule (e.g., Monday 9am-5pm).

**Steps:**
1. Edit barber schedule: Monday 9:00 AM - 5:00 PM
2. Save schedule
3. Client booking page, select that barber
4. Select next Monday
5. Observe available time slots

**Expected Result:**
- Slots only appear between 9am-5pm
- No slots before 9am or after 5pm

---

### Scenario 1.5: Booking Validation - Time Off

**Goal:** Clients cannot book when barber has time off.

**Setup:** Add time-off for a barber.

**Steps:**
1. Go to Barbers
2. Select a barber, click "Request Time Off"
3. Set start date = tomorrow, end date = tomorrow
4. Set reason = "Vacation"
5. Save
6. Navigate to client booking page
7. Select that barber
8. Select tomorrow's date

**Expected Result:**
- No time slots available for tomorrow
- Message indicates barber is unavailable

---

## 2. Booking Flow - Test Mode ON

### Scenario 2.1: Test Mode Warning & Behavior

**Goal:** Test Mode shows warning and marks appointments as test.

**Steps:**
1. Go to Settings > Test Mode
2. Check "Enable Test Mode"
3. Save changes
4. Navigate to client booking page (`/book`)
5. Observe a yellow warning banner: "Test Mode is enabled..."
6. Complete a booking (barber, service, date, time, contact)
7. On confirmation page, observe:
   - Warning banner is still visible
   - Button says "Confirm Test Booking" (not "Confirm Booking")
   - No mention of payment processing
8. Click "Confirm Test Booking"
9. Verify success
10. As owner, go to "Today" or appointment list
11. Find the appointment
12. Verify yellow "TEST" badge appears next to client name

**Expected Result:**
- Clear test mode warnings shown
- Appointment created with TEST badge
- No SMS sent (even if configured)
- No payment attempt (even if Stripe configured)

---

### Scenario 2.2: Test Mode - No Real SMS Sent

**Goal:** SMS is NOT sent to real phone numbers in test mode.

**Setup:** SMS (Twilio) is configured.

**Steps:**
1. Ensure Test Mode is ON
2. Create a test booking using a REAL phone number (your own)
3. Wait for confirmation
4. Check your phone

**Expected Result:**
- No SMS received
- In owner logs/database, message recorded with status = "sent_test"

**Note:** If SMS is not configured, this test is N/A.

---

## 3. Barber Management

### Scenario 3.1: Add New Barber

**Goal:** Owner can add a barber with full profile.

**Steps:**
1. Log in as owner
2. Go to "Barbers"
3. Click "Add Barber"
4. Fill in:
   - Name: "Test Barber"
   - Email: "testbarber@example.com"
   - Phone: "+1234567890"
   - Commission Rate: 60
   - Public Display Name: "TB"
   - Bio: "Expert stylist"
5. Set permissions:
   - Can Book Appointments: Yes
   - Show on Client Website: Yes
   - Accept Online Bookings: Yes
6. Upload a photo (optional)
7. Set schedule (e.g., Mon-Fri 9am-6pm)
8. Save
9. Go to client booking page
10. Verify "Test Barber" appears in barber list

**Expected Result:**
- Barber created successfully
- Appears in owner's barber list
- Appears in client booking list (because "Show on Client Website" = true)

---

### Scenario 3.2: Deactivate Barber

**Goal:** Inactive barbers cannot log in and don't appear in bookings.

**Steps:**
1. Go to "Barbers"
2. Find "Test Barber" from previous scenario
3. Edit barber, uncheck "Active"
4. Save
5. Go to client booking page
6. Verify "Test Barber" does NOT appear
7. Try to log in as "testbarber@example.com"
8. Observe error: "Your account is inactive"

**Expected Result:**
- Barber removed from public list
- Cannot log in
- Existing appointments remain visible (historical data preserved)

---

### Scenario 3.3: Show on Client Website vs Accept Online Bookings

**Goal:** Understand difference between two flags.

**Setup:**
- Create or edit a barber
- Set "Show on Client Website" = YES, "Accept Online Bookings" = NO

**Steps:**
1. Go to Barbers, edit a barber
2. Check "Show on Client Website"
3. Uncheck "Accept Online Bookings"
4. Save
5. Go to client booking page
6. Observe barber list

**Expected Result:**
- Barber does NOT appear in booking list (because accept_online_bookings = false)
- If you have a "Meet Our Barbers" page, barber WOULD appear there (show_on_client_site = true)

**Note:** The "Meet Our Barbers" page may not be implemented yet. Main point: booking requires both flags true.

---

## 4. Schedules & Time Off

### Scenario 4.1: Edit Barber Schedule

**Goal:** Change barber's weekly schedule.

**Steps:**
1. Go to Barbers
2. Click on a barber
3. Click "Edit Schedule"
4. Change Monday: 10:00 AM - 4:00 PM
5. Set Tuesday: Not Working (uncheck "Is Working")
6. Save
7. Go to client booking, select this barber
8. Select next Monday
9. Verify slots only from 10am-4pm
10. Select next Tuesday
11. Verify no slots available (day off)

**Expected Result:**
- Schedule changes reflected in available slots
- Days off show no availability

---

### Scenario 4.2: Request Time Off

**Goal:** Block specific dates for vacation/sick days.

**Steps:**
1. Go to Barbers
2. Select a barber
3. Click "Request Time Off"
4. Set date range: 3 days from now to 5 days from now
5. Reason: "Vacation"
6. Save
7. Go to client booking
8. Select this barber
9. Try to book on day 4 from now (middle of time-off period)

**Expected Result:**
- No slots available during time-off dates
- Slots available before and after time-off period

---

## 5. Client Appointment Management

### Scenario 5.1: Client Cancels Appointment

**Goal:** Client can cancel their own booking.

**Setup:** Create a test appointment as client (test mode OK).

**Steps:**
1. Navigate to client appointments page (need to track booking)
2. Alternatively, use the appointment detail view
3. Click "Cancel Appointment"
4. Confirm cancellation
5. Verify success message
6. As owner, view appointment
7. Verify status = "Cancelled"

**Expected Result:**
- Appointment cancelled successfully
- Status updated in database
- If SMS enabled (and not test mode), client receives cancellation confirmation

**Note:** Cancellation UI may vary; test from both client and owner perspectives.

---

### Scenario 5.2: Client Reschedules Appointment

**Goal:** Client can change appointment date/time.

**Steps:**
1. As client, create an appointment for tomorrow
2. Go to appointment details or client appointments page
3. Click "Reschedule"
4. Select new date and time (day after tomorrow)
5. Confirm reschedule
6. Verify new appointment details
7. As owner, check appointments
8. Verify old appointment is cancelled
9. Verify new appointment exists with new date/time

**Expected Result:**
- Original appointment cancelled
- New appointment created
- Client sees updated details

---

## 6. Time Tracking

### Scenario 6.1: Barber Clock In/Out

**Goal:** Barber can track time for payroll.

**Steps:**
1. Log in as a barber (not owner)
2. Go to "My Schedule" or "Time Clock" (exact location may vary)
3. Click "Clock In"
4. Verify timestamp recorded
5. Wait a minute (or just proceed)
6. Click "Start Break"
7. Wait a few seconds
8. Click "End Break"
9. Click "Clock Out"
10. Verify time entry appears with total hours calculated

**Expected Result:**
- Clock in/out timestamps recorded
- Break time deducted from total hours
- Entry appears in barber's time tracking list

---

### Scenario 6.2: Owner Views Time Tracking

**Goal:** Owner can see all barbers' time entries.

**Steps:**
1. Log in as owner
2. Go to "Barbers" > "Time Tracking" (or "Reports")
3. Observe list of time entries
4. Filter by date range (if available)
5. Verify you see entries for multiple barbers
6. Export to CSV (if available)

**Expected Result:**
- Owner can see all time entries
- Data includes: barber name, date, hours worked, breaks
- Exportable for payroll

---

## 7. Images

### Scenario 7.1: Upload Service Image

**Goal:** Services can have showcase images.

**Steps:**
1. Log in as owner
2. Go to "Services"
3. Edit an existing service (or create new)
4. Click "Choose File" or "Upload Image"
5. Select an image file (JPG, PNG, under 100MB)
6. Save service
7. Go to client booking page
8. Select this service
9. Verify image displays correctly

**Expected Result:**
- Image uploads successfully
- Image visible in owner service list
- Image visible to clients during booking

---

### Scenario 7.2: Upload Product Image

**Goal:** Products can have images.

**Steps:**
1. Go to "Products"
2. Edit or create a product
3. Upload an image
4. Save
5. View product list

**Expected Result:**
- Image uploads and displays
- Accessible from product catalog

---

### Scenario 7.3: Missing Image Graceful Handling

**Goal:** System handles missing images without breaking.

**Steps:**
1. Create a service WITHOUT uploading an image
2. Save
3. Go to client booking page
4. View service list

**Expected Result:**
- Service appears normally
- Placeholder or "no image" indicator shown
- No broken image icon or error

---

## 8. SMS Reminders (If Configured)

**Note:** These tests require Twilio to be configured. If SMS is not set up, skip this section.

### Scenario 8.1: Automatic Reminder Sent

**Goal:** Reminders are sent before appointments.

**Setup:**
- Ensure Test Mode is OFF
- SMS (Twilio) configured
- Reminders enabled in Settings
- Primary reminder set to 24 hours before

**Steps:**
1. Create an appointment for 24 hours from now
2. Use a real phone number (your own for testing)
3. Wait for the cron job to run (or manually trigger send-reminders function)
4. Check your phone for SMS

**Expected Result:**
- Reminder SMS received approximately 24 hours before appointment
- Message includes: shop name, date, time, barber name

**Note:** Testing this in real-time requires waiting. Alternatively, modify an appointment's scheduled_start to be 24 hours from now and trigger reminders manually.

---

### Scenario 8.2: Reminder Not Sent if Appointment Cancelled

**Goal:** Cancelled appointments don't get reminders.

**Steps:**
1. Create appointment for 24 hours from now
2. Immediately cancel it
3. Wait for reminder time (or trigger send-reminders)
4. Check phone

**Expected Result:**
- No SMS received (because appointment cancelled)
- In database, reminder marked as "cancelled"

---

### Scenario 8.3: Reminder Respects Test Mode

**Goal:** Reminders logged but not sent in test mode.

**Steps:**
1. Enable Test Mode
2. Create appointment for 24 hours from now
3. Trigger send-reminders function (or wait)
4. Check phone

**Expected Result:**
- No SMS received
- In database, reminder marked as "sent_test"
- Logs show: "[Reminders TEST MODE] Would send reminder..."

---

## 9. Test Mode Cleanup

### Scenario 9.1: Delete Test Bookings

**Goal:** Owner can clean up all test appointments at once.

**Steps:**
1. Ensure Test Mode is ON
2. Create 3-5 test appointments (different dates, barbers)
3. Turn Test Mode OFF
4. Go to Settings > Test Mode
5. Scroll to "Test Data Tools"
6. Click "Delete Test Bookings"
7. Confirm deletion in modal
8. Go to "Today" and "Calendar"
9. Verify test appointments are no longer shown (status = cancelled)

**Expected Result:**
- All test appointments cancelled
- TEST badges no longer clutter appointment lists
- Real appointments unaffected

---

## 10. Multi-language Support

### Scenario 10.1: Switch Language

**Goal:** App supports English and Spanish.

**Steps:**
1. Log in (any user)
2. Look for language toggle (usually top-right)
3. Switch from English to Spanish
4. Observe interface text changes
5. Switch back to English

**Expected Result:**
- UI labels, buttons, messages appear in selected language
- Services and products show translated names (name_en / name_es)

---

## 11. Authentication & Roles

### Scenario 11.1: Owner Access

**Goal:** Owner has full access.

**Steps:**
1. Log in as owner
2. Verify you can access:
   - Barbers
   - Appointments
   - Services
   - Products
   - Clients
   - Settings
   - Reports
   - Time Tracking (all barbers)

**Expected Result:**
- All menu items visible and accessible

---

### Scenario 11.2: Barber Access

**Goal:** Barber has limited access.

**Steps:**
1. Log in as a barber (not owner)
2. Verify you CAN access:
   - Your schedule
   - Your appointments
   - Time clock (clock in/out)
3. Verify you CANNOT access:
   - Settings
   - Other barbers' data
   - Full reports

**Expected Result:**
- Barber sees only their relevant data
- Settings and admin features hidden

---

### Scenario 11.3: Inactive User Login

**Goal:** Inactive users cannot log in.

**Steps:**
1. As owner, go to Barbers
2. Set a barber to "Inactive"
3. Log out
4. Try to log in as that barber

**Expected Result:**
- Login fails with message: "Your account is inactive"
- User cannot access the system

---

## 12. Edge Cases & Error Handling

### Scenario 12.1: Double Booking Prevention

**Goal:** System prevents two clients from booking same time slot.

**Steps:**
1. Open client booking page in two browser windows (or devices)
2. Both select same barber, service, date, time
3. Window 1: Click "Confirm Booking"
4. Window 2: Click "Confirm Booking" immediately after

**Expected Result:**
- First booking succeeds
- Second booking fails with error: "This time slot is no longer available" (or similar)

---

### Scenario 12.2: Invalid Phone Number

**Goal:** System handles invalid phone input gracefully.

**Steps:**
1. Client booking page
2. Enter phone number: "abc123" (invalid format)
3. Try to proceed

**Expected Result:**
- Validation error shown
- Cannot proceed without valid phone

---

### Scenario 12.3: Expired Session

**Goal:** System handles expired login gracefully.

**Steps:**
1. Log in as owner
2. Wait for session to expire (or manually clear session cookie)
3. Try to access a protected page

**Expected Result:**
- Redirected to login page
- Prompted to log in again

---

## 13. Performance & Usability

### Scenario 13.1: Mobile Booking Flow

**Goal:** Booking works on mobile devices.

**Steps:**
1. Open client booking page on mobile device (or use browser dev tools to simulate)
2. Complete entire booking flow
3. Observe layout, button sizes, text readability

**Expected Result:**
- All elements visible and usable
- No horizontal scrolling required
- Buttons large enough to tap
- Text readable without zooming

---

### Scenario 13.2: Page Load Speed

**Goal:** App loads quickly.

**Steps:**
1. Clear browser cache
2. Load client booking page
3. Measure load time (use browser dev tools Network tab)

**Expected Result:**
- Page loads in under 3 seconds on decent connection
- No obvious loading hangs

---

## Final Checklist

Before going live, ensure:

- [ ] Test Mode is OFF
- [ ] At least one owner account exists
- [ ] At least one active barber with schedule set
- [ ] At least one active service
- [ ] Booking rules configured (days in advance, min notice, etc.)
- [ ] SMS configured (if using reminders)
- [ ] Cron job set up for send-reminders (if using reminders)
- [ ] All test appointments cleaned up
- [ ] Inactive test barbers removed or deactivated
- [ ] Real barber profiles updated with photos and bios
- [ ] Shop info (name, phone, address) filled in Settings

---

**End of Test Scenarios**
