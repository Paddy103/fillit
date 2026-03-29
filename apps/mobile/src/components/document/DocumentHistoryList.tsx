/**
 * Document history list component.
 *
 * Displays processed documents with thumbnails, status badges,
 * search filtering, and swipe-to-delete. Used in the Documents tab.
 */

import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ProcessedDocument, ProcessingStatus } from '@fillit/shared';

import { useTheme } from '../../theme';
import { TextInput } from '../ui/TextInput';

// ─── Types ─────────────────────────────────────────────────────────

export interface DocumentHistoryListProps {
  /** The list of documents to display. */
  documents: ProcessedDocument[];
  /** Called when the user taps a document. */
  onPress: (documentId: string) => void;
  /** Called when the user deletes a document. */
  onDelete: (documentId: string) => void;
  /** Whether to show the search bar. @default true */
  showSearch?: boolean;
}

// ─── Status Config ────────────────────────────────────────────────

interface StatusConfig {
  label: string;
  icon: string;
  color: 'primary' | 'success' | 'warning' | 'error' | 'info';
}

const STATUS_MAP: Record<ProcessingStatus, StatusConfig> = {
  scanned: { label: 'Scanned', icon: 'camera-outline', color: 'info' },
  ocr_complete: { label: 'OCR Done', icon: 'text-outline', color: 'info' },
  fields_detected: { label: 'Fields Found', icon: 'search-outline', color: 'warning' },
  matched: { label: 'Matched', icon: 'checkmark-circle-outline', color: 'primary' },
  reviewed: { label: 'Reviewed', icon: 'eye-outline', color: 'primary' },
  exported: { label: 'Exported', icon: 'download-outline', color: 'success' },
};

// ─── Component ─────────────────────────────────────────────────────

export function DocumentHistoryList({
  documents,
  onPress,
  onDelete,
  showSearch = true,
}: DocumentHistoryListProps) {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    const query = searchQuery.toLowerCase().trim();
    return documents.filter(
      (doc) =>
        doc.title.toLowerCase().includes(query) ||
        doc.status.toLowerCase().includes(query) ||
        (doc.documentType ?? '').toLowerCase().includes(query),
    );
  }, [documents, searchQuery]);

  const handleDelete = useCallback(
    (doc: ProcessedDocument) => {
      Alert.alert(
        'Delete Document',
        `Are you sure you want to delete "${doc.title}"? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => onDelete(doc.id),
          },
        ],
      );
    },
    [onDelete],
  );

  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-ZA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ProcessedDocument }) => {
      const statusConfig = STATUS_MAP[item.status] ?? STATUS_MAP.scanned;
      const colorValue = theme.colors[statusConfig.color] ?? theme.colors.primary;

      return (
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
              borderRadius: theme.radii.md,
              padding: theme.spacing.md,
              marginBottom: theme.spacing.sm,
            },
          ]}
          onPress={() => onPress(item.id)}
          accessibilityRole="button"
          accessibilityLabel={`Open ${item.title}`}
          testID={`document-card-${item.id}`}
        >
          {/* Thumbnail + Info */}
          <View style={styles.cardContent}>
            {/* Thumbnail placeholder */}
            <View
              style={[
                styles.thumbnail,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  borderRadius: theme.radii.sm,
                },
              ]}
            >
              <Ionicons
                name="document-text-outline"
                size={28}
                color={theme.colors.onSurfaceVariant}
              />
              {item.pages.length > 0 ? (
                <Text
                  style={[
                    theme.typography.labelSmall,
                    { color: theme.colors.onSurfaceVariant, marginTop: 2 },
                  ]}
                >
                  {item.pages.length}p
                </Text>
              ) : null}
            </View>

            {/* Info */}
            <View style={styles.info}>
              <Text
                style={[theme.typography.labelLarge, { color: theme.colors.onSurface }]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              {item.documentType ? (
                <Text
                  style={[
                    theme.typography.bodySmall,
                    { color: theme.colors.onSurfaceVariant, marginTop: 2 },
                  ]}
                  numberOfLines={1}
                >
                  {item.documentType}
                </Text>
              ) : null}
              <Text
                style={[
                  theme.typography.bodySmall,
                  { color: theme.colors.onSurfaceVariant, marginTop: 2 },
                ]}
              >
                {formatDate(item.updatedAt ?? item.createdAt)}
              </Text>
            </View>

            {/* Status badge + delete */}
            <View style={styles.actions}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: `${colorValue}20`,
                    borderRadius: theme.radii.sm,
                    paddingHorizontal: theme.spacing.sm,
                    paddingVertical: 3,
                  },
                ]}
              >
                <Ionicons name={statusConfig.icon as never} size={14} color={colorValue} />
                <Text style={[theme.typography.labelSmall, { color: colorValue, marginLeft: 4 }]}>
                  {statusConfig.label}
                </Text>
              </View>
              <Pressable
                onPress={() => handleDelete(item)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${item.title}`}
                testID={`document-delete-${item.id}`}
                style={{ marginTop: theme.spacing.sm }}
              >
                <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
              </Pressable>
            </View>
          </View>
        </Pressable>
      );
    },
    [theme, onPress, handleDelete, formatDate],
  );

  const keyExtractor = useCallback((item: ProcessedDocument) => item.id, []);

  return (
    <View style={styles.container} testID="document-history-list">
      {showSearch && documents.length > 0 ? (
        <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md }}>
          <TextInput
            label=""
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search documents..."
            variant="outlined"
            testID="document-search-input"
          />
        </View>
      ) : null}

      <FlatList
        data={filteredDocuments}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing['3xl'],
        }}
        ListEmptyComponent={
          searchQuery.trim() ? (
            <View style={[styles.empty, { padding: theme.spacing.xl }]}>
              <Ionicons name="search-outline" size={48} color={theme.colors.onSurfaceVariant} />
              <Text
                style={[
                  theme.typography.bodyLarge,
                  {
                    color: theme.colors.onSurfaceVariant,
                    marginTop: theme.spacing.md,
                    textAlign: 'center',
                  },
                ]}
              >
                No documents match "{searchQuery}"
              </Text>
            </View>
          ) : (
            <View style={[styles.empty, { padding: theme.spacing.xl }]}>
              <Ionicons
                name="folder-open-outline"
                size={48}
                color={theme.colors.onSurfaceVariant}
              />
              <Text
                style={[
                  theme.typography.bodyLarge,
                  {
                    color: theme.colors.onSurfaceVariant,
                    marginTop: theme.spacing.md,
                    textAlign: 'center',
                  },
                ]}
              >
                No documents yet
              </Text>
              <Text
                style={[
                  theme.typography.bodyMedium,
                  {
                    color: theme.colors.onSurfaceVariant,
                    marginTop: theme.spacing.xs,
                    textAlign: 'center',
                  },
                ]}
              >
                Scanned and imported documents will appear here.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    borderWidth: 1,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumbnail: {
    width: 52,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  actions: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

DocumentHistoryList.displayName = 'DocumentHistoryList';
