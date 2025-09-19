import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://192.168.1.33:5000'; // your backend

// Function to return base URL based on platform
const getBaseURL = () => {
  if (Platform.OS === 'android') {
    return BASE_URL; // could also use http://10.0.2.2:5000 if Android emulator
  }
  return BASE_URL;
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// ✅ Request interceptor: attach token if available
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('Error reading token:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Response interceptor: handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API error:', error?.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
