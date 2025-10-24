import React from 'react';
import { StyleSheet } from 'react-native';
import { useAuth } from '@/store/auth';
import { supabase } from '@/api';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { View, TouchableOpacity } from 'react-native';

export default function ProfileScreen() {
  const { user } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.avatarContainer}>
          <ThemedText style={styles.avatarText}>{getInitials(user?.name)}</ThemedText>
        </View>
        <ThemedText style={styles.nameText}>{user?.name || 'No name'}</ThemedText>
        <ThemedText style={styles.emailText}>{user?.email || 'No email'}</ThemedText>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <ThemedText style={styles.logoutText}>Logout</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.light.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 64,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    color: 'white',
    fontWeight: 'bold',
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 32,
  },
  logoutButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});