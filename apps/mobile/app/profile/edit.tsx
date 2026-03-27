/**
 * Profile edit screen.
 *
 * Renders the ProfileForm pre-filled with the active profile's data.
 * Navigates back on successful update.
 */

import { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../../src/theme';
import { ProfileForm } from '../../src/components/profile';
import { useProfileStore, selectActiveProfile } from '../../src/stores/profile-store';
import type { CreateProfileInput } from '../../src/services/storage/profileCrud';

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const profile = useProfileStore(selectActiveProfile);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const isMutating = useProfileStore((s) => s.mutationCount > 0);

  const handleSubmit = useCallback(
    async (data: CreateProfileInput) => {
      if (!profile) return;
      try {
        await updateProfile(profile.id, data);
        router.back();
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
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.surface,
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing['3xl'],
            paddingBottom: theme.spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.outline,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          testID="back-button"
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
        </Pressable>
        <Text
          style={[
            theme.typography.titleLarge,
            { color: theme.colors.onSurface, marginLeft: theme.spacing.md, flex: 1 },
          ]}
        >
          Edit Profile
        </Text>
      </View>

      <ProfileForm initialData={profile} onSubmit={handleSubmit} isSaving={isMutating} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
