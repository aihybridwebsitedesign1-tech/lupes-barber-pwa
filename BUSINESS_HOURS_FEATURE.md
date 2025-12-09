# Business Hours Feature

## Overview
Added a comprehensive Business Hours management system that allows shop owners to set opening and closing times for each day of the week, with proper display on the client-facing website in 12-hour AM/PM format.

## Changes Made

### 1. Time Format Helper (`src/lib/timeFormat.ts`)
Created utility functions for time format conversion:
- `convertTo12Hour(time24: string)`: Converts 24-hour format (e.g., "14:30") to 12-hour AM/PM format (e.g., "2:30 PM")
- `convertTo24Hour(time12: string)`: Converts 12-hour format back to 24-hour format for storage

### 2. Owner Settings Page (`src/pages/OwnerSettings.tsx`)
Added Business Hours section in the "Shop Info" tab:
- **State Management**: Added `businessHours` state to manage hours for all 7 days of the week
- **Data Loading**: Loads existing hours from `shop_config.shop_hours` on page load
- **Interactive UI**: For each day of the week:
  - Checkbox to mark day as open/closed
  - Time pickers for opening and closing times (24-hour format in admin for precision)
  - Visual feedback showing "Closed" for days marked as closed
  - Clean, organized layout with day names in both English and Spanish
- **Data Persistence**: Saves business hours to the database when "Save Changes" is clicked

### 3. Client Home Page (`src/pages/ClientHome.tsx`)
Enhanced the "Quick Info" section to display business hours:
- **12-Hour Format**: Hours are now displayed in 12-hour AM/PM format (e.g., "10:00 AM - 7:00 PM")
- **Smart Grouping**: Consecutive days with identical hours are grouped (e.g., "Mon-Fri: 9:00 AM - 6:00 PM")
- **Bilingual Display**: Day names shown in English or Spanish based on user's language preference
- **Fallback Display**: Shows default hours if none are configured

## Database Structure

The `shop_config` table already has a `shop_hours` column of type `jsonb` that stores hours in this format:

```json
{
  "0": null,  // Sunday - closed
  "1": { "open": "10:00", "close": "19:00" },  // Monday
  "2": { "open": "10:00", "close": "19:00" },  // Tuesday
  "3": { "open": "10:00", "close": "19:00" },  // Wednesday
  "4": { "open": "10:00", "close": "19:00" },  // Thursday
  "5": { "open": "10:00", "close": "19:00" },  // Friday
  "6": { "open": "10:00", "close": "19:00" }   // Saturday
}
```

- Days are indexed 0-6 (Sunday = 0, Saturday = 6)
- `null` indicates the shop is closed that day
- Times are stored in 24-hour format for consistency

## Features

### Owner Experience
- Easy-to-use interface with checkboxes and time pickers
- Visual feedback for open/closed days
- Bilingual labels (English/Spanish)
- All changes saved together with other shop info

### Client Experience
- Professional 12-hour AM/PM format display
- Smart grouping of consecutive days with same hours
- Clear "Closed" indication for days off
- Responsive layout that works on all devices

## Example Displays

### Owner View (Settings)
```
Sunday    [ ] Open
Monday    [x] Open  09:00 - 18:00
Tuesday   [x] Open  09:00 - 18:00
Wednesday [x] Open  09:00 - 18:00
Thursday  [x] Open  09:00 - 18:00
Friday    [x] Open  09:00 - 18:00
Saturday  [x] Open  10:00 - 16:00
```

### Client View (Homepage)
```
Hours
Mon-Fri: 9:00 AM - 6:00 PM
Sat: 10:00 AM - 4:00 PM
Sun: Closed
```

## Benefits
- **Professional Presentation**: 12-hour format is more familiar to customers
- **Easy Management**: Owners can quickly update hours without technical knowledge
- **Flexible Schedule**: Support for different hours each day or multiple day ranges
- **Bilingual Support**: Proper translations for Spanish-speaking customers
- **Data Integrity**: Hours stored in standardized 24-hour format in database
