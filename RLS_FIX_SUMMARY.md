# RLS (Row Level Security) Fix for Registration

## Problem Identified

When registering with email confirmation enabled, the app tried to create a profile in the `profiles` table before the user had a valid session. This caused a **401 error** with the message:

```
"new row violates row-level security policy for table \"profiles\""
```

### Why This Happened

1. User registers → Supabase creates user but NO session (email not confirmed)
2. App tries to insert into `profiles` table
3. RLS policies on `profiles` table require authentication
4. Without a session, there's no authenticated user
5. Insert is blocked by RLS → 401 error

## Solution

The fix implements a **deferred profile creation** strategy:

### Registration Flow (Email Confirmation Required)
1. ✅ User registers with email/password/name
2. ✅ Supabase creates user in `auth.users` with metadata containing name
3. ✅ Alert: "Check Your Email - verify your email address, then login"
4. ℹ️  **Profile is NOT created yet** (no session = can't bypass RLS)
5. ✅ User is redirected to login screen

### First Login Flow (After Email Confirmation)
1. ✅ User confirms email via link
2. ✅ User logs in with credentials
3. ✅ Supabase returns valid session
4. ✅ App checks if profile exists
5. ✅ If no profile → Create it using name from `user_metadata`
6. ✅ User is logged in with full profile

## Code Changes

### Registration (`handleRegister`)
```typescript
// Before: Tried to insert profile without session (caused RLS error)
if (data.user && !data.session) {
  await supabase.from("profiles").insert(...) // ❌ RLS blocks this
}

// After: Skip profile creation, will be created on first login
if (data.user && !data.session) {
  console.log("ℹ️  Profile will be created after email confirmation on first login");
  // Show alert and wait for email confirmation
}
```

### Login (`handleLogin`)
```typescript
// Enhanced to create profile on first login
let profile = await getProfile(data.user.id);

if (!profile) {
  // Create profile using name from user_metadata (saved during registration)
  const userName = data.user.user_metadata?.name ?? null;
  await upsertProfile(userName ?? undefined);
  profile = await getProfile(data.user.id);
}
```

## Flow Diagram

```
Registration with Email Confirmation:
┌─────────────────────────────────────────────────────────────┐
│ 1. Register (email, password, name+surname)                 │
│    → Supabase creates user with metadata: { name: "..." }   │
│    → NO session yet (email not confirmed)                   │
│    → Profile NOT created (would violate RLS)                │
│    → Alert: "Check Your Email"                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. User clicks confirmation link in email                   │
│    → Email is confirmed                                     │
│    → User can now login                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Login (email, password)                                  │
│    → Supabase returns session (authenticated!)              │
│    → Check if profile exists                                │
│    → Profile doesn't exist → Create it now with session     │
│    → Use name from user_metadata: { name: "..." }           │
│    → Profile created successfully (RLS allows it)           │
│    → User logged in and redirected to app                   │
└─────────────────────────────────────────────────────────────┘
```

## Why This Works

1. **During Registration:**
   - No session = No way to bypass RLS
   - But we CAN save name in `user_metadata` (part of auth system)
   
2. **During First Login:**
   - Valid session = Authenticated user
   - RLS policies allow authenticated users to insert their own profile
   - We retrieve name from `user_metadata` saved during registration
   - Profile is created successfully

## Testing

### Test Registration + Login Flow:

1. **Register:**
   ```
   Console should show:
   🔵 Starting registration for: [email]
   🔵 Signup response: { hasUser: true, hasSession: false, ... }
   📧 Email confirmation required for: [userId]
   ℹ️  Profile will be created after email confirmation on first login
   ```

2. **Confirm Email:**
   - Check your email inbox
   - Click the confirmation link

3. **Login:**
   ```
   Console should show:
   🔵 Attempting login for: [email]
   🔵 Login response: { hasUser: true, hasSession: true, emailConfirmed: true, ... }
   ✅ Login successful for: [userId]
   🔵 Profile fetched: null
   🔵 Profile not found, creating from metadata
   🔵 User metadata name: [Your Name]
   ✅ Profile created: { id: ..., email: ..., name: "Your Name", ... }
   ✅ User state updated, redirecting to app
   ```

4. **Verify in Supabase:**
   - Check `profiles` table → Should see new entry with name
   - Check `auth.users` table → Should see user with confirmed email

## Important Notes

- ✅ Email confirmation is kept enabled (as requested)
- ✅ No more RLS violations
- ✅ Profile is created with the name from registration
- ✅ Subsequent logins just fetch existing profile
- ✅ Works for both email/password and OAuth flows

## RLS Policies Requirements

Your `profiles` table should have RLS policies like:

```sql
-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);
```

These policies require an authenticated session (which we now have during login).
