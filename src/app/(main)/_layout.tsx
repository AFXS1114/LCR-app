import React from 'react';
import { Tabs } from 'expo-router/js-tabs';
import { useTheme } from '@/hooks/use-theme';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, PlusCircle, Search, Settings } from 'lucide-react-native';

/**
 * Main app layout using expo-router/js-tabs.
 * Supports swipe left/right to navigate between tabs.
 * Uses useSafeAreaInsets to correctly avoid the phone's
 * system navigation bar (gesture bar / buttons).
 */
export default function MainLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Bottom padding = phone's nav bar height + our own padding
  const tabBarHeight = 52 + insets.bottom;

  return (
    <Tabs
      tabBarPosition="bottom"
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.backgroundSelected,
          borderTopWidth: 0.5,
          height: tabBarHeight,
          paddingBottom: insets.bottom + 4,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: theme.background,
        },
        headerTintColor: theme.text,
        swipeEnabled: true,
        animationEnabled: true,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: 'Add Record',
          tabBarIcon: ({ color }) => <PlusCircle size={24} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => <Search size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
