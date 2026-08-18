import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react-native';

export default function RecordDetailsScreen() {
  const { id } = useLocalSearchParams();
  const theme = useTheme();
  const router = useRouter();

  const { data: record, isLoading, error } = useQuery({
    queryKey: ['record', id],
    queryFn: async () => {
      try {
        const response = await api.get(`/api/records/${id}`);
        return response.data;
      } catch (e) {
        // Fallback for demonstration
        return {
          id,
          name: 'Annual Report 2023',
          serialNumber: 'SN-1029384',
          pageNumber: '1',
          category: 'Finance',
          description: 'The final annual report for the year 2023 including all financial statements.',
          tags: 'finance, report, 2023',
          date: '2023-12-31T10:00:00Z',
          imageUrl: 'https://via.placeholder.com/600x800.png?text=Document+Image', // Dummy image
        };
      }
    }
  });

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error || !record) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ThemedText style={{ color: '#FF3B30' }}>Error loading record.</ThemedText>
        <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Button 
          title="Back" 
          variant="outline" 
          leftIcon={<ArrowLeft color={theme.text} size={20} />} 
          onPress={() => router.back()} 
          style={styles.backButton}
        />
        <ThemedText type="title">{record.name}</ThemedText>
      </View>

      {record.imageUrl && (
        <Card style={styles.imageCard}>
          <Image source={{ uri: record.imageUrl }} style={styles.image} />
        </Card>
      )}

      <Card>
        <DetailRow label="Serial Number" value={record.serialNumber} />
        <DetailRow label="Category" value={record.category} />
        <DetailRow label="Page Number" value={record.pageNumber || 'N/A'} />
        <DetailRow label="Date" value={new Date(record.date).toLocaleDateString()} />
        <DetailRow label="Tags" value={record.tags || 'None'} />
      </Card>

      <Card style={{ marginBottom: 40 }}>
        <ThemedText type="default" style={{ fontWeight: '600', marginBottom: 8 }}>Description</ThemedText>
        <ThemedText>{record.description || 'No description provided.'}</ThemedText>
      </Card>
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string, value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.detailRow}>
      <ThemedText type="small" style={{ color: theme.textSecondary, width: 120 }}>{label}</ThemedText>
      <ThemedText style={{ flex: 1, fontWeight: '500' }}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
    height: 40,
    borderWidth: 0,
    paddingHorizontal: 0,
  },
  imageCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: 400,
    resizeMode: 'contain',
    backgroundColor: '#000',
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  }
});
