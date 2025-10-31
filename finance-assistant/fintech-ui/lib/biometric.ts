import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Alert, Platform } from 'react-native';

// Avoid spamming the same configuration alert in one session
let faceIdConfigAlertShown = false;

function isExpoGoIOS(): boolean {
  return Platform.OS === 'ios' && Constants.appOwnership === 'expo';
}

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const STORED_EMAIL_KEY = 'stored_email';
const STORED_PASSWORD_KEY = 'stored_password';

/**
 * Check if we're running on web (where biometrics aren't supported)
 */
function isWeb(): boolean {
  return Platform.OS === 'web';
}

/**
 * Check if device supports biometric authentication
 */
export async function isBiometricSupported(): Promise<boolean> {
  if (isWeb()) {
    return false;
  }
  
  try {
    // In Expo Go on iOS, NSFaceIDUsageDescription cannot be applied,
    // so Face ID will not work. Report unsupported here to avoid prompting.
    if (isExpoGoIOS()) {
      console.log('ℹ️ Face ID unavailable in Expo Go (build-time permission required).');
      return false;
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  } catch (error) {
    console.error('Error checking biometric support:', error);
    return false;
  }
}

/**
 * Get available biometric types
 */
export async function getBiometricType(): Promise<string> {
  if (isWeb()) {
    return 'Biometric';
  }
  
  // In Expo Go, don't try to check Face ID types
  if (isExpoGoIOS()) {
    return 'Face ID';
  }
  
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris Recognition';
    }
    
    return 'Biometric';
  } catch (error) {
    console.error('Error getting biometric type:', error);
    return 'Biometric';
  }
}

/**
 * Authenticate with biometrics
 */
export async function authenticateWithBiometrics(): Promise<boolean> {
  if (isWeb()) {
    return false;
  }
  
  try {
    // Silently skip Face ID on iOS Expo Go (works fine on Android Expo Go!)
    if (isExpoGoIOS()) {
      console.log('ℹ️ Face ID unavailable in Expo Go on iOS - silently skipping');
      return false;
    }

    const biometricType = await getBiometricType();
    
    console.log(`👤 Prompting ${biometricType} authentication...`);
    
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: `Authenticate with ${biometricType}`,
      cancelLabel: 'Cancel',
      disableDeviceFallback: true, // Don't fall back to device passcode
      fallbackLabel: '', // No fallback option
    });

    if ((result as any).warning || (result as any).error) {
      console.log(`ℹ️ Biometric result detail:`, {
        error: (result as any).error,
        warning: (result as any).warning,
      });
    }

    if (result.success) {
      console.log(`✅ ${biometricType} authentication successful`);
    } else {
      console.log(`❌ ${biometricType} authentication failed or cancelled`);
    }

    return result.success;
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return false;
  }
}

/**
 * Enable biometric login by storing credentials
 */
export async function enableBiometricLogin(email: string, password: string, skipAuth: boolean = false): Promise<boolean> {
  if (isWeb()) {
    Alert.alert(
      'Not Available',
      'Biometric authentication is not available on web browsers.'
    );
    return false;
  }
  
  try {
    const supported = await isBiometricSupported();
    
    if (!supported) {
      const message = isExpoGoIOS() 
        ? 'Face ID requires a custom build on iOS. It works on Android in Expo Go, or use email/password login.'
        : 'Your device does not support biometric authentication or it is not set up.';
      
      Alert.alert(
        'Biometric Not Available',
        message
      );
      return false;
    }

    // Only authenticate if not skipping (e.g., when updating existing credentials)
    if (!skipAuth) {
      const authenticated = await authenticateWithBiometrics();
      
      if (!authenticated) {
        Alert.alert('Authentication Failed', 'Biometric authentication was not successful.');
        return false;
      }
    }

    // Store credentials securely
    await SecureStore.setItemAsync(STORED_EMAIL_KEY, email);
    await SecureStore.setItemAsync(STORED_PASSWORD_KEY, password);
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
    
    console.log(`✅ Credentials stored for ${email}`);

    return true;
  } catch (error) {
    console.error('Error enabling biometric login:', error);
    if (!skipAuth) {
      Alert.alert('Error', 'Failed to enable biometric login.');
    }
    return false;
  }
}

/**
 * Disable biometric login by removing stored credentials
 */
export async function disableBiometricLogin(): Promise<void> {
  if (isWeb()) {
    return;
  }
  
  try {
    await SecureStore.deleteItemAsync(STORED_EMAIL_KEY);
    await SecureStore.deleteItemAsync(STORED_PASSWORD_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
  } catch (error) {
    console.error('Error disabling biometric login:', error);
  }
}

/**
 * Check if biometric login is enabled
 */
export async function isBiometricLoginEnabled(): Promise<boolean> {
  if (isWeb()) {
    return false;
  }
  
  try {
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  } catch (error) {
    console.error('Error checking biometric login status:', error);
    return false;
  }
}

/**
 * Get the stored email without requiring biometric authentication
 * Useful for checking if stored credentials match current user
 */
export async function getStoredEmail(): Promise<string | null> {
  if (isWeb()) {
    return null;
  }
  
  try {
    return await SecureStore.getItemAsync(STORED_EMAIL_KEY);
  } catch (error) {
    console.error('Error getting stored email:', error);
    return null;
  }
}

/**
 * 
 * Get stored credentials after biometric authentication
 */
export async function getStoredCredentials(): Promise<{ email: string; password: string } | null> {
  if (isWeb()) {
    return null;
  }
  
  try {
    const enabled = await isBiometricLoginEnabled();
    
    if (!enabled) {
      console.log("🔐 Biometric not enabled, no credentials to retrieve");
      return null;
    }

    // Authenticate with biometrics
    const authenticated = await authenticateWithBiometrics();
    
    if (!authenticated) {
      console.log("🔐 Biometric authentication cancelled or failed");
      return null;
    }

    // Retrieve stored credentials
    const email = await SecureStore.getItemAsync(STORED_EMAIL_KEY);
    const password = await SecureStore.getItemAsync(STORED_PASSWORD_KEY);

    if (!email || !password) {
      console.log("⚠️ Biometric enabled but credentials not found - clearing biometric data");
      await disableBiometricLogin();
      return null;
    }

    console.log("✅ Retrieved stored credentials for:", email);
    return { email, password };
  } catch (error) {
    console.error('Error retrieving stored credentials:', error);
    return null;
  }
}
