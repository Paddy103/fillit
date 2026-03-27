/**
 * Identity document list component.
 *
 * Renders a scrollable list of DocumentCard items with an empty
 * state message when no documents exist. Supports add and delete
 * actions.
 */

import { useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Alert } from 'react-native';
import type { IdentityDocument } from '@fillit/shared';

import { useTheme } from '../../theme';
import { Button } from '../ui';
import { DocumentCard } from './DocumentCard';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DocumentListProps {
  readonly documents: IdentityDocument[];
  readonly onPressDocument: (id: string) => void;
  readonly onDeleteDocument: (id: string) => void;
  readonly onAddDocument: () => void;
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ onAdd }: { onAdd: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={styles.emptyContainer}>
      <Text
        style={[
          theme.typography.bodyLarge,
          {
            color: theme.colors.onSurfaceVariant,
            textAlign: 'center',
            marginBottom: theme.spacing.lg,
          },
        ]}
      >
        No identity documents yet
      </Text>
      <Button label="Add Document" onPress={onAdd} size="md" testID="add-first-document" />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main list
// ---------------------------------------------------------------------------

export function DocumentList({
  documents,
  onPressDocument,
  onDeleteDocument,
  onAddDocument,
}: DocumentListProps) {
  const { theme } = useTheme();

  const handleDelete = useCallback(
    (id: string) => {
      const doc = documents.find((d) => d.id === id);
      const name = doc?.label ?? 'this document';
      Alert.alert('Delete Document', `Are you sure you want to delete ${name}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteDocument(id),
        },
      ]);
    },
    [documents, onDeleteDocument],
  );

  const renderItem = useCallback(
    ({ item }: { item: IdentityDocument }) => (
      <DocumentCard document={item} onPress={onPressDocument} onDelete={handleDelete} />
    ),
    [onPressDocument, handleDelete],
  );

  const keyExtractor = useCallback((item: IdentityDocument) => item.id, []);

  if (documents.length === 0) {
    return <EmptyState onAdd={onAddDocument} />;
  }

  return (
    <FlatList
      data={documents}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={{
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing['3xl'],
      }}
      testID="document-list"
      ListFooterComponent={
        <Button
          label="Add Document"
          variant="outline"
          onPress={onAddDocument}
          fullWidth
          size="md"
          testID="add-another-document"
        />
      }
    />
  );
}

DocumentList.displayName = 'DocumentList';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
});
