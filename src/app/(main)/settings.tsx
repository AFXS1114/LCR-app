import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { storage } from '@/services/storage';
import { useAuth } from '@/features/auth/AuthContext';
import { useColorScheme } from 'react-native';

export default function SettingsScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const { logout } = useAuth();
  
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    storage.getServerConfig().then(config => {
      if (config.ip) setIp(config.ip);
      if (config.port) setPort(config.port);
    });
  }, []);

  const handleSave = async () => {
    if (!ip || !port) {
      Alert.alert('Error', 'Please enter both IP address and port.');
      return;
    }
    
    setIsSaving(true);
    try {
      await storage.setServerConfig(ip, port);
      Alert.alert('Success', 'Server configuration saved.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save configuration.');
    } finally {
      setIsSaving(false);
    }
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
          label="Server IP (e.g., 192.168.1.10)"
          placeholder="192.168.1.10"
          value={ip}
          onChangeText={setIp}
          keyboardType="numeric"
        />
        
        <TextInput
          label="Server Port"
          placeholder="3000"
          value={port}
          onChangeText={setPort}
          keyboardType="numeric"
        />
        
        <Button 
          title="Save Configuration" 
          onPress={handleSave} 
          isLoading={isSaving}
          style={styles.saveButton}
        />
      </Card>

      <Card style={styles.card}>
        <ThemedText type="title" style={styles.sectionTitle}>Appearance</ThemedText>
        <View style={styles.row}>
          <ThemedText>Dark Mode</ThemedText>
          <Switch 
            value={colorScheme === 'dark'} 
            disabled // The expo color scheme hook reflects system state. Custom override needs extra context, but for now we rely on system
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
  saveButton: {
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  }
});
