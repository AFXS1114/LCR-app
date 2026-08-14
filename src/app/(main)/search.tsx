import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { api } from '@/services/api';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';
import { TextInput } from '@/components/ui/TextInput';
import { Card } from '@/components/ui/Card';
import { Search as SearchIcon } from 'lucide-react-native';

export default function SearchScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState('');

  const { data: results, isLoading } = useQuery({
    queryKey: ['search-records', query],
    queryFn: async () => {
      if (!query) return [];
      try {
        const response = await api.get(`/api/records?search=${query}`);
        return response.data;
      } catch (e) {
        // Fallback for demonstration since we are not connected to a real server yet
        return [
          { id: '1', name: 'Annual Report 2023', category: 'Finance', date: '2023-12-31' },
          { id: '2', name: 'Employee Handbook', category: 'HR', date: '2024-01-15' },
        ].filter(item => item.name.toLowerCase().includes(query.toLowerCase()));
      }
    },
    enabled: query.length > 2, // only search if query is at least 3 chars
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Search records by name or serial..."
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
        />
        <SearchIcon color={theme.textSecondary} size={20} style={styles.searchIcon} />
      </View>

      {isLoading && <ThemedText style={styles.message}>Searching...</ThemedText>}
      {!isLoading && query.length > 2 && results?.length === 0 && (
        <ThemedText style={styles.message}>No records found.</ThemedText>
      )}
      {!query && (
        <ThemedText style={styles.message}>Type at least 3 characters to search.</ThemedText>
      )}

      <FlatList
        data={results || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/(main)/record/${item.id}`)}>
            <Card style={styles.recordCard}>
              <ThemedText type="default" style={{ fontWeight: '600' }}>{item.name}</ThemedText>
              <View style={styles.recordMeta}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>{item.category}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>{item.date}</ThemedText>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  searchInput: {
    paddingRight: 40,
    marginBottom: 0,
  },
  searchIcon: {
    position: 'absolute',
    right: 12,
    top: 14,
  },
  message: {
    textAlign: 'center',
    marginTop: 24,
    opacity: 0.6,
  },
  recordCard: {
    marginBottom: 12,
    padding: 16,
  },
  recordMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  }
});
