#!/bin/bash

# 🚀 Quick Setup Script for Running on Physical Device (FREE)
# This script helps you set up either Android or iOS development

echo "🚀 Device Setup Helper - 100% FREE"
echo "===================================\n"

# Check what's available
HAS_XCODE=false
HAS_ANDROID=false

if command -v xcodebuild &> /dev/null; then
    HAS_XCODE=true
fi

if [ -d "$HOME/Library/Android/sdk" ]; then
    HAS_ANDROID=true
fi

echo "Current Setup Status:"
echo "-------------------"
if [ "$HAS_XCODE" = true ]; then
    echo "✅ Xcode: Installed (iOS ready)"
else
    echo "❌ Xcode: Not installed (needed for iOS)"
fi

if [ "$HAS_ANDROID" = true ]; then
    echo "✅ Android SDK: Found"
    export ANDROID_HOME=$HOME/Library/Android/sdk
    export PATH=$PATH:$ANDROID_HOME/platform-tools
    if command -v adb &> /dev/null; then
        echo "✅ ADB: Available"
        
        # Check for connected Android devices
        DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l)
        if [ $DEVICES -gt 0 ]; then
            echo "✅ Android Device: Connected ($DEVICES device(s))"
        else
            echo "⚠️  Android Device: Not connected"
            echo "   → Connect your phone via USB"
            echo "   → Enable USB Debugging in Developer Options"
        fi
    fi
else
    echo "❌ Android SDK: Not found"
    echo "   → Download Android Studio from https://developer.android.com/studio"
fi

echo "\n-------------------"
echo "\nRecommendation:"
echo "===============\n"

if [ "$HAS_ANDROID" = true ] && command -v adb &> /dev/null; then
    echo "🤖 ANDROID IS READY!"
    echo "\n📱 To build and run on your Android device:"
    echo "   1. Connect your Android phone via USB"
    echo "   2. Enable USB Debugging on your phone"
    echo "   3. Run: npm run android"
    echo "\n✨ Your app will install and run automatically!\n"
elif [ "$HAS_XCODE" = true ]; then
    echo "🍎 iOS IS READY!"
    echo "\n📱 To build and run on your iPhone:"
    echo "   1. Connect your iPhone via USB"
    echo "   2. Run: npm run ios -- --device"
    echo "   3. Trust your developer certificate on iPhone"
    echo "\n✨ Your app will install and run automatically!\n"
else
    echo "📥 SETUP NEEDED"
    echo "\nChoose one option:\n"
    echo "Option 1 - ANDROID (RECOMMENDED - Easier & No Limits):"
    echo "  1. Download Android Studio: https://developer.android.com/studio"
    echo "  2. Install Android SDK from SDK Manager"
    echo "  3. Add to ~/.zshrc:"
    echo "     export ANDROID_HOME=\$HOME/Library/Android/sdk"
    echo "     export PATH=\$PATH:\$ANDROID_HOME/platform-tools"
    echo "  4. Run: source ~/.zshrc"
    echo "  5. Enable USB Debugging on your Android phone"
    echo "  6. Run: npm run android\n"
    
    echo "Option 2 - iOS:"
    echo "  1. Install Xcode from Mac App Store (free but 15GB)"
    echo "  2. Sign in with Apple ID in Xcode > Settings > Accounts"
    echo "  3. Connect iPhone via USB"
    echo "  4. Run: npm run ios -- --device"
    echo "  5. Trust certificate on iPhone"
    echo "  ⚠️  Note: App expires every 7 days with free Apple ID\n"
fi

echo "-------------------"
echo "📖 For detailed instructions, see: RUN-ON-DEVICE-FREE.md"
echo "🎯 Both options are 100% FREE - no paid accounts needed!"
