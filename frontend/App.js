import 'react-native-gesture-handler';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';

// Import Screens
import LoginScreen from './src/screens/LoginScreen';
import FeedScreen from './src/screens/FeedScreen';
import UploadScreen from './src/screens/UploadScreen';
import MediaDetailsScreen from './src/screens/MediaDetailsScreen';
import WalletScreen from './src/screens/WalletScreen';

const Stack = createStackNavigator();

function NavigationWrapper() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#121214' },
        }}
      >
        {token === null ? (
          // Auth Stack
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          // Main App Stack
          <>
            <Stack.Screen name="Feed" component={FeedScreen} />
            <Stack.Screen name="UploadMedia" component={UploadScreen} />
            <Stack.Screen name="MediaDetails" component={MediaDetailsScreen} />
            <Stack.Screen name="Wallet" component={WalletScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" backgroundColor="#121214" translucent={false} />
      <NavigationWrapper />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#121214',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
