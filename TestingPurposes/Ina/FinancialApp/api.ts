import axios from 'axios';
import { Platform } from 'react-native';

const getBaseURL = () => {
  // Try your specific IP first
  if (Platform.OS === 'android') {
    return 'http://192.168.1.33:5000'; 
  } else if (Platform.OS === 'ios') {
    return 'http://192.168.1.33:5000'; 
  }
  return 'http://192.168.1.33:5000'; 
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 15000, // Increased timeout
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

export default api;