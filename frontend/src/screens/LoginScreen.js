import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Coins, Lock, User, Eye, EyeOff } from 'lucide-react-native';

export default function LoginScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      let result;
      if (isLogin) {
        result = await login(username.trim(), password);
      } else {
        result = await register(username.trim(), password);
      }

      if (!result.success) {
        setError(result.error);
      }
    } catch (e) {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.card}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Coins color="#f59e0b" size={36} />
            </View>
            <Text style={styles.title}>Media Locker</Text>
            <Text style={styles.subtitle}>
              {isLogin ? 'Unlock premium content with coins' : 'Create an account to get 100 free coins!'}
            </Text>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.inputContainer}>
            <User color="#9ca3af" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#9ca3af"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock color="#9ca3af" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              {showPassword ? <EyeOff color="#9ca3af" size={20} /> : <Eye color="#9ca3af" size={20} />}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <Text style={styles.buttonText}>{isLogin ? 'Sign In' : 'Sign Up'}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setIsLogin(!isLogin);
              setError('');
              setUsername('');
              setPassword('');
            }}
            style={styles.toggleContainer}
          >
            <Text style={styles.toggleText}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <Text style={styles.toggleTextHighlight}>
                {isLogin ? 'Sign Up' : 'Sign In'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214',
    justifyContent: 'center',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#1e1e24',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#2d2d34',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d34',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
  },
  eyeIcon: {
    padding: 8,
  },
  button: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  toggleContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  toggleText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  toggleTextHighlight: {
    color: '#f59e0b',
    fontWeight: '700',
  },
});
