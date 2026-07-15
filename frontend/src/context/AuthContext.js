import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if token exists in AsyncStorage on app startup
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        if (storedToken) {
          setToken(storedToken);
          // Set user profile
          const res = await apiClient.get('/api/auth/me', {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          setUser(res.data.user);
        }
      } catch (e) {
        console.log('Restoring token failed or token expired', e);
        // Clear storage in case token is corrupt
        await AsyncStorage.removeItem('token');
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const login = async (username, password) => {
    try {
      const res = await apiClient.post('/api/auth/login', { username, password });
      const { token: receivedToken, user: receivedUser } = res.data;
      
      await AsyncStorage.setItem('token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to login. Please try again.';
      return { success: false, error: errorMsg };
    }
  };

  const register = async (username, password) => {
    try {
      const res = await apiClient.post('/api/auth/register', { username, password });
      const { token: receivedToken, user: receivedUser } = res.data;

      await AsyncStorage.setItem('token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Registration failed. Try a different username.';
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } catch (e) {
      console.error('Logout error', e);
    }
  };

  // Fetch updated user info (wallet balance, etc.)
  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await apiClient.get('/api/auth/me');
      setUser(res.data.user);
    } catch (e) {
      console.error('Failed to refresh user balance', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        token,
        user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
