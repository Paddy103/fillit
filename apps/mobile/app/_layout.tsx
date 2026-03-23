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

export default function RootLayout() {
  const { fontsLoaded, fontError, onLayoutRootView } = useFontsLoaded();

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider initialColorMode="system">
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <ThemedStatusBar />
        <Stack
          screenOptions={{
            headerShown: true,
            headerTitle: 'FillIt',
          }}
        />
      </View>
    </ThemeProvider>
  );
}
