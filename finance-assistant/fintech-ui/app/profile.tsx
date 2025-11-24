import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  useColorScheme,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  View,
  Switch,
  Image,
} from 'react-native';
import { useAuth } from '@/store/auth';
import { supabase } from '@/api';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { 
  isBiometricSupported, 
  enableBiometricLogin, 
  disableBiometricLogin,
  isBiometricLoginEnabled,
  getBiometricType
} from '@/lib/biometric';

export default function ProfileScreen() {
  const { user, setUser } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometric');
  const [biometricSupported, setBiometricSupported] = useState(false);

  useEffect(() => {
    setName(user?.name || '');
    setEmail(user?.email || '');
  }, [user]);

  // Check biometric support and status on mount
  useEffect(() => {
    (async () => {
      const supported = await isBiometricSupported();
      setBiometricSupported(supported);
      
      if (supported) {
        const type = await getBiometricType();
        setBiometricType(type);
        
        const enabled = await isBiometricLoginEnabled();
        setBiometricsEnabled(enabled);
      }
    })();
  }, []);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSave = async () => {
    if (!user) return;
    
    const trimmedName = name.trim();
    
    // Optimistic update - update UI immediately
    setUser({ ...user, name: trimmedName });
    setIsEditing(false);
    
    // Then sync to backend in background (don't block UI)
    try {
      const updatePromise = supabase
        .from('profiles')
        .update({ name: trimmedName })
        .eq('id', user.id);
      
      // Race with a timeout - if it takes too long, just ignore
      const result = await Promise.race([
        updatePromise,
        new Promise((resolve) => setTimeout(() => resolve({ error: null, timedOut: true }), 3000))
      ]) as any;

      if (result.error) {
        console.warn('Profile update failed:', result.error);
        // Optionally show a subtle error, but don't revert since local state is updated
      }
    } catch (error: any) {
      console.warn('Profile update error:', error.message);
      // Don't show alert - the UI is already updated optimistically
    }
  };

  const handleBiometricToggle = async (value: boolean) => {
    if (!biometricSupported) {
      Alert.alert(
        'Not Available',
        'Biometric authentication is not available on this device.'
      );
      return;
    }

    if (value) {
      // Enable biometric login
      Alert.alert(
        `Enable ${biometricType}`,
        `Your login credentials will be securely stored for ${biometricType} authentication.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: async () => {
              // We need the user's password, but we don't have it stored
              // For now, we'll prompt them to re-enter it
              Alert.prompt(
                'Enter Password',
                'Please enter your password to enable biometric login',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'OK',
                    onPress: async (password?: string) => {
                      if (!password || !user?.email) {
                        Alert.alert('Error', 'Password is required');
                        return;
                      }
                      
                      const success = await enableBiometricLogin(user.email, password);
                      if (success) {
                        setBiometricsEnabled(true);
                        Alert.alert('Success', `${biometricType} login enabled!`);
                      }
                    },
                  },
                ],
                'secure-text'
              );
            },
          },
        ]
      );
    } else {
      // Disable biometric login
      Alert.alert(
        `Disable ${biometricType}`,
        'Are you sure you want to disable biometric login?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              await disableBiometricLogin();
              setBiometricsEnabled(false);
              Alert.alert('Success', `${biometricType} login disabled`);
            },
          },
        ]
      );
    }
  };

  const handleLogout = async () => {
    console.log("Im here!")

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to logout?');
      if (confirmed) {
        await supabase.auth.signOut();
        router.replace('/login');
        console.log("I logged out (web)");
      } else {
        console.log("Cancel Pressed (web)");
      }
      return; // stop here, no need to run the Alert
    }
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => console.log('Cancel Pressed')},
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/login');
            console.log("I loggedout")
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Profile</ThemedText>
          <TouchableOpacity
            onPress={() => isEditing ? handleSave() : setIsEditing(true)}
          >
            <ThemedText style={[styles.editButton, { color: colors.tint }]}>
              {isEditing ? 'Save' : 'Edit'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          {user.avatarUrl ? (
            <Image 
              source={{ uri: user.avatarUrl }} 
              style={styles.avatarImage}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
              <ThemedText style={styles.avatarText}>{getInitials(user.name)}</ThemedText>
            </View>
          )}
          <ThemedText style={styles.userName}>{user.name || 'User'}</ThemedText>
          <ThemedText style={[styles.userEmail, { color: colors.text + '80' }]}>
            {user.email}
          </ThemedText>
        </View>

        {/* Profile Information */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Account Information</ThemedText>
          
          {/* Name Field */}
          <View style={[styles.field, { borderColor: colors.text + '20' }]}>
            <View style={styles.fieldHeader}>
              <Ionicons name="person-outline" size={20} color={colors.text} />
              <ThemedText style={styles.fieldLabel}>Full Name</ThemedText>
            </View>
            {isEditing ? (
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.text + '30' }]}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={colors.text + '60'}
              />
            ) : (
              <ThemedText style={styles.fieldValue}>{name || 'Not set'}</ThemedText>
            )}
          </View>

          {/* Email Field (Read-only) */}
          <View style={[styles.field, { borderColor: colors.text + '20' }]}>
            <View style={styles.fieldHeader}>
              <Ionicons name="mail-outline" size={20} color={colors.text} />
              <ThemedText style={styles.fieldLabel}>Email</ThemedText>
            </View>
            <ThemedText style={[styles.fieldValue, { color: colors.text + '80' }]}>
              {email}
            </ThemedText>
          </View>

          {/* User ID (Read-only) */}
          <View style={[styles.field, { borderColor: colors.text + '20' }]}>
            <View style={styles.fieldHeader}>
              <Ionicons name="key-outline" size={20} color={colors.text} />
              <ThemedText style={styles.fieldLabel}>User ID</ThemedText>
            </View>
            <ThemedText style={[styles.fieldValue, { fontSize: 12, color: colors.text + '60' }]}>
              {user.id}
            </ThemedText>
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Preferences</ThemedText>

          {/* Notifications */}
          <View style={[styles.field, styles.settingField, { borderColor: colors.text + '20' }]}>
            <View style={styles.fieldHeader}>
              <Ionicons name="notifications-outline" size={20} color={colors.text} />
              <View style={styles.settingInfo}>
                <ThemedText style={styles.fieldLabel}>Push Notifications</ThemedText>
                <ThemedText style={[styles.settingDescription, { color: colors.text + '60' }]}>
                  Receive alerts about your finances
                </ThemedText>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: colors.text + '30', true: colors.tint + '60' }}
              thumbColor={notificationsEnabled ? colors.tint : '#f4f3f4'}
            />
          </View>

          {/* Biometrics */}
          <View style={[styles.field, styles.settingField, { borderColor: colors.text + '20' }]}>
            <View style={styles.fieldHeader}>
              <Ionicons name="finger-print-outline" size={20} color={colors.text} />
              <View style={styles.settingInfo}>
                <ThemedText style={styles.fieldLabel}>Biometric Login</ThemedText>
                <ThemedText style={[styles.settingDescription, { color: colors.text + '60' }]}>
                  Use {biometricType}
                </ThemedText>
              </View>
            </View>
            <Switch
              value={biometricsEnabled}
              onValueChange={handleBiometricToggle}
              disabled={!biometricSupported}
              trackColor={{ false: colors.text + '30', true: colors.tint + '60' }}
              thumbColor={biometricsEnabled ? colors.tint : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: colors.text + '20' }]}
            onPress={() => Alert.alert('Change Password', 'This feature will be implemented soon')}
          >
            <Ionicons name="lock-closed-outline" size={20} color={colors.text} />
            <ThemedText style={styles.actionButtonText}>Change Password</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={colors.text + '40'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { borderColor: colors.text + '20' }]}
            onPress={() => Alert.alert('Privacy Settings', 'This feature will be implemented soon')}
          >
            <Ionicons name="shield-outline" size={20} color={colors.text} />
            <ThemedText style={styles.actionButtonText}>Privacy & Security</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={colors.text + '40'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { borderColor: colors.text + '20' }]}
            onPress={() => Alert.alert('Help & Support', 'This feature will be implemented soon')}
          >
            <Ionicons name="help-circle-outline" size={20} color={colors.text} />
            <ThemedText style={styles.actionButtonText}>Help & Support</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={colors.text + '40'} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, { borderColor: '#ef4444' }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <ThemedText style={[styles.logoutButtonText, { color: '#ef4444' }]}>
            Logout
          </ThemedText>
        </TouchableOpacity>

        {/* Version Info */}
        <ThemedText style={[styles.versionText, { color: colors.text + '40' }]}>
          Version 1.0.0
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  editButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 4,
  },
  field: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  fieldValue: {
    fontSize: 16,
    marginLeft: 28,
  },
  input: {
    fontSize: 16,
    marginLeft: 28,
    padding: 8,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 4,
  },
  settingField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
  },
  settingDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginTop: 20,
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 20,
    marginBottom: 20,
  },
});