/**
 * Edit emergency contact screen.
 *
 * Loads the contact by ID from the active profile, renders
 * the EmergencyContactForm pre-filled, and persists changes
 * via the profile store.
 */

import { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useTheme } from '../../../src/theme';
import { ScreenHeader } from '../../../src/components/profile/ScreenHeader';
import { EmergencyContactForm } from '../../../src/components/profile/EmergencyContactForm';
import { useProfileStore, selectActiveProfile } from '../../../src/stores/profile-store';
import type { EmergencyContactFormData } from '../../../src/components/profile/useEmergencyContactForm';

export default function EditEmergencyContactScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useProfileStore(selectActiveProfile);
  const updateContact = useProfileStore((s) => s.updateEmergencyContact);
  const isMutating = useProfileStore((s) => s.mutationCount > 0);

  const contact = useMemo(
    () => profile?.emergencyContacts.find((c) => c.id === id) ?? null,
    [profile, id],
  );

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  const handleSubmit = useCallback(
    async (data: EmergencyContactFormData) => {
      if (!profile || !id) return;
      try {
        await updateContact(id, profile.id, {
          firstName: data.firstName,
          lastName: data.lastName,
          relationship: data.relationship,
          phoneMobile: data.phoneMobile,
          phoneWork: data.phoneWork || undefined,
          email: data.email || undefined,
        });
        Alert.alert('Contact Updated', 'Emergency contact has been updated successfully.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } catch (err) {
        Alert.alert(
          'Error',
          err instanceof Error ? err.message : 'Failed to update contact. Please try again.',
        );
      }
    },
    [profile, id, updateContact],
  );

  if (!profile || !contact) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={[theme.typography.bodyLarge, { color: theme.colors.onSurfaceVariant }]}>
          {!profile ? 'No profile selected' : 'Contact not found'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title="Edit Emergency Contact" onBack={handleBack} />
      <EmergencyContactForm
        initialData={contact}
        onSubmit={handleSubmit}
        onCancel={handleBack}
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
