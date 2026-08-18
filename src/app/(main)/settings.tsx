import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextInput } from '@/components/ui/TextInput';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { DEFAULT_SERVER_URL, storage } from '@/services/storage';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, useColorScheme, View } from 'react-native';

export default function SettingsScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const { logout } = useAuth();
  
  const [serverUrl, setServerUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    storage.getServerUrl().then(url => {
      setServerUrl(url);
    });
  }, []);

  const handleSave = async () => {
    const normalizedUrl = serverUrl.trim();
    if (!normalizedUrl) {
      Alert.alert('Error', 'Please enter a valid server URL.');
      return;
    }

    setIsSaving(true);
    try {
      await storage.setServerUrl(normalizedUrl);
      Alert.alert('Success', 'Server URL saved successfully.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    await storage.clearServerUrl();
    setServerUrl(DEFAULT_SERVER_URL);
    Alert.alert('Reset', 'Reset to default Vercel server URL.');
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Card style={styles.card}>
        <ThemedText type="title" style={styles.sectionTitle}>Server Configuration</ThemedText>

        <TextInput
          label="Server URL"
          placeholder="https://search-lcr.vercel.app"
          value={serverUrl}
          onChangeText={setServerUrl}
          autoCapitalize="none"
        />

        <View style={styles.buttonGroup}>
          <Button 
            title="Save URL" 
            onPress={handleSave} 
            isLoading={isSaving}
            style={styles.flexButton}
          />
          <Button 
            title="Reset Default" 
            variant="secondary"
            onPress={handleReset} 
            style={styles.flexButton}
          />
        </View>
      </Card>

      <Card style={styles.card}>
        <ThemedText type="title" style={styles.sectionTitle}>Appearance</ThemedText>
        <View style={styles.row}>
          <ThemedText>Dark Mode</ThemedText>
          <Switch 
            value={colorScheme === 'dark'} 
            disabled
          />
        </View>
        <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 8 }}>
          Appearance is controlled by your system settings.
        </ThemedText>
      </Card>

      <Card style={[styles.card, { marginTop: 24 }]}>
        <Button 
          title="Log Out" 
          variant="danger" 
          onPress={handleLogout} 
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    marginBottom: 16,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  flexButton: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  }
});
