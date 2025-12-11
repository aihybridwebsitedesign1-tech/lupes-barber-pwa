# Lupe's Barber Shop – Control Panel (Phase 1)

PWA booking and management system for Lupe's Barber Shop.

## Features (Phase 1)

- **Authentication**: Email/password login for Owner and Barbers
- **Owner Dashboard**: View today's appointments and revenue, create appointments manually
- **Barber Dashboard**: View and manage personal appointments (mark completed/no-show)
- **Client Booking**: Public booking flow with bilingual support (EN/ES)
- **PWA Support**: Installable as a progressive web app
- **Bilingual**: Full English and Spanish language support

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Database & Auth**: Supabase (PostgreSQL)
- **Routing**: React Router v6
- **PWA**: Vite PWA Plugin

## Prerequisites

- Node.js 18+ and npm
- A Supabase account and project

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the `.env.example` file to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env` and set:

```
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

You can find these values in your Supabase project settings under **Project Settings > API**.

### 3. Set Up Supabase Database

The database tables and sample data have already been created via migrations. You should see:

- `users` table with 3 test users (1 owner, 2 barbers)
- `clients` table
- `services` table with 5 sample services
- `appointments` table

All tables have Row Level Security (RLS) enabled with appropriate policies.

### 4. Create Authentication Accounts

You need to manually create auth accounts for the test users. Go to your Supabase Dashboard:

1. Navigate to **Authentication > Users**
2. Click **Add User** and create these accounts:

**Owner Account:**
- Email: `owner@example.com`
- Password: `Owner123!`
- After creating, copy the UUID and update the `users` table:
  ```sql
  UPDATE users SET id = 'paste-uuid-here' WHERE email = 'owner@example.com';
  ```

**Barber 1 Account:**
- Email: `barber1@example.com`
- Password: `Barber123!`
- Update the `users` table with the new UUID

**Barber 2 Account:**
- Email: `barber2@example.com`
- Password: `Barber123!`
- Update the `users` table with the new UUID

**Alternative: Use SQL Editor** (Recommended)

Run these commands in Supabase SQL Editor to link existing user records to auth accounts:

```sql
-- Check existing users
SELECT id, email, name, role FROM users;

-- After creating auth users in the UI, update the users table IDs to match
-- Replace 'auth-user-id' with the actual UUID from auth.users
UPDATE users SET id = 'auth-user-id' WHERE email = 'owner@example.com';
UPDATE users SET id = 'auth-user-id' WHERE email = 'barber1@example.com';
UPDATE users SET id = 'auth-user-id' WHERE email = 'barber2@example.com';
```

### 5. Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 6. Build for Production

```bash
npm run build
```

The production files will be in the `dist/` directory.

## Test Accounts

After setting up auth accounts:

- **Owner**: owner@example.com / Owner123!
- **Barber 1**: barber1@example.com / Barber123!
- **Barber 2**: barber2@example.com / Barber123!

## Routes

### Authenticated Routes

- `/owner/today` - Owner dashboard with today's summary
- `/owner/appointments` - All appointments (placeholder)
- `/owner/clients` - Client management (placeholder)
- `/owner/barbers` - Barber management (placeholder)
- `/owner/services` - Service management (placeholder)
- `/barber/today` - Barber's daily appointments

### Public Routes

- `/login` - Authentication page
- `/book` - Client-facing booking flow

## Database Schema

### Tables

1. **users** - System users (owners and barbers)
2. **clients** - Customer information
3. **services** - Available services
4. **appointments** - Booking records

All tables have RLS enabled with role-based access policies.

## Language Support

The app supports English (EN) and Spanish (ES). Users can toggle between languages using the buttons in the header. The booking flow (`/book`) starts with a language selection step.

## PWA Installation

The app can be installed as a PWA on mobile devices and desktop browsers. The manifest and service worker are automatically configured.

## Phase 1 Limitations

This is Phase 1 implementation. The following features are **NOT** included yet:

- Barber schedules and availability rules
- Time-off management
- Products module
- Payment processing
- SMS notifications
- Advanced analytics
- Transformation photos
- Voice agent integration

These will be implemented in later phases.

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── Header.tsx
│   └── NewAppointmentModal.tsx
├── contexts/        # React contexts
│   ├── AuthContext.tsx
│   └── LanguageContext.tsx
├── lib/            # Utilities and configuration
│   ├── supabase.ts
│   └── translations.ts
├── pages/          # Route components
│   ├── Login.tsx
│   ├── Book.tsx
│   ├── OwnerToday.tsx
│   ├── BarberToday.tsx
│   └── ...
├── App.tsx         # Main app component with routing
├── main.tsx        # Entry point
└── index.css       # Global styles
```

## Troubleshooting

### "Missing Supabase environment variables" error

Make sure you've created a `.env` file (not `.env.example`) with valid Supabase credentials.

### Login fails

1. Verify auth users were created in Supabase Dashboard
2. Check that user IDs in `public.users` table match IDs in `auth.users`
3. Ensure RLS policies are enabled on all tables

### No data showing

Make sure the migrations ran successfully and seed data was inserted. Check the Supabase Table Editor.

## Support

For issues specific to Phase 1 implementation, refer to the project documentation in `docs/plan-tonight.md`.
