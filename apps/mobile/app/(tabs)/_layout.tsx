/**
 * Tab navigator layout for the main app navigation.
 *
 * Defines 4 tabs matching the implementation plan:
 * - Home: Dashboard with recent documents and quick actions
 * - Documents: Document history list
 * - Profiles: User profiles and dependents
 * - Settings: App settings and preferences
 *
 * Uses a custom TabBar component styled with theme tokens.
 * Test IDs are set automatically by the TabBar using the pattern `tab-{name}`.
 */

import { Tabs } from 'expo-router';

import { useTheme } from '../../src/theme';
import { TabBar } from '../../src/components/navigation/TabBar';
import { TabBarIcon } from '../../src/components/navigation/TabBarIcon';

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          ...theme.typography.titleLarge,
          color: theme.colors.onSurface,
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          headerTitle: 'FillIt',
          tabBarLabel: 'Home',
          tabBarAccessibilityLabel: 'Home dashboard tab',
          tabBarIcon: ({ color, focused, size }) => (
            <TabBarIcon
              name={focused ? 'home' : 'home-outline'}
              color={color}
              size={size}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Documents',
          tabBarLabel: 'Documents',
          tabBarAccessibilityLabel: 'Documents list tab',
          tabBarIcon: ({ color, focused, size }) => (
            <TabBarIcon
              name={focused ? 'document-text' : 'document-text-outline'}
              color={color}
              size={size}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profiles"
        options={{
          title: 'Profiles',
          tabBarLabel: 'Profiles',
          tabBarAccessibilityLabel: 'Profiles management tab',
          tabBarIcon: ({ color, focused, size }) => (
            <TabBarIcon
              name={focused ? 'person' : 'person-outline'}
              color={color}
              size={size}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarAccessibilityLabel: 'App settings tab',
          tabBarIcon: ({ color, focused, size }) => (
            <TabBarIcon
              name={focused ? 'settings' : 'settings-outline'}
              color={color}
              size={size}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}
