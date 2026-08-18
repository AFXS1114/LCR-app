import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextInput } from '@/components/ui/TextInput';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { storage } from '@/services/storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [serverIp, setServerIp] = useState('');
  const [serverPort, setServerPort] = useState('3000');
  const [serverUrl, setServerUrl] = useState('');
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const theme = useTheme();
  const router = useRouter();

  // Load existing server config on mount
  useEffect(() => {
    storage.getServerUrl().then((url) => {
      if (url) setServerUrl(url);
    });
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const normalizedUrl = serverUrl.trim();
      if (normalizedUrl) {
        await storage.setServerUrl(normalizedUrl);
      }

      const currentServerUrl = await storage.getServerUrl();
      if (!currentServerUrl) {
        setError('Server URL not configured. Tap "Server Settings" below to set it.');
        setShowServerConfig(true);
        setIsLoading(false);
        return;
      }

      const { api } = await import('@/services/api');
      const response = await api.post('/api/auth/login', { username, password });
      const { token } = response.data;

      await login(token);
      router.replace('/(main)/dashboard');
    } catch (e: any) {
      setError('Login failed. Please check your credentials and server connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>LCR App</ThemedText>
          <ThemedText type="subtitle">Records Management System</ThemedText>
        </View>

        <Card style={styles.card}>
          <TextInput
            label="Username"
            placeholder="Enter your username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <TextInput
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

          <Button
            title="Log In"
            onPress={handleLogin}
            isLoading={isLoading}
            style={styles.button}
          />
        </Card>

        {/* Server Configuration — collapsible section */}
        <TouchableOpacity
          style={styles.serverToggle}
          onPress={() => setShowServerConfig(prev => !prev)}
        >
          <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>
            {showServerConfig ? '▲ Hide Server Settings' : '⚙ Server Settings'}
          </ThemedText>
        </TouchableOpacity>

        {showServerConfig && (
          <Card style={styles.serverCard}>
            <ThemedText type="default" style={styles.serverTitle}>LAN Server Configuration</ThemedText>
            <TextInput
              label="Server URL (recommended for hosted backend)"
              placeholder="https://your-api.example.com"
              value={serverUrl}
              onChangeText={setServerUrl}
              autoCapitalize="none"
            />
            <TextInput
              label="Server IP Address"
              placeholder="e.g. 192.168.1.10"
              value={serverIp}
              onChangeText={setServerIp}
              autoCapitalize="none"
              keyboardType="decimal-pad"
            />
            <TextInput
              label="Port"
              placeholder="e.g. 3000"
              value={serverPort}
              onChangeText={setServerPort}
              keyboardType="numeric"
            />
            <ThemedText style={styles.serverHint}>
              Use your deployed API URL when available, or your LAN IP + port for local testing.
            </ThemedText>
          </Card>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    marginBottom: 8,
  },
  card: {
    padding: 24,
  },
  button: {
    marginTop: 16,
  },
  error: {
    color: '#FF3B30',
    marginBottom: 16,
    textAlign: 'center',
  },
  serverToggle: {
    alignItems: 'center',
    marginTop: 20,
    padding: 8,
  },
  serverCard: {
    padding: 20,
    marginTop: 8,
  },
  serverTitle: {
    fontWeight: '700',
    marginBottom: 12,
    fontSize: 14,
  },
  serverHint: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 8,
    lineHeight: 18,
  },
});
