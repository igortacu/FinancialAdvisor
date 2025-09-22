import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { supabase } from './api'; 

type Screen = 'welcome' | 'register' | 'login';

export default function App(): React.ReactElement {
  const [screen, setScreen] = useState<Screen>('welcome');

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>(''); 
  const [surname, setSurname] = useState<string>(''); 
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // ✅ Register with Supabase
  const handleRegister = async (): Promise<void> => {
    if (!email.trim() || !password.trim() || !name.trim() || !surname.trim()) {
      Alert.alert('Error', 'Please enter email, password, name, and surname');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;

      // Insert into profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{ id: data.user?.id, name: name.trim(), surname: surname.trim() }]);

      if (profileError) throw profileError;

      Alert.alert('Success', 'Account created! Please check your email.');
      setEmail('');
      setPassword('');
      setName('');
      setSurname('');
      setScreen('welcome'); // go back to welcome
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Login with Supabase
  const handleLogin = async (): Promise<void> => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;

      Alert.alert('Success', 'Logged in successfully!');
      console.log('Logged in user:', data.user);

      setEmail('');
      setPassword('');
      setScreen('welcome');
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Financial Advisor</Text>
        <Text style={styles.subtitle}>Manage your finances with ease</Text>
      </View>

      {/* Screens */}
      <View style={styles.formContainer}>
        {screen === 'welcome' && (
          <>
            <Text style={styles.formTitle}>Welcome</Text>
            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => setScreen('register')}
            >
              <Text style={styles.buttonText}>Register</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => setScreen('login')}
            >
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>
          </>
        )}

        {screen === 'register' && (
          <>
            <Text style={styles.formTitle}>Create Account</Text>
            <TextInput
              style={styles.input}
              placeholder="Name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!isLoading}
            />
            <TextInput
              style={styles.input}
              placeholder="Surname"
              value={surname}
              onChangeText={setSurname}
              autoCapitalize="words"
              editable={!isLoading}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            <TextInput
              style={styles.input}
              placeholder="Password (min 6 characters)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[styles.registerButton, isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => setScreen('welcome')}
            >
              <Text style={styles.buttonText}>Back</Text>
            </TouchableOpacity>
          </>
        )}

        {screen === 'login' && (
          <>
            <Text style={styles.formTitle}>Login</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Login</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => setScreen('welcome')}
            >
              <Text style={styles.buttonText}>Back</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f5f7fa', paddingTop: 50 },
  header: { backgroundColor: '#2563eb', paddingVertical: 40, paddingHorizontal: 20, marginBottom: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#ddd', textAlign: 'center' },
  formContainer: { backgroundColor: '#fff', marginHorizontal: 20, padding: 25, borderRadius: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  formTitle: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginBottom: 25, textAlign: 'center' },
  input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingVertical: 15, paddingHorizontal: 15, fontSize: 16, color: '#111827', marginBottom: 15 },
  registerButton: { backgroundColor: '#10b981', paddingVertical: 18, borderRadius: 10, alignItems: 'center', marginTop: 10, shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  loginButton: { backgroundColor: '#3b82f6', paddingVertical: 18, borderRadius: 10, alignItems: 'center', marginTop: 10, shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  buttonDisabled: { opacity: 0.6 },
});
