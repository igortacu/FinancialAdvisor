# OAuth Configuration Guide

## Changes Made

### 1. Biometric Login Auto-Trigger
- **File**: `app/auth/index.tsx`
- **Change**: When biometric is enabled, it now automatically triggers on app launch
- The user won't need to manually tap the biometric button if they've enabled it previously

### 2. Multiple OAuth Call Prevention
- **File**: `app/auth/index.tsx`
- **Change**: Added `isGoogleLoading` state to prevent multiple simultaneous OAuth calls
- Added 2-second cooldown after each attempt
- Users can no longer spam the Google sign-in button

### 3. Fixed OAuth Redirect URI
- **File**: `lib/authRedirect.ts`
- **Change**: Updated to use `fintechui://` scheme instead of `exp://` for mobile
- Added proper configuration options for `makeRedirectUri`

### 4. Deep Link Handler
- **File**: `app/_layout.tsx`
- **Change**: Added OAuth callback handler using React Native Linking API
- Parses the OAuth tokens from the deep link and sets the session in Supabase

## Required Supabase Configuration

To make Google OAuth work on mobile, you need to configure the redirect URLs in your Supabase dashboard:

### Step 1: Go to Supabase Dashboard
1. Navigate to: https://app.supabase.com
2. Select your project
3. Go to **Authentication** → **URL Configuration**

### Step 2: Add Redirect URLs
Add the following URLs to **Redirect URLs** section:

#### For Development (Expo Go):
```
exp://192.168.8.184:8081
exp://localhost:8081
```

#### For Production (Standalone App):
```
fintechui://
fintechui://auth/callback
```

#### For Web:
```
http://localhost:3000
https://yourdomain.com
```

### Step 3: Configure Google OAuth Provider
1. Go to **Authentication** → **Providers**
2. Enable **Google**
3. Add your Google OAuth credentials:
   - Client ID (from Google Cloud Console)
   - Client Secret (from Google Cloud Console)

### Step 4: Google Cloud Console Configuration
1. Go to: https://console.cloud.google.com
2. Select your project (or create one)
3. Navigate to **APIs & Services** → **Credentials**
4. Create or edit OAuth 2.0 Client ID
5. Add authorized redirect URIs:
   ```
   https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
   ```
6. For mobile, add the package name/bundle ID in the OAuth consent screen

## Testing

### Development Mode (Expo Go):
```bash
cd finance-assistant/fintech-ui
npm start
```
- Scan QR code with Expo Go
- The app will use `exp://` redirect URLs

### Production Mode (Standalone):
```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```
- The standalone app will use `fintechui://` redirect URLs

## Troubleshooting

### Issue: "Invalid redirect URL"
- **Solution**: Make sure the redirect URL is added to Supabase dashboard

### Issue: OAuth opens but doesn't redirect back
- **Solution**: Check that the scheme in `app.json` matches the redirect URL
- Verify deep link handling in `app/_layout.tsx` is working

### Issue: Multiple OAuth calls
- **Solution**: Already fixed - there's now a 2-second cooldown and loading state check

### Issue: Biometric not auto-triggering
- **Solution**: Check that biometric was enabled in the first place by going through the registration flow

## Logs to Monitor

When testing, watch for these console logs:

```
🔐 Biometric login enabled - auto-triggering  // Biometric detected
🔄 OAuth redirect URI: fintechui://           // Correct redirect URI
⚠️ Google sign-in already in progress        // Multiple call prevention
🔗 Deep link received: fintechui://...        // Deep link received
🔐 Processing OAuth callback                  // Processing tokens
✅ OAuth callback processed successfully      // Success!
```
