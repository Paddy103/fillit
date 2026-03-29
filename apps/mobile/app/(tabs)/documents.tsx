/**
 * Documents tab screen.
 *
 * Displays the document history list with status badges, search,
 * and delete functionality. Tapping a document re-opens it for
 * continued processing or re-export.
 */

import { useCallback } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { useTheme } from '../../src/theme';
import { DocumentHistoryList } from '../../src/components/document';
import { useDocumentStore, selectDocuments } from '../../src/stores/document-store';

export default function DocumentsScreen() {
  const { theme } = useTheme();
  const documents = useDocumentStore(selectDocuments);
  const deleteDocument = useDocumentStore((s) => s.deleteDocument);

  const handlePress = useCallback((documentId: string) => {
    router.push(`/scan/${documentId}` as never);
  }, []);

  const handleDelete = useCallback(
    async (documentId: string) => {
      try {
        await deleteDocument(documentId);
      } catch (err) {
        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete document.');
      }
    },
    [deleteDocument],
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      testID="documents-screen"
    >
      <DocumentHistoryList documents={documents} onPress={handlePress} onDelete={handleDelete} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
