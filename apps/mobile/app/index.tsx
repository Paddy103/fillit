/**
 * Root index screen — auth guard redirect.
 *
 * Checks authentication state and redirects to either
 * the sign-in screen or the main app (tabs).
 */

import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';

import { useTheme } from '../src/theme';
import { useAuthStore, selectIsAuthenticated, selectAuthIsReady } from '../src/stores/auth-store';
import { silentSignIn, getAuthToken } from '../src/services/auth';

export default function IndexScreen() {
  const { theme } = useTheme();
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isReady = useAuthStore(selectAuthIsReady);
  const setUser = useAuthStore((s) => s.setUser);
  const setReady = useAuthStore((s) => s.setReady);

  // On mount, try to restore auth from stored token / silent sign-in
  useEffect(() => {
    async function checkAuth() {
      try {
        const token = await getAuthToken();
        if (token) {
          // Try silent refresh to get latest user info
          const user = await silentSignIn();
          if (user) {
            setUser({
              id: user.id,
              email: user.email,
              name: user.name,
              photo: user.photo,
              provider: 'google',
            });
          }
        }
      } catch {
        // Silent sign-in failed — user will need to sign in manually
      } finally {
        setReady();
      }
    }

    if (!isReady) {
      checkAuth();
    }
  }, [isReady, setUser, setReady]);

  // Show loading while checking auth
  if (!isReady) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Redirect based on auth state
  if (isAuthenticated) {
    return <Redirect href="/(tabs)/home" />;
  }

  return <Redirect href={'/signin' as never} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
