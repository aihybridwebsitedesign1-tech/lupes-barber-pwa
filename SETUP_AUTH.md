# Setting Up Authentication Accounts

This guide explains how to create authentication accounts and link them to the application users.

## Step 1: Create Auth Users in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Authentication > Users**
3. Click **Add User** (or **Invite**)
4. Create the following users:

### Owner Account
- Email: `owner@example.com`
- Password: `Owner123!`
- Auto Confirm User: **YES** (check this box)

### Barber 1 Account
- Email: `barber1@example.com`
- Password: `Barber123!`
- Auto Confirm User: **YES**

### Barber 2 Account
- Email: `barber2@example.com`
- Password: `Barber123!`
- Auto Confirm User: **YES**

## Step 2: Link Auth Users to Application Users

After creating each auth user, you need to link them to the corresponding records in the `users` table.

### Method 1: Using SQL Editor (Recommended)

1. Go to **SQL Editor** in your Supabase dashboard
2. Run this query to see the auth user IDs:

```sql
SELECT id, email FROM auth.users;
```

3. Copy the UUIDs for each user
4. Run these UPDATE statements (replace the UUIDs with the actual ones from step 2):

```sql
-- Update owner
UPDATE users
SET id = 'PASTE-OWNER-UUID-HERE'
WHERE email = 'owner@example.com';

-- Update barber 1
UPDATE users
SET id = 'PASTE-BARBER1-UUID-HERE'
WHERE email = 'barber1@example.com';

-- Update barber 2
UPDATE users
SET id = 'PASTE-BARBER2-UUID-HERE'
WHERE email = 'barber2@example.com';
```

### Method 2: Using Table Editor

1. Go to **Table Editor** and open the `users` table
2. For each user record, click to edit
3. Update the `id` field with the corresponding UUID from the auth user
4. Save changes

## Step 3: Verify Setup

Run this query to verify everything is linked correctly:

```sql
SELECT
  u.id,
  u.email,
  u.name,
  u.role,
  au.email as auth_email
FROM users u
LEFT JOIN auth.users au ON u.id = au.id;
```

All rows should show matching emails in both columns.

## Step 4: Test Login

1. Start the development server: `npm run dev`
2. Navigate to `http://localhost:5173/login`
3. Try logging in with each account:
   - Owner: owner@example.com / Owner123!
   - Barber 1: barber1@example.com / Barber123!
   - Barber 2: barber2@example.com / Barber123!

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env` file exists with correct Supabase URL and anon key

### "Invalid login credentials"
- Verify auth users were created in Supabase Dashboard
- Check that passwords match exactly (case-sensitive)
- Ensure "Auto Confirm User" was checked when creating users

### User logs in but sees error or blank page
- Verify the user IDs in `users` table match the IDs in `auth.users`
- Check browser console for specific error messages
- Ensure RLS policies are enabled on all tables

### RLS policies blocking access
Run this query to check policies:

```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';
```

You should see multiple policies for each table (users, clients, services, appointments).
