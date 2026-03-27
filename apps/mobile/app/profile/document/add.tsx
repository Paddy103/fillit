/**
 * Add identity document screen.
 *
 * Renders the DocumentForm for creating a new identity document
 * under the active profile. Shows success feedback and navigates
 * back on completion.
 */

import { useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';

import { useTheme } from '../../../src/theme';
import { ScreenHeader } from '../../../src/components/profile/ScreenHeader';
import { DocumentForm } from '../../../src/components/profile';
import { useProfileStore, selectActiveProfile } from '../../../src/stores/profile-store';
import type { CreateIdentityDocumentInput } from '../../../src/services/storage/profileCrud';

export default function AddDocumentScreen() {
  const { theme } = useTheme();
  const profile = useProfileStore(selectActiveProfile);
  const createDocument = useProfileStore((s) => s.createIdentityDocument);
  const isMutating = useProfileStore((s) => s.mutationCount > 0);

  const handleSubmit = useCallback(
    async (data: CreateIdentityDocumentInput) => {
      if (!profile) return;
      try {
        await createDocument(profile.id, data);
        Alert.alert('Document Added', 'Your identity document has been saved.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } catch (err) {
        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add document.');
      }
    },
    [profile, createDocument],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title="Add Document" onBack={() => router.back()} />
      <DocumentForm
        onSubmitCreate={handleSubmit}
        onCancel={() => router.back()}
        isSaving={isMutating}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
