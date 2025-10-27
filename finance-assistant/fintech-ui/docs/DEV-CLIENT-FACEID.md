# Face ID on iOS with Expo — Development Client Required

Face ID on iOS requires the `NSFaceIDUsageDescription` key in your app's Info.plist. Expo Go cannot apply project-specific Info.plist changes, so biometric authentication using Face ID will fail with an error like:

```
error: "missing_usage_description"
warning: "FaceID is available but has not been configured. To enable FaceID, provide NSFaceIDUsageDescription."
```

We already added the key in `app.json`:

```jsonc
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSFaceIDUsageDescription": "Use Face ID to quickly and securely sign you into your account"
      }
    }
  }
}
```

However, to use it on device, you must run the app in a Development Client (Dev Build) or a standalone build.

## Option A: EAS Development Client (recommended)

1. Ensure you are logged in to Expo
```sh
npx expo login
```

2. Install EAS CLI if needed
```sh
npm i -g eas-cli
```

3. Kick off a development build for iOS
```sh
eas build --profile development --platform ios
```

4. Install the resulting build on your device (via QR code/TestFlight as prompted by EAS)

5. Start the project in dev-client mode
```sh
npx expo start --dev-client
```

Now Face ID will work and the prompt will show.

## Option B: Standalone build

Build an App Store/Ad Hoc/TestFlight build and install it. The Info.plist will include `NSFaceIDUsageDescription` automatically from `app.json`.

## Troubleshooting

- If you still see `missing_usage_description`, double-check that:
  - The build you’re running is the Dev Client or standalone app (not Expo Go)
  - `app.json` contains `ios.infoPlist.NSFaceIDUsageDescription`
  - You fully closed Expo Go and opened the Dev Client app
- If Face ID is set up on the device but prompts still fail or cancel, check logs for additional details. We now surface `authenticateAsync` warnings/errors to help diagnose (lockout, not_interactive, system_cancel, etc.).
