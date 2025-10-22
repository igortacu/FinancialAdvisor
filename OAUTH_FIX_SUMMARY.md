# OAuth and Registration Fix Summary

## Issue #47: Fix OAuth with Supabase to Store Data

### Problem
- OAuth (Google Sign-in) wasn't storing user data in the `profiles` table
- Registration wasn't properly combining name and surname fields
- Profile data wasn't being synced from the database on login/auth state changes

### Solution Overview
Fixed the authentication flow to properly store and retrieve user data from the `profiles` table with the following changes:

---

## Changes Made

### 1. **Updated `lib/profile.ts`**
- ✅ Modified `upsertProfile()` to accept an optional `name` parameter
- ✅ Added logic to handle name from multiple sources (parameter, user_metadata)
- ✅ Added new `getProfile()` function to fetch profile data from the database
- ✅ Removed `avatar_url` field (not in profiles table schema)

**Key Changes:**
```typescript
export async function upsertProfile(name?: string) {
  // Now accepts optional name parameter
  // Stores in profiles table: id, email, name
}

export async function getProfile(userId: string) {
  // Fetches profile data from database
}
```

### 2. **Updated `app/auth/index.tsx`**

#### Registration Flow (`handleRegister`)
- ✅ Combines `name` and `surname` fields into a single `name` field
- ✅ Passes combined name to Supabase auth metadata
- ✅ Calls `upsertProfile(fullName)` to store in profiles table
- ✅ Sets user state with combined name

#### Login Flow (`handleLogin`)
- ✅ Fetches profile from database using `getProfile()`
- ✅ Ensures profile exists in database with `upsertProfile()`
- ✅ Prioritizes database profile name over metadata name

#### OAuth Flow (session resume `useEffect`)
- ✅ Calls `upsertProfile()` to create/update profile after OAuth
- ✅ Fetches profile from database using `getProfile()`
- ✅ Properly stores Google OAuth user data in profiles table

### 3. **Updated `store/auth.tsx`**
- ✅ Modified `AuthProvider` to fetch profile data from database
- ✅ Updated initial auth state check to call `getProfile()`
- ✅ Updated `onAuthStateChange` listener to fetch profile data
- ✅ Made the callback async to support database queries

---

## How It Works Now

### Registration Flow
1. User enters email, password, name, and surname
2. Name and surname are combined: `[name, surname].join(" ")`
3. User is created in Supabase Auth with metadata containing name
4. Profile is stored in `profiles` table with: `id`, `email`, `name`
5. User is redirected to app with full profile data

### Login Flow
1. User logs in with email and password
2. Profile is fetched from `profiles` table
3. If profile doesn't exist, it's created from auth metadata
4. User state is updated with database profile data
5. User is redirected to app

### OAuth (Google Sign-in) Flow
1. User clicks "Sign in with Google"
2. Google OAuth completes and returns to app
3. `upsertProfile()` creates/updates profile in `profiles` table
4. Profile data is fetched from database
5. User state includes name from Google (stored in profiles table)
6. User is redirected to app

### Auth State Changes
1. Any time auth state changes (login, logout, session refresh)
2. Profile data is fetched from `profiles` table
3. User state is updated with database data
4. Ensures consistency across all authentication methods

---

## Database Schema Used

**`profiles` table:**
```sql
- id (uuid, primary key)
- email (text)
- name (text, nullable)
- created_at (timestamp)
```

---

## Testing Checklist

- [ ] Test email/password registration with name and surname
- [ ] Verify profile is stored in `profiles` table after registration
- [ ] Test email/password login
- [ ] Verify profile data is loaded from database on login
- [ ] Test Google OAuth sign-in
- [ ] Verify Google user data is stored in `profiles` table
- [ ] Test app refresh/reload (session persistence)
- [ ] Verify profile data loads correctly after refresh

---

## Files Modified

1. `finance-assistant/fintech-ui/lib/profile.ts`
2. `finance-assistant/fintech-ui/app/auth/index.tsx`
3. `finance-assistant/fintech-ui/store/auth.tsx`

---

## Notes

- The fix prioritizes database data over auth metadata for consistency
- Name and surname are combined into a single `name` field as requested
- OAuth flow now properly stores user data from Google in the profiles table
- All authentication methods (email, OAuth) now follow the same data storage pattern
