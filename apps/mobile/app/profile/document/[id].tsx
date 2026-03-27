/**
 * Edit identity document screen.
 *
 * Loads the document by ID from the active profile, renders the
 * DocumentForm pre-filled with existing data, and supports saving
 * changes or deleting the document.
 */

import { useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useTheme } from '../../../src/theme';
import { ScreenHeader } from '../../../src/components/profile/ScreenHeader';
import { DocumentForm } from '../../../src/components/profile';
import { useProfileStore, selectActiveProfile } from '../../../src/stores/profile-store';
import type { UpdateIdentityDocumentInput } from '../../../src/services/storage/profileCrud';

// ---------------------------------------------------------------------------
// Discard confirmation helper
// ---------------------------------------------------------------------------

function confirmDiscard(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert('Discard Changes?', 'You have unsaved changes. Are you sure you want to go back?', [
      {
        text: 'Keep Editing',
        style: 'cancel',
        onPress: () => resolve(false),
      },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => resolve(true),
      },
    ]);
  });
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function EditDocumentScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useProfileStore(selectActiveProfile);
  const updateDocument = useProfileStore((s) => s.updateIdentityDocument);
  const isMutating = useProfileStore((s) => s.mutationCount > 0);
  const isDirtyRef = useRef(false);

  const document = useMemo(() => {
    return profile?.documents.find((d) => d.id === id) ?? null;
  }, [profile, id]);

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

  const handleUpdate = useCallback(
    async (data: UpdateIdentityDocumentInput) => {
      if (!profile || !id) return;
      try {
        await updateDocument(id, profile.id, data);
        Alert.alert('Document Updated', 'Your changes have been saved.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } catch (err) {
        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update document.');
      }
    },
    [profile, id, updateDocument],
  );

  if (!document) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <ScreenHeader title="Edit Document" onBack={() => router.back()} />
        <View style={styles.center}>
          <Text style={[theme.typography.bodyLarge, { color: theme.colors.onSurfaceVariant }]}>
            Document not found
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title="Edit Document" onBack={handleBack} />
      <DocumentForm
        initialData={document}
        onSubmitCreate={handleUpdate}
        onSubmitUpdate={handleUpdate}
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
