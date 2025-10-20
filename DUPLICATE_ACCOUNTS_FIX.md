# Fixing "Invalid Login Credentials" After Email Confirmation

## Problem

You have **multiple unconfirmed user accounts** with the same email address:
- `29cb250e-2731-4b04-a13d-cb6e2d645755`
- `2d97b241-751d-454f-9417-44f2a7a49c60`
- `a7b02927-efea-49ea-8007-d16f2b049a8a`

All for email: `tacu03igor@gmail.com`

When you try to login, Supabase doesn't know which user to authenticate, resulting in "Invalid login credentials" error.

## Solution: Clean Up Duplicate Accounts

### Option 1: Delete Duplicate Accounts via Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/sxdrxpuykmhobyvndkhn/auth/users
   ```

2. **Find all users with email `tacu03igor@gmail.com`**

3. **For each duplicate user:**
   - Click on the user
   - Click **"Delete user"**
   - Confirm deletion

4. **Keep only ONE user** (or delete all and re-register)

5. **If you kept one user:**
   - Make sure it's confirmed (email_confirmed_at should have a timestamp)
   - If not confirmed, you can manually confirm it or use the confirmation link

6. **Try logging in again**

### Option 2: Use Supabase SQL Editor

1. **Go to SQL Editor:**
   ```
   https://supabase.com/dashboard/project/sxdrxpuykmhobyvndkhn/sql/new
   ```

2. **Run this query to see all your accounts:**
   ```sql
   SELECT 
     id, 
     email, 
     email_confirmed_at,
     created_at,
     last_sign_in_at
   FROM auth.users 
   WHERE email = 'tacu03igor@gmail.com'
   ORDER BY created_at DESC;
   ```

3. **Delete the duplicate unconfirmed accounts:**
   ```sql
   -- Replace the IDs with the ones you want to DELETE
   DELETE FROM auth.users 
   WHERE id IN (
     '29cb250e-2731-4b04-a13d-cb6e2d645755',
     '2d97b241-751d-454f-9417-44f2a7a49c60'
   );
   -- Keep the most recent one: a7b02927-efea-49ea-8007-d16f2b049a8a
   ```

4. **Manually confirm the remaining user (if needed):**
   ```sql
   UPDATE auth.users 
   SET email_confirmed_at = NOW()
   WHERE id = 'a7b02927-efea-49ea-8007-d16f2b049a8a';
   ```

### Option 3: Start Fresh

If you want to completely start over:

1. **Delete all accounts with your email:**
   ```sql
   DELETE FROM auth.users 
   WHERE email = 'tacu03igor@gmail.com';
   ```

2. **Register again with a fresh account**

3. **Confirm the email via the link sent to your inbox**

4. **Login**

## Prevention: Code Updates

I've added checks to prevent this issue in the future:

### 1. Detection of Existing Users
The registration flow now checks if a user already exists:
```typescript
// Check if user already exists (empty identities array)
if (data.user?.identities?.length === 0) {
  Alert.alert("Account Exists", "Please login instead.");
}
```

### 2. Better Error Messages
- "This email is already registered. Please login instead."
- Shows specific guidance based on the error

## Testing After Cleanup

Once you've cleaned up the duplicate accounts:

1. **Try registering with a NEW email** first to test the flow
2. **Confirm the email**
3. **Login** - Should work perfectly
4. **Check console logs** for the detailed flow
5. **Verify profile is created** in Supabase `profiles` table

## Why This Happened

Supabase allows multiple registrations with the same email **if email confirmation is enabled**. Each registration creates a new unconfirmed user. This is a known quirk of Supabase's auth system.

The fix prevents users from repeatedly registering with the same email by detecting when identities array is empty (indicating user already exists).

## Current Status

- ✅ Registration flow updated to detect existing users
- ✅ Profile creation deferred until first login (RLS fix)
- ✅ Better error messages and logging
- ⚠️  Need to clean up duplicate accounts in Supabase
- ⚠️  Then test with a clean registration

## Next Steps

1. **Clean up duplicate accounts** using one of the options above
2. **Test registration** with a new email
3. **Confirm email** via inbox link  
4. **Login** - Should work!
5. **Verify profile** appears in `profiles` table
