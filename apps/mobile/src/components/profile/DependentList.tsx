/**
 * List of dependent profiles displayed as cards.
 *
 * Shows each dependent's name, relationship badge, and profile
 * completeness. Includes an "Add Dependent" button and supports
 * setting a dependent as the active profile.
 */

import { useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { UserProfile } from '@fillit/shared';

import { useTheme } from '../../theme';
import { Button } from '../ui';
import { DependentCard } from './DependentCard';
import { useProfileStore, selectProfiles, selectActiveProfileId } from '../../stores/profile-store';

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

function calcCompleteness(profile: UserProfile): number {
  const filled = COMPLETENESS_FIELDS.filter((f) => {
    const v = profile[f as keyof UserProfile];
    return typeof v === 'string' && v.trim().length > 0;
  }).length;
  return Math.round((filled / COMPLETENESS_FIELDS.length) * 100);
}

// ─── Component ──────────────────────────────────────────────────────

export function DependentList() {
  const { theme } = useTheme();
  const profiles = useProfileStore(selectProfiles);
  const dependents = profiles.filter((p) => !p.isPrimary);
  const activeProfileId = useProfileStore(selectActiveProfileId);
  const setActiveProfileId = useProfileStore((s) => s.setActiveProfileId);

  const handleAddDependent = useCallback(() => {
    router.push('/profile/dependent/add');
  }, []);

  const handleEditDependent = useCallback((id: string) => {
    router.push(`/profile/dependent/${id}` as never);
  }, []);

  const handleSetActive = useCallback(
    (profile: UserProfile) => {
      setActiveProfileId(profile.id);
      Alert.alert(
        'Active Profile Changed',
        `${profile.firstName} ${profile.lastName} is now the active profile for form filling.`,
      );
    },
    [setActiveProfileId],
  );

  if (dependents.length === 0) {
    return (
      <View style={{ marginTop: theme.spacing.xl }}>
        <DependentSectionHeader />
        <EmptyDependents onAdd={handleAddDependent} />
      </View>
    );
  }

  return (
    <View style={{ marginTop: theme.spacing.xl }} testID="dependent-list">
      <DependentSectionHeader />
      {dependents.map((dep) => (
        <DependentCard
          key={dep.id}
          profile={dep}
          completeness={calcCompleteness(dep)}
          isActive={dep.id === activeProfileId}
          onPress={() => handleEditDependent(dep.id)}
          onSetActive={() => handleSetActive(dep)}
        />
      ))}
      <Button
        label="Add Dependent"
        variant="outline"
        onPress={handleAddDependent}
        fullWidth
        iconLeft={<Ionicons name="person-add-outline" size={18} color={theme.colors.primary} />}
        testID="add-dependent-button"
      />
    </View>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function DependentSectionHeader() {
  const { theme } = useTheme();
  return (
    <View style={[styles.sectionHeader, { marginBottom: theme.spacing.md }]}>
      <Ionicons name="people-outline" size={22} color={theme.colors.primary} />
      <Text
        style={[
          theme.typography.titleLarge,
          {
            color: theme.colors.onSurface,
            marginLeft: theme.spacing.sm,
            flex: 1,
          },
        ]}
      >
        Dependents
      </Text>
    </View>
  );
}

function EmptyDependents({ onAdd }: { onAdd: () => void }) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.emptyState,
        {
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: theme.radii.lg,
          padding: theme.spacing.xl,
          marginBottom: theme.spacing.lg,
        },
      ]}
    >
      <Ionicons
        name="people-outline"
        size={40}
        color={theme.colors.onSurfaceVariant}
        style={{ marginBottom: theme.spacing.sm }}
      />
      <Text
        style={[
          theme.typography.bodyMedium,
          {
            color: theme.colors.onSurfaceVariant,
            textAlign: 'center',
          },
        ]}
      >
        No dependents added yet. Add family members to auto-fill forms for them too.
      </Text>
      <View style={{ marginTop: theme.spacing.md }}>
        <Button
          label="Add Dependent"
          onPress={onAdd}
          size="md"
          testID="add-first-dependent-button"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
  },
});

DependentList.displayName = 'DependentList';
