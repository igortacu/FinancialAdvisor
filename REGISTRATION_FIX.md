# Fixing Registration 400 Error

## Problem
Getting a 400 error on `/token` endpoint when trying to register, and credentials are not being saved in Supabase.

## Root Cause
Supabase has **email confirmation enabled by default**. When email confirmation is required:
- Users cannot login until they verify their email
- No session is created during signup
- The `/token` endpoint returns 400 because there's no valid session

## Solution Options

### Option 1: Disable Email Confirmation (Recommended for Development)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `sxdrxpuykmhobyvndkhn`
3. Go to **Authentication** → **Providers** → **Email**
4. Find the setting **"Confirm email"**
5. **Disable** the toggle for "Confirm email"
6. Save changes

**Result:** Users can register and login immediately without email verification.

### Option 2: Keep Email Confirmation Enabled

If you want to keep email confirmation for security, the app now handles it properly:

1. User registers with email/password
2. Alert shows: "Check Your Email - We've sent you a confirmation email"
3. User checks email and clicks confirmation link
4. User can then login with their credentials
5. Profile data is already stored in the database

## Code Changes Made

### 1. Enhanced Registration Flow
- ✅ Added detailed console logging for debugging
- ✅ Handles both confirmed and unconfirmed email scenarios
- ✅ Creates profile in database even when email confirmation is required
- ✅ Shows appropriate alert messages
- ✅ Better error handling for "already registered" case

### 2. Profile Creation for Unconfirmed Users
When email confirmation is required, the code now:
```typescript
// Manually insert profile since we don't have a session yet
await supabase.from("profiles").insert({
  id: data.user.id,
  email: data.user.email ?? e,
  name: fullName,
});
```

This ensures the profile exists when the user confirms their email and logs in.

## Testing Steps

### With Email Confirmation Disabled:
1. Register with a new email
2. Should immediately login and redirect to app
3. Check Supabase `profiles` table - should see new entry
4. Check Supabase `auth.users` table - should see new user

### With Email Confirmation Enabled:
1. Register with a new email
2. Should see alert: "Check Your Email"
3. Check email inbox for confirmation link
4. Click confirmation link
5. Return to app and login with credentials
6. Should successfully login and redirect to app

## Quick Fix Command

To quickly disable email confirmation via Supabase CLI (if installed):

```bash
supabase projects api-keys --project-ref sxdrxpuykmhobyvndkhn
```

## Important Notes

- The 400 error on `/token` is **expected behavior** when email confirmation is enabled
- The user IS created in Supabase auth, but cannot login until email is confirmed
- The profile is now created regardless of email confirmation status
- For production, keep email confirmation enabled for security
- For development/testing, disable it for faster iteration

## Debugging

Check the console logs when registering:
- 🔵 Starting registration for: [email]
- 🔵 Signup response: [details]
- 📧 Email confirmation required (if applicable)
- ✅ User registered and logged in (if no confirmation needed)
- ❌ Any errors that occur

## Next Steps

1. **Go to Supabase Dashboard and disable email confirmation** (for testing)
2. Try registering again
3. Check console logs for detailed information
4. Verify user appears in `profiles` table
