/**
 * Profile creation screen.
 *
 * Renders the ProfileForm for creating a new primary profile.
 * Shows success feedback and navigates back on completion.
 */

import { useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';

import { useTheme } from '../../src/theme';
import { ProfileForm } from '../../src/components/profile';
import { ScreenHeader } from '../../src/components/profile/ScreenHeader';
import { useProfileStore } from '../../src/stores/profile-store';
import type { CreateProfileInput } from '../../src/services/storage/profileCrud';

export default function CreateProfileScreen() {
  const { theme } = useTheme();
  const createProfile = useProfileStore((s) => s.createProfile);
  const isMutating = useProfileStore((s) => s.mutationCount > 0);

  const handleSubmit = useCallback(
    async (data: CreateProfileInput) => {
      try {
        await createProfile(data);
        Alert.alert('Profile Created', 'Your profile has been set up successfully.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } catch (err) {
        Alert.alert(
          'Error',
          err instanceof Error ? err.message : 'Failed to create profile. Please try again.',
        );
      }
    },
    [createProfile],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title="Create Profile" onBack={() => router.back()} />
      <ProfileForm onSubmit={handleSubmit} onCancel={() => router.back()} isSaving={isMutating} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
