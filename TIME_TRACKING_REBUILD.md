# Time Tracking System - Production-Ready Rebuild

## Overview

The time tracking system provides accurate, auditable logging of barber work hours including clock-in/out, breaks, and comprehensive daily summaries. The system is designed for payroll accuracy with bulletproof calculation logic and complete edge-case handling.

## Architecture

### Database Schema

**Table: `barber_time_entries`**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `barber_id` | UUID | FK to users.id |
| `entry_type` | TEXT | `clock_in`, `clock_out`, `break_start`, `break_end` |
| `timestamp` | TIMESTAMPTZ | UTC timestamp of entry |
| `note` | TEXT | Optional note (nullable) |
| `created_at` | TIMESTAMPTZ | Record creation time |

**Indexes:**
- `barber_id` - For filtering by barber
- `timestamp` - For date range queries

**Key Features:**
- All timestamps stored in UTC (timezone-safe)
- Immutable log entries (no updates, only inserts)
- Cascading deletes on barber removal
- Supports multiple clock-in/out cycles per day

### Core Logic (`src/lib/timeTracking.ts`)

The time tracking utility library provides:

1. **Shift Parsing** - Converts raw entries into structured daily shifts
2. **Time Calculations** - Accurate millisecond-precision calculations
3. **Validation** - Prevents invalid state transitions
4. **Edge Case Handling** - Manages incomplete shifts, forgotten break ends
5. **Status Detection** - Identifies shift completion status

#### Key Functions

**`parseShiftsForDay(entries: TimeEntry[]): DailyShift`**

Parses all time entries for a single day into a structured shift object.

**Logic:**
- Sorts entries chronologically
- Identifies first clock-in as shift start
- Identifies last clock-out as shift end
- Pairs break_start with break_end entries
- Tracks unended breaks separately
- Calculates total worked time, break time, and net worked time

**`validateClockAction(currentEntries, actionType): ValidationResult`**

Validates if a clock action is allowed based on current state.

**Rules:**
- Can only `clock_in` when off duty or after previous `clock_out`
- Can only `clock_out` when clocked in (not on break)
- Can only `break_start` when clocked in (not already on break)
- Can only `break_end` when currently on break
- Returns validation result with reason if invalid

**`calculateDailySummaries(entries, barberNames): DailySummary[]`**

Groups entries by barber and date, calculates summaries.

**Returns:**
- Total hours worked (clock-in to clock-out)
- Break hours (sum of all breaks)
- Net hours (total - breaks)
- Shift status (complete, in_progress, on_break, incomplete)
- Issue flags for incomplete or problematic shifts

## Time Calculation Math

### Total Worked Time
```
total_worked_ms = clock_out_time - clock_in_time
```

- If no clock-out yet: uses current time (for live display only, not stored)
- For completed shifts: uses actual clock-out timestamp

### Break Time
```
break_time_ms = sum(break_end - break_start for all breaks)
```

- Unended breaks: uses current time for live calculation
- For historical data: only counts completed breaks

### Net Worked Time
```
net_worked_ms = total_worked_ms - break_time_ms
```

- The payroll-relevant number
- Always >= 0 (negative values clamped to 0)

### Conversions
```
hours = milliseconds / (1000 * 60 * 60)
formatted = `{hours}h {minutes}m`
```

## Shift Status States

| Status | Description | Displayed As |
|--------|-------------|--------------|
| `complete` | Has both clock-in and clock-out | Shift Complete |
| `in_progress` | Clocked in, not on break, no clock-out | On the Clock |
| `on_break` | Currently on an active break | On Break |
| `incomplete` | Missing clock-in or has issues | Off the Clock |

## Edge Cases Handled

### 1. Missing Clock-Out

**Scenario:** Barber forgets to clock out

**Handling:**
- Status shows as `in_progress`
- Live calculation uses current time (not stored)
- Owner dashboard flags with ⚠ warning icon
- Row highlighted in yellow
- Issue description: "Shift in progress" or "Missing clock-out"

**Resolution:** Owner can manually add clock-out entry (future feature) or barber clocks out next day

### 2. Forgotten Break End

**Scenario:** Barber starts break but forgets to end it

**Handling:**
- Break recorded with `end: null`
- Live calculation includes break duration up to now
- Flagged as issue in owner dashboard
- Issue description: "Break not ended"

**Resolution:** Barber can end break later or owner can manually close

### 3. Multiple Clock-In Without Clock-Out

**Scenario:** Barber tries to clock in twice

**Handling:**
- Validation prevents second clock-in
- Alert shown: "Already clocked in"
- No duplicate entry created

### 4. Clock-Out While On Break

**Scenario:** Barber tries to clock out while on break

**Handling:**
- Validation prevents clock-out
- Alert shown: "Must end break before clocking out"
- Forces proper sequence

### 5. Multiple Breaks Per Shift

**Scenario:** Barber takes multiple breaks in one day

**Handling:**
- Fully supported
- Each break tracked separately
- All breaks summed for total break time
- Detailed view shows each break with start/end times

### 6. Shifts Spanning Midnight

**Scenario:** Barber clocks in before midnight, out after midnight

**Handling:**
- Each day treated separately
- First day: clock-in present, no clock-out (flagged incomplete)
- Second day: clock-out present, no clock-in (flagged incomplete)
- **Note:** This is a known limitation. Solution: Clock out before midnight and clock in again.

## UI Components

### 1. Barber Time Clock Card (`BarberTimeClockCard.tsx`)

**Location:** Barber dashboard, Today page

**Features:**
- Real-time status indicator (dot color: green=working, orange=break, gray=off)
- Four action buttons: Clock In, Start Break, End Break, Clock Out
- Button states dynamically enabled/disabled based on current state
- Today's summary: Hours Worked, Break Time, Net Hours
- Last action timestamp display
- Error messaging for invalid actions

**Validation:**
- All actions validated before submission
- Clear error messages in native language
- Prevents invalid state transitions

**Updates:**
- Auto-loads today's entries on mount
- Refreshes after each action
- Live calculation of current day totals

### 2. Owner Time Tracking Dashboard (`OwnerBarbersTimeTracking.tsx`)

**Location:** `/owner/time-tracking`

**Features:**
- Date range filter (defaults to last 30 days)
- Barber filter (all or specific barber)
- Expandable rows (click to see full shift details)
- CSV export with all data

**Table Columns:**
- Expand arrow (▶/▼)
- Barber name (with ⚠ icon if issues)
- Date
- Clock In time
- Clock Out time
- Break hours
- **Net Hours (highlighted green)**
- Status badge (color-coded)

**Expanded Row Details:**
- Total worked duration
- Break time duration
- Net worked duration
- List of all breaks with times
- Issue warning if applicable

**Visual Cues:**
- Rows with issues: Yellow background
- Warning icon (⚠) next to barber name
- Status badges color-coded
- Net hours prominently displayed
- Issue descriptions in expanded view

**Status Badge Colors:**
- Complete: Green
- In Progress: Blue
- On Break: Yellow
- Incomplete: Red

## Data Integrity & Audit Trail

### Immutable Entries

- Time entries are **never updated** after creation
- Only INSERT operations allowed
- Creates complete audit trail
- Prevents tampering with historical data

### UTC Timestamps

- All timestamps stored in UTC
- Converted to local time for display only
- Ensures consistency across time zones
- Daylight Saving Time safe

### Validation Layers

1. **Client-side:** Button disabling + validation before submit
2. **Business logic:** `validateClockAction()` checks
3. **Database:** Proper foreign key constraints

## Payroll Integration

### Net Hours Calculation

The `net_hours` field is the authoritative source for payroll calculations.

**Formula:**
```
net_hours = (clock_out - clock_in - total_break_time) / 3600000
```

**Precision:** Calculated in milliseconds, displayed to 2 decimal places

**Rounding:** Standard rounding (0.5 rounds up)

### Daily Rollup

Each `DailySummary` represents one barber's work for one day:

```typescript
{
  barberId: string,
  barberName: string,
  date: string,         // YYYY-MM-DD
  netHours: number,     // Payroll amount
  shift: {
    clockIn: string,    // ISO timestamp
    clockOut: string,   // ISO timestamp
    breaks: Array<{start, end}>,
    status: ShiftStatus
  }
}
```

### Export Format

CSV export includes:
- Barber name
- Date
- Clock in time
- Clock out time
- Total hours
- Break hours
- **Net hours** (payroll field)
- Status
- Issues flag
- Issue description

## Testing Scenarios

### Scenario 1: Normal Complete Shift

1. Barber clocks in at 9:00 AM
2. Starts break at 12:00 PM
3. Ends break at 12:30 PM
4. Clocks out at 5:00 PM

**Expected:**
- Total: 8 hours
- Break: 0.5 hours
- Net: 7.5 hours
- Status: complete

### Scenario 2: Multiple Breaks

1. Clock in at 9:00 AM
2. Break 12:00-12:30 PM (30 min)
3. Break 3:00-3:15 PM (15 min)
4. Clock out at 6:00 PM

**Expected:**
- Total: 9 hours
- Break: 0.75 hours
- Net: 8.25 hours
- Status: complete

### Scenario 3: Forgotten Clock-Out

1. Clock in at 9:00 AM
2. (Forgets to clock out)

**Expected (viewed next day):**
- Status: incomplete
- Issue: "Missing clock-out"
- Row highlighted yellow
- ⚠ icon displayed

### Scenario 4: Forgotten Break End

1. Clock in at 9:00 AM
2. Start break at 12:00 PM
3. (Forgets to end break)
4. Clock out at 5:00 PM

**Expected:**
- Break recorded as unended
- Issue: "Break not ended"
- Net hours calculation excludes unended break
- Row highlighted yellow

### Scenario 5: Invalid Action Sequence

1. Try to clock in twice → Prevented
2. Try to start break without clock-in → Prevented
3. Try to clock out while on break → Prevented

**Expected:**
- Action blocked
- Clear error message
- No invalid entry created

## Future Enhancements

### 1. Manual Time Entry Override (Owner)

Allow owners to manually add/edit entries for corrections.

**Implementation:**
- New modal component: `ManualTimeEntryModal`
- Add/edit/delete capabilities
- Audit log of manual changes
- Requires owner confirmation

### 2. Automatic Clock-Out

Auto-clock-out barbers at end of business day if forgotten.

**Implementation:**
- Scheduled job runs at shop closing time
- Checks for open shifts
- Auto-inserts clock-out entry
- Sends notification to barber
- Flagged as "auto" in notes field

### 3. Break Duration Limits

Enforce max break duration (e.g., 60 minutes).

**Implementation:**
- Warning at 50 minutes
- Force end at 60 minutes
- Configurable in shop settings

### 4. Geofencing

Require barbers to be at shop location to clock in/out.

**Implementation:**
- Browser Geolocation API
- Verify coordinates within radius
- Store location with entry
- Override capability for special cases

### 5. Biometric Verification

Prevent buddy-punching with facial recognition or fingerprint.

**Implementation:**
- WebRTC camera capture
- Third-party verification service
- Privacy-compliant storage
- Fallback to PIN if biometric fails

## Troubleshooting

### Hours Don't Match Expected

**Check:**
1. Are all clock-in/out entries present?
2. Are break durations correct?
3. Is shift spanning midnight? (see edge cases)
4. Check expanded row details for exact timestamps

### Barber Can't Clock In

**Verify:**
1. Are they already clocked in? (check status)
2. Do they have an unclosed previous shift?
3. Check browser console for errors
4. Verify network connectivity

### Missing Data in Dashboard

**Verify:**
1. Correct date range selected
2. Barber filter not excluding entries
3. Check database for entries directly
4. Verify RLS policies not blocking access

### Export CSV Shows Wrong Timezone

**Explanation:**
- Data stored in UTC
- CSV uses browser local time
- This is expected behavior
- Use ISO timestamps if UTC needed

## Best Practices

1. **Train barbers:** Emphasize importance of clocking in/out properly
2. **Daily review:** Owner should check dashboard daily for issues
3. **Fix issues promptly:** Don't let incomplete shifts accumulate
4. **Regular backups:** Include `barber_time_entries` table
5. **Audit monthly:** Review time data before payroll processing
6. **Clear policies:** Define break limits, overtime rules
7. **Communication:** Send reminders about time tracking policies

## Database Maintenance

### Indexes

Current indexes are optimized for:
- Barber-specific queries
- Date range filtering
- Chronological sorting

**Monitor:**
- Query performance on large datasets
- Consider partitioning by month if > 100K entries

### Backups

Time entries are **critical payroll data**.

**Backup strategy:**
- Daily automated backups
- Retain for minimum 7 years (legal requirement)
- Test restore procedures quarterly
- Offsite backup storage

### Cleanup

**DO NOT** delete time entries unless:
- Testing/demo data explicitly marked
- Legal retention period expired
- Barber explicitly removed and retention met

---

**System Status:** ✅ Production Ready

**Last Updated:** 2025-12-07

**Version:** 2.0

**Maintained By:** Development Team
