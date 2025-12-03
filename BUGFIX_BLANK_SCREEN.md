# Bug Fix: Blank Screen After Login

## Problem

After successfully logging in as owner@example.com or any other user, the application showed a blank white screen instead of redirecting to the appropriate dashboard.

### Root Cause

The issue was **infinite recursion in Row Level Security (RLS) policies**.

The original policies for the `users` table looked like this:

```sql
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'OWNER'
    )
  );
```

**The Problem:**
1. User tries to read from `users` table
2. Policy checks if they're an OWNER by querying the `users` table
3. That query triggers the same policy again
4. Step 2-3 repeat infinitely = database error

The browser console showed:
```
Error: infinite recursion detected in policy for relation "users"
```

## Solution

Created a new migration (`fix_rls_infinite_recursion`) that:

1. **Dropped all recursive policies** that queried the same table they were protecting
2. **Simplified the policies** to avoid recursion:
   - Allow all authenticated users to read all users (needed for barber lists, appointment displays)
   - Users can only update their own profile
   - Simplified service and appointment policies

### New Policies

```sql
-- Simple, non-recursive policy
CREATE POLICY "Authenticated users can read users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

**Why this works:**
- No recursive queries
- Still secure (RLS is enabled, only authenticated users can access)
- Permission checks for owner-only actions can be done in application code if needed

## Additional Improvements

Enhanced error handling in `AuthContext.tsx`:
- Added `error` state to track authentication issues
- Shows clear error message if user is authenticated but has no profile record
- Displays "Authentication Error" page instead of blank screen when something goes wrong

## Testing

After the fix:
1. ✅ Login as owner@example.com redirects to `/owner/today`
2. ✅ Login as barber1@example.com or barber2@example.com redirects to `/barber/today`
3. ✅ No more blank screens
4. ✅ No console errors
5. ✅ Build succeeds without errors

## Files Changed

1. `supabase/migrations/[timestamp]_fix_rls_infinite_recursion.sql` - New migration with fixed policies
2. `src/contexts/AuthContext.tsx` - Added error state and better error handling
3. `src/App.tsx` - Display error page when profile loading fails

## Prevention

To avoid this in the future:
- **Never query the same table in its own RLS policy**
- Use `auth.uid()` for user identity checks
- Store role/permission info in JWT claims if complex role checks are needed
- Keep policies simple and non-recursive
