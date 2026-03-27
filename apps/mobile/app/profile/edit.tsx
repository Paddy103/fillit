/**
 * Profile edit screen.
 *
 * Renders the ProfileForm pre-filled with the active profile's data.
 * Warns on unsaved changes and shows success feedback on save.
 */

import { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';

import { useTheme } from '../../src/theme';
import { ProfileForm } from '../../src/components/profile';
import { ScreenHeader } from '../../src/components/profile/ScreenHeader';
import { useProfileStore, selectActiveProfile } from '../../src/stores/profile-store';
import type { CreateProfileInput } from '../../src/services/storage/profileCrud';

function confirmDiscard(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert('Discard Changes?', 'You have unsaved changes. Are you sure you want to go back?', [
      { text: 'Keep Editing', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Discard', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const profile = useProfileStore(selectActiveProfile);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const isMutating = useProfileStore((s) => s.mutationCount > 0);
  const isDirtyRef = useRef(false);

  const handleDirtyChange = useCallback((dirty: boolean) => {
    isDirtyRef.current = dirty;
  }, []);

  const handleBack = useCallback(async () => {
    if (isDirtyRef.current) {
      const shouldDiscard = await confirmDiscard();
      if (!shouldDiscard) return;
    }
    router.back();
  }, []);

  const handleSubmit = useCallback(
    async (data: CreateProfileInput) => {
      if (!profile) return;
      try {
        await updateProfile(profile.id, data);
        Alert.alert('Profile Updated', 'Your profile has been saved successfully.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } catch (err) {
        Alert.alert(
          'Error',
          err instanceof Error ? err.message : 'Failed to update profile. Please try again.',
        );
      }
    },
    [profile, updateProfile],
  );

  if (!profile) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={[theme.typography.bodyLarge, { color: theme.colors.onSurfaceVariant }]}>
          No profile selected
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title="Edit Profile" onBack={handleBack} />
      <ProfileForm
        initialData={profile}
        onSubmit={handleSubmit}
        onCancel={handleBack}
        onDirtyChange={handleDirtyChange}
        isSaving={isMutating}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
