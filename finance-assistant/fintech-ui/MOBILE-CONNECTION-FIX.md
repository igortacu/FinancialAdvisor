# Mobile Connection Fix Guide

## Problem
The app shows "Opening project..." indefinitely when trying to connect from mobile device.

## Root Cause
Expo Go has connectivity issues with certain network configurations. The recommended solution is to use a **Development Build** instead.

## Solution Options

### Option 1: Create Development Build (RECOMMENDED)
This creates a standalone dev app with better connectivity:

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS
eas build:configure

# Create development build for your device
# For iOS:
eas build --profile development --platform ios

# For Android:
eas build --profile development --platform android
```

After the build completes, install it on your device and it will work reliably.

### Option 2: Ensure Same WiFi Network
Both your Mac and mobile device MUST be on the exact same WiFi network:

1. **Check Mac WiFi**: `System Settings > Network > Wi-Fi`
   - Current IP: `172.18.25.122`
   - Network name: Check what it shows

2. **Check Phone WiFi**: `Settings > Wi-Fi`
   - Must be connected to the SAME network name as Mac
   - Not mobile data, not different WiFi

### Option 3: Use Tunnel Mode (If same network doesn't work)
The tunnel uses Expo's servers to proxy the connection:

```bash
cd /Users/igortacu/Desktop/Work/FinancialAdvisor/finance-assistant/fintech-ui
npm run start:tunnel
```

Wait for the QR code, scan it, and it should work (may be slower).

### Option 4: Quick Test with Simulator (Development only)
If you have Xcode installed:

```bash
npm run ios
```

This opens in iOS Simulator on your Mac.

## Current Setup
- Mac IP: `172.18.25.122`
- Server running on port: `8081`
- Firewall: Disabled (not blocking)

## Why Development Build is Better
- ✅ More reliable connectivity
- ✅ Works on all network configurations  
- ✅ Better performance
- ✅ Supports all native modules
- ✅ Required for production anyway

## Quick Fix to Try Now
1. Make sure iPhone and Mac are on SAME WiFi
2. Delete Expo Go app from phone
3. Reinstall Expo Go from App Store
4. Clear Expo cache: `npx expo start --clear`
5. Scan the new QR code
