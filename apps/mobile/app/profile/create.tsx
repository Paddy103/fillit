/**
 * Profile creation screen.
 *
 * Renders the ProfileForm for creating a new primary profile.
 * Navigates back to the profiles tab on successful creation.
 */

import { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../../src/theme';
import { ProfileForm } from '../../src/components/profile';
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
        router.back();
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
          Create Profile
        </Text>
      </View>

      <ProfileForm onSubmit={handleSubmit} isSaving={isMutating} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
