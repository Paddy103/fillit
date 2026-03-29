/**
 * Sign-in screen.
 *
 * Provides Google and Apple sign-in buttons. On successful auth,
 * stores the user in the auth store and redirects to the main app.
 */

import { useCallback, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../src/theme';
import { Button } from '../src/components/ui/Button';
import { useAuthStore } from '../src/stores/auth-store';
import {
  signInWithGoogle,
  signInWithApple,
  GoogleAuthError,
  AppleAuthError,
} from '../src/services/auth';

export default function SignInScreen() {
  const { theme } = useTheme();
  const setUser = useAuthStore((s) => s.setUser);
  const setError = useAuthStore((s) => s.setError);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [appleAvailable] = useState(() => Platform.OS === 'ios');

  const handleGoogleSignIn = useCallback(async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      const googleUser = await signInWithGoogle();
      setUser({
        id: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        photo: googleUser.photo,
        provider: 'google',
      });
      router.replace('/(tabs)/home' as never);
    } catch (err) {
      if (err instanceof GoogleAuthError && err.code === 'SIGN_IN_CANCELLED') {
        // User cancelled — don't show error
        setIsSigningIn(false);
        return;
      }
      const message = err instanceof Error ? err.message : 'Google Sign-In failed';
      setError(message);
      Alert.alert('Sign-In Failed', message);
    } finally {
      setIsSigningIn(false);
    }
  }, [setUser, setError]);

  const handleAppleSignIn = useCallback(async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      const appleUser = await signInWithApple();
      setUser({
        id: appleUser.id,
        email: appleUser.email,
        name: appleUser.fullName,
        photo: null,
        provider: 'apple',
      });
      router.replace('/(tabs)/home' as never);
    } catch (err) {
      if (err instanceof AppleAuthError && err.code === 'SIGN_IN_CANCELLED') {
        setIsSigningIn(false);
        return;
      }
      const message = err instanceof Error ? err.message : 'Apple Sign-In failed';
      setError(message);
      Alert.alert('Sign-In Failed', message);
    } finally {
      setIsSigningIn(false);
    }
  }, [setUser, setError]);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      testID="signin-screen"
    >
      <View style={styles.content}>
        {/* Logo / Branding */}
        <View style={styles.branding}>
          <Ionicons name="document-text" size={64} color={theme.colors.primary} />
          <Text
            style={[
              theme.typography.displayLarge,
              { color: theme.colors.onBackground, marginTop: theme.spacing.md },
            ]}
          >
            FillIt
          </Text>
          <Text
            style={[
              theme.typography.bodyLarge,
              {
                color: theme.colors.onSurfaceVariant,
                marginTop: theme.spacing.sm,
                textAlign: 'center',
              },
            ]}
          >
            Scan, fill, and sign documents{'\n'}in seconds.
          </Text>
        </View>

        {/* Sign-in buttons */}
        <View style={[styles.buttons, { marginTop: theme.spacing['3xl'] }]}>
          <Button
            label={isSigningIn ? 'Signing in...' : 'Continue with Google'}
            variant="outline"
            size="lg"
            onPress={handleGoogleSignIn}
            disabled={isSigningIn}
            iconLeft={<Ionicons name="logo-google" size={20} color={theme.colors.onSurface} />}
            fullWidth
            testID="signin-google-button"
          />

          {appleAvailable ? (
            <Button
              label={isSigningIn ? 'Signing in...' : 'Continue with Apple'}
              variant="outline"
              size="lg"
              onPress={handleAppleSignIn}
              disabled={isSigningIn}
              iconLeft={<Ionicons name="logo-apple" size={20} color={theme.colors.onSurface} />}
              fullWidth
              testID="signin-apple-button"
              style={{ marginTop: theme.spacing.md }}
            />
          ) : null}
        </View>

        {/* Footer */}
        <Text
          style={[
            theme.typography.bodySmall,
            {
              color: theme.colors.onSurfaceVariant,
              textAlign: 'center',
              marginTop: theme.spacing['2xl'],
            },
          ]}
        >
          By signing in, you agree to our Terms of Service{'\n'}and Privacy Policy.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 32,
  },
  branding: {
    alignItems: 'center',
  },
  buttons: {},
});
