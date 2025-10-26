import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Alert, Platform } from 'react-native';

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
    const biometricType = await getBiometricType();
    
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: `Authenticate with ${biometricType}`,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
      fallbackLabel: 'Use passcode',
    });

    return result.success;
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return false;
  }
}

/**
 * Enable biometric login by storing credentials
 */
export async function enableBiometricLogin(email: string, password: string): Promise<boolean> {
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
      Alert.alert(
        'Biometric Not Available',
        'Your device does not support biometric authentication or it is not set up.'
      );
      return false;
    }

    // Authenticate before storing credentials
    const authenticated = await authenticateWithBiometrics();
    
    if (!authenticated) {
      Alert.alert('Authentication Failed', 'Biometric authentication was not successful.');
      return false;
    }

    // Store credentials securely
    await SecureStore.setItemAsync(STORED_EMAIL_KEY, email);
    await SecureStore.setItemAsync(STORED_PASSWORD_KEY, password);
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');

    return true;
  } catch (error) {
    console.error('Error enabling biometric login:', error);
    Alert.alert('Error', 'Failed to enable biometric login.');
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
 * Get stored credentials after biometric authentication
 */
export async function getStoredCredentials(): Promise<{ email: string; password: string } | null> {
  if (isWeb()) {
    return null;
  }
  
  try {
    const enabled = await isBiometricLoginEnabled();
    
    if (!enabled) {
      return null;
    }

    // Authenticate with biometrics
    const authenticated = await authenticateWithBiometrics();
    
    if (!authenticated) {
      return null;
    }

    // Retrieve stored credentials
    const email = await SecureStore.getItemAsync(STORED_EMAIL_KEY);
    const password = await SecureStore.getItemAsync(STORED_PASSWORD_KEY);

    if (!email || !password) {
      return null;
    }

    return { email, password };
  } catch (error) {
    console.error('Error retrieving stored credentials:', error);
    return null;
  }
}
