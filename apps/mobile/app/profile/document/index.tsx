/**
 * Document list screen.
 *
 * Displays all identity documents for the active profile with
 * options to add, edit, or delete documents.
 */

import { useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';

import { useTheme } from '../../../src/theme';
import { ScreenHeader } from '../../../src/components/profile/ScreenHeader';
import { DocumentList } from '../../../src/components/profile';
import {
  useProfileStore,
  selectActiveProfile,
  selectActiveProfileDocuments,
} from '../../../src/stores/profile-store';

export default function DocumentListScreen() {
  const { theme } = useTheme();
  const profile = useProfileStore(selectActiveProfile);
  const documents = useProfileStore(selectActiveProfileDocuments);
  const deleteDocument = useProfileStore((s) => s.deleteIdentityDocument);

  const handlePress = useCallback((id: string) => {
    router.push(`/profile/document/${id}`);
  }, []);

  const handleAdd = useCallback(() => {
    router.push('/profile/document/add');
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!profile) return;
      try {
        await deleteDocument(id, profile.id);
      } catch (err) {
        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete document.');
      }
    },
    [profile, deleteDocument],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title="Identity Documents" onBack={() => router.back()} />
      <DocumentList
        documents={documents}
        onPressDocument={handlePress}
        onDeleteDocument={handleDelete}
        onAddDocument={handleAdd}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
