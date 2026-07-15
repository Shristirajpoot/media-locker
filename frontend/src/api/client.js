import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// BASE_URL guidelines:
// - Local server: http://localhost:5000
// - Android Emulator: http://10.0.2.2:5000
// - Physical device: http://<your-machine-ip>:5000 (e.g. http://192.168.1.100:5000)
export const BASE_URL = 'http://10.0.2.2:5000'; // Defaulting to Android Emulator loopback

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Request Interceptor: Attach Auth JWT Token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error('Error fetching token from AsyncStorage', e);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
