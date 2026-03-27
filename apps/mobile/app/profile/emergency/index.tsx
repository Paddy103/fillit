/**
 * Emergency contacts list screen.
 *
 * Shows existing emergency contacts for the active profile with
 * options to add, edit, or delete. Maximum 2 contacts enforced.
 */

import { useCallback } from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { useTheme } from '../../../src/theme';
import { ScreenHeader } from '../../../src/components/profile/ScreenHeader';
import { EmergencyContactList } from '../../../src/components/profile/EmergencyContactList';
import { useProfileStore, selectActiveProfile } from '../../../src/stores/profile-store';
import type { EmergencyContact } from '@fillit/shared';

export default function EmergencyContactsScreen() {
  const { theme } = useTheme();
  const profile = useProfileStore(selectActiveProfile);
  const deleteContact = useProfileStore((s) => s.deleteEmergencyContact);
  const isMutating = useProfileStore((s) => s.mutationCount > 0);

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  const handleAdd = useCallback(() => {
    router.push('/profile/emergency/add');
  }, []);

  const handleEdit = useCallback((contact: EmergencyContact) => {
    router.push(`/profile/emergency/${contact.id}`);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!profile) return;
      try {
        await deleteContact(id, profile.id);
      } catch {
        // Error is stored in the profile store
      }
    },
    [profile, deleteContact],
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
      <ScreenHeader title="Emergency Contacts" onBack={handleBack} />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={{
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing['5xl'],
        }}
        testID="emergency-contacts-scroll"
      >
        <EmergencyContactList
          contacts={profile.emergencyContacts}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isDeleting={isMutating}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
