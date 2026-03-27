/**
 * Add emergency contact screen.
 *
 * Renders the EmergencyContactForm for creating a new contact.
 * Persists via the profile store and navigates back on success.
 */

import { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';

import { useTheme } from '../../../src/theme';
import { ScreenHeader } from '../../../src/components/profile/ScreenHeader';
import { EmergencyContactForm } from '../../../src/components/profile/EmergencyContactForm';
import { useProfileStore, selectActiveProfile } from '../../../src/stores/profile-store';
import type { EmergencyContactFormData } from '../../../src/components/profile/useEmergencyContactForm';

export default function AddEmergencyContactScreen() {
  const { theme } = useTheme();
  const profile = useProfileStore(selectActiveProfile);
  const createContact = useProfileStore((s) => s.createEmergencyContact);
  const isMutating = useProfileStore((s) => s.mutationCount > 0);
  const isDirtyRef = useRef(false);

  const handleBack = useCallback(() => {
    if (isDirtyRef.current) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => router.back(),
          },
        ],
      );
      return;
    }
    router.back();
  }, []);

  const handleSubmit = useCallback(
    async (data: EmergencyContactFormData) => {
      if (!profile) return;
      try {
        await createContact(profile.id, {
          firstName: data.firstName,
          lastName: data.lastName,
          relationship: data.relationship,
          phoneMobile: data.phoneMobile,
          phoneWork: data.phoneWork || undefined,
          email: data.email || undefined,
        });
        Alert.alert('Contact Added', 'Emergency contact has been added successfully.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } catch (err) {
        Alert.alert(
          'Error',
          err instanceof Error ? err.message : 'Failed to add contact. Please try again.',
        );
      }
    },
    [profile, createContact],
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
      <ScreenHeader title="Add Emergency Contact" onBack={handleBack} />
      <EmergencyContactForm onSubmit={handleSubmit} onCancel={handleBack} isSaving={isMutating} />
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
