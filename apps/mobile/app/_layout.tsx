/**
 * Root layout for the FillIt mobile app.
 *
 * Wraps the entire app with ThemeProvider and handles:
 * - Database initialization during splash screen
 * - Font loading with splash screen
 * - Theme-aware status bar
 * - Top-level Stack navigator containing (tabs) group and modal screens
 */

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { ThemeProvider, useTheme } from '../src/theme';
import { useFontsLoaded } from '../src/fonts';
import { initializeDatabase } from '../src/services/storage/database';
import { useAutoLock } from '../src/hooks/useAutoLock';
import { LockScreen } from '../src/components/auth';

// Prevent the splash screen from auto-hiding before fonts are loaded
SplashScreen.preventAutoHideAsync();

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

function AutoLockOverlay() {
  const { isLocked, isAuthenticating, unlock } = useAutoLock();
  if (!isLocked) return null;
  return <LockScreen isAuthenticating={isAuthenticating} onUnlock={unlock} />;
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
      <Stack.Screen name="signin" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="profile/create" options={{ headerShown: false }} />
      <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
      <Stack.Screen name="profile/address/index" options={{ headerShown: false }} />
      <Stack.Screen name="profile/address/add" options={{ headerShown: false }} />
      <Stack.Screen name="profile/address/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="profile/dependent/add" options={{ headerShown: false }} />
      <Stack.Screen name="profile/dependent/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="profile/document/index" options={{ headerShown: false }} />
      <Stack.Screen name="profile/document/add" options={{ headerShown: false }} />
      <Stack.Screen name="profile/document/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="profile/emergency/index" options={{ headerShown: false }} />
      <Stack.Screen name="profile/emergency/add" options={{ headerShown: false }} />
      <Stack.Screen name="profile/emergency/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="scan/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="ocr/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="__e2e" options={{ headerShown: true, headerTitle: 'E2E Tests' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const { fontsLoaded, fontError, onLayoutRootView } = useFontsLoaded();
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    initializeDatabase()
      .then(() => {
        console.log('[FillIt] Database initialized successfully');
        setDbReady(true);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[FillIt] Database initialization failed:', message);
        setDbError(message);
        setDbReady(true); // Allow rendering so error is visible
      });
  }, []);

  if ((!fontsLoaded && !fontError) || !dbReady) {
    return null;
  }

  if (dbError) {
    return (
      <View style={errorStyles.container} accessibilityRole="alert">
        <Text style={errorStyles.title}>Database Error</Text>
        <Text style={errorStyles.message}>{dbError}</Text>
      </View>
    );
  }

  return (
    <ThemeProvider initialColorMode="system">
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <ThemedStatusBar />
        <RootNavigator />
        <AutoLockOverlay />
      </View>
    </ThemeProvider>
  );
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#1B1B3A',
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#ff4444', marginBottom: 12 },
  message: { fontSize: 14, color: '#aaa', textAlign: 'center' },
});
