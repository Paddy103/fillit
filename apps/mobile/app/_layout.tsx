/**
 * Root layout for the FillIt mobile app.
 *
 * Wraps the entire app with ThemeProvider and handles:
 * - Font loading with splash screen
 * - Theme-aware status bar
 * - Top-level Stack navigator containing (tabs) group and modal screens
 */

import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { ThemeProvider, useTheme } from '../src/theme';
import { useFontsLoaded } from '../src/fonts';

// Prevent the splash screen from auto-hiding before fonts are loaded
SplashScreen.preventAutoHideAsync();

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

function RootNavigator() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="profile/create" options={{ headerShown: false }} />
      <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
      <Stack.Screen name="profile/address/index" options={{ headerShown: false }} />
      <Stack.Screen name="profile/address/add" options={{ headerShown: false }} />
      <Stack.Screen name="profile/address/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="__e2e" options={{ headerShown: true, headerTitle: 'E2E Tests' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const { fontsLoaded, fontError, onLayoutRootView } = useFontsLoaded();

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider initialColorMode="system">
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <ThemedStatusBar />
        <RootNavigator />
      </View>
    </ThemeProvider>
  );
}
