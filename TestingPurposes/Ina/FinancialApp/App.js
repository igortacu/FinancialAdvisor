import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import axios from 'axios';

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

 const testConnection = async () => {
  try {
    console.log('Testing connection to 192.168.1.33:5000...');
    const response = await axios.get('http://192.168.1.33:5000/health', { 
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    Alert.alert('Success', `Server is running: ${response.data.status}`);
  } catch (error) {
    console.error('Connection error:', error);
    Alert.alert('Error', `Cannot connect: ${error.message}`);
  }
};

const handleRegister = async () => {
  if (!email || !password) {
    Alert.alert('Error', 'Please enter email and password');
    return;
  }

  try {
    console.log('Attempting registration...');
    const response = await axios.post('http://192.168.1.33:5000/register', {
      email,
      password
    }, {
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    Alert.alert('Success', response.data.message);
    setEmail('');
    setPassword('');
  } catch (error) {
    console.error('Registration error:', error);
    const errorMsg = error.response?.data?.error || error.message;
    Alert.alert('Error', errorMsg);
  }
};


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Financial Advisor</Text>
      
      <Button title="Test Server Connection" onPress={testConnection} />
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <Button title="Register" onPress={handleRegister} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
  },
});