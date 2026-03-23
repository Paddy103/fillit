import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../src/theme';

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  return (
    <ThemeProvider initialColorMode="system">
      <ThemedStatusBar />
      <Stack
        screenOptions={{
          headerShown: true,
          headerTitle: 'FillIt',
        }}
      />
    </ThemeProvider>
  );
}
