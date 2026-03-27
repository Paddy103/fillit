/**
 * Profiles tab screen.
 *
 * Shows the primary profile card with completeness indicator,
 * or an empty state prompting the user to create a profile.
 */

import { useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../../src/theme';
import { Card, Button } from '../../src/components/ui';
import { ProfileCard } from '../../src/components/profile/ProfileCard';
import {
  useProfileStore,
  selectPrimaryProfile,
  selectIsInitialized,
  selectIsLoading,
} from '../../src/stores/profile-store';

// ─── Helpers ────────────────────────────────────────────────────────

const COMPLETENESS_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'phoneMobile',
  'dateOfBirth',
  'saIdNumber',
  'gender',
  'employer',
  'nationality',
  'citizenship',
] as const;

function calcCompleteness(profile: Record<string, unknown>): number {
  const filled = COMPLETENESS_FIELDS.filter((f) => {
    const v = profile[f];
    return typeof v === 'string' && v.trim().length > 0;
  }).length;
  return Math.round((filled / COMPLETENESS_FIELDS.length) * 100);
}

// ─── Empty State ────────────────────────────────────────────────────

function EmptyState({ onGetStarted }: { onGetStarted: () => void }) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.emptyState,
        {
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: theme.radii.lg,
          padding: theme.spacing['2xl'],
        },
      ]}
    >
      <Ionicons
        name="people-outline"
        size={64}
        color={theme.colors.onSurfaceVariant}
        style={{ marginBottom: theme.spacing.lg }}
      />
      <Text
        style={[
          theme.typography.headlineMedium,
          { color: theme.colors.onSurfaceVariant, textAlign: 'center' },
        ]}
      >
        Set Up Your Profile
      </Text>
      <Text
        style={[
          theme.typography.bodyMedium,
          {
            color: theme.colors.onSurfaceVariant,
            textAlign: 'center',
            marginTop: theme.spacing.sm,
          },
        ]}
      >
        Add your details so FillIt can auto-fill forms for you.
      </Text>
      <View style={{ marginTop: theme.spacing.lg }}>
        <Button
          label="Get Started"
          onPress={onGetStarted}
          size="lg"
          accessibilityLabel="Set up your profile"
          testID="setup-profile-button"
        />
      </View>
    </View>
  );
}

// ─── Completeness Card ──────────────────────────────────────────────

function CompletenessCard({ completeness }: { completeness: number }) {
  const { theme } = useTheme();
  return (
    <Card style={{ marginBottom: theme.spacing.lg }}>
      <View style={styles.completenessHeader}>
        <Ionicons name="shield-checkmark-outline" size={24} color={theme.colors.primary} />
        <Text
          style={[
            theme.typography.titleLarge,
            { color: theme.colors.onSurface, marginLeft: theme.spacing.sm, flex: 1 },
          ]}
        >
          Profile
        </Text>
        <Text
          style={[theme.typography.labelMedium, { color: theme.colors.primary }]}
          testID="profile-completeness-text"
        >
          {completeness}% complete
        </Text>
      </View>
      <View
        style={[
          styles.progressTrack,
          {
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.radii.full,
            marginTop: theme.spacing.md,
          },
        ]}
      >
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radii.full,
              width: `${completeness}%`,
            },
          ]}
        />
      </View>
      {completeness < 100 ? (
        <Text
          style={[
            theme.typography.caption,
            { color: theme.colors.onSurfaceVariant, marginTop: theme.spacing.sm },
          ]}
        >
          Complete your profile for better form auto-filling.
        </Text>
      ) : null}
    </Card>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────

export default function ProfilesScreen() {
  const { theme } = useTheme();
  const profile = useProfileStore(selectPrimaryProfile);
  const isInitialized = useProfileStore(selectIsInitialized);
  const isLoading = useProfileStore(selectIsLoading);
  const initialize = useProfileStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const completeness = useMemo(() => (profile ? calcCompleteness(profile) : 0), [profile]);

  const handleCreateProfile = useCallback(() => {
    router.push('/profile/create');
  }, []);

  const handleEditProfile = useCallback(() => {
    router.push('/profile/edit');
  }, []);

  if (isLoading || !isInitialized) {
    return (
      <View
        style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}
        testID="profiles-screen-loading"
      >
        <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSurfaceVariant }]}>
          Loading profiles...
        </Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.background, padding: theme.spacing.lg },
        ]}
        testID="profiles-screen"
      >
        <EmptyState onGetStarted={handleCreateProfile} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ padding: theme.spacing.lg }}
      testID="profiles-screen"
    >
      <CompletenessCard completeness={completeness} />
      <ProfileCard profile={profile} onPress={handleEditProfile} />
      <Button
        label="Edit Profile"
        variant="outline"
        onPress={handleEditProfile}
        fullWidth
        iconLeft={<Ionicons name="create-outline" size={18} color={theme.colors.primary} />}
        testID="edit-profile-button"
      />
    </ScrollView>
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
  emptyState: {
    alignItems: 'center',
  },
  completenessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressTrack: {
    height: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
});
