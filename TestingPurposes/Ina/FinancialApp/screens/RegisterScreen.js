import React, { useState } from "react";
import { View, TextInput, Button, Text, StyleSheet, Alert } from "react-native";
import axios from "axios";

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Simple email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Multiple API URLs to try (in order of preference)
  const API_URLS = [
    "http://10.0.2.2:5000",     // Android emulator
    "http://localhost:5000",     // If running on same machine
    "http://192.168.1.1:5000", // Replace with your computer's local IP
    "http://127.0.0.1:5000"      // Localhost alternative
  ];

  const handleRegister = async () => {
    // ✅ Client-side validation
    if (!email || !password) {
      Alert.alert("Error", "Email and password are required");
      return;
    }

    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    // Try each API URL until one works
    let registrationSuccessful = false;
    let lastError = null;

    for (const apiUrl of API_URLS) {
      try {
        console.log(`Trying to register with: ${apiUrl}/register`);
        
        const res = await axios.post(`${apiUrl}/register`, { 
          email, 
          password 
        }, {
          timeout: 5000, // 5 second timeout
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        console.log("Registration successful:", res.data);
        Alert.alert("Success", res.data.message);

        // ✅ Navigate to Welcome screen after registration
        navigation.navigate("Welcome", { email });
        registrationSuccessful = true;
        break; // Stop trying other URLs

      } catch (err) {
        console.log(`Failed with ${apiUrl}:`, err.message);
        lastError = err;
        continue; // Try next URL
      }
    }

    if (!registrationSuccessful) {
      console.error("All API attempts failed. Last error:", lastError);
      
      let errorMsg = "Registration failed - Cannot connect to server";
      
      if (lastError?.response?.data?.error) {
        errorMsg = lastError.response.data.error;
      } else if (lastError?.code === 'ECONNREFUSED') {
        errorMsg = "Server is not running. Please start the backend server.";
      } else if (lastError?.code === 'NETWORK_ERROR') {
        errorMsg = "Network error. Check your internet connection and server URL.";
      }
      
      Alert.alert("Connection Error", errorMsg);
    }

    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        onChangeText={setEmail}
        value={email}
        editable={!loading}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password (min 6 characters)"
        secureTextEntry
        onChangeText={setPassword}
        value={password}
        editable={!loading}
      />
      
      <Button 
        title={loading ? "Registering..." : "Register"} 
        onPress={handleRegister} 
        disabled={loading} 
      />
      
      <Button
        title="Already have an account? Login"
        onPress={() => navigation.navigate("Login")}
        disabled={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: "center", 
    padding: 20,
    backgroundColor: '#f5f5f5'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333'
  },
  input: { 
    borderWidth: 1, 
    marginBottom: 15, 
    padding: 15, 
    borderRadius: 8,
    backgroundColor: 'white',
    borderColor: '#ddd',
    fontSize: 16
  },
});