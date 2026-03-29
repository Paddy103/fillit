/**
 * Signature list component.
 *
 * Displays saved signatures with preview thumbnails. Supports
 * setting a default, deleting, and adding new signatures.
 */

import { useCallback } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { StoredSignature } from '@fillit/shared';

import { useTheme } from '../../theme';
import { SignaturePreview } from './SignaturePreview';
import { Button } from '../ui/Button';

// ─── Types ─────────────────────────────────────────────────────────

export interface SignatureListProps {
  /** The list of signatures to display. */
  signatures: StoredSignature[];
  /** Called when the user taps "Add signature". */
  onAdd: () => void;
  /** Called when the user deletes a signature. */
  onDelete: (id: string) => void;
  /** Called when the user sets a signature as default. */
  onSetDefault: (id: string) => void;
}

// ─── Component ─────────────────────────────────────────────────────

export function SignatureList({ signatures, onAdd, onDelete, onSetDefault }: SignatureListProps) {
  const { theme } = useTheme();

  const handleDelete = useCallback(
    (sig: StoredSignature) => {
      Alert.alert('Delete Signature', `Are you sure you want to delete "${sig.label}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(sig.id),
        },
      ]);
    },
    [onDelete],
  );

  const renderItem = useCallback(
    ({ item }: { item: StoredSignature }) => (
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: item.isDefault ? theme.colors.primary : theme.colors.outline,
            borderWidth: item.isDefault ? 2 : 1,
            borderRadius: theme.radii.md,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.sm,
          },
        ]}
        testID={`signature-card-${item.id}`}
      >
        {/* Header: label + default badge */}
        <View style={styles.cardHeader}>
          <View style={styles.labelRow}>
            <Text
              style={[theme.typography.labelLarge, { color: theme.colors.onSurface, flex: 1 }]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
            {item.isDefault ? (
              <View
                style={[
                  styles.defaultBadge,
                  {
                    backgroundColor: theme.colors.primaryLight,
                    borderRadius: theme.radii.sm,
                    paddingHorizontal: theme.spacing.sm,
                    paddingVertical: 2,
                  },
                ]}
              >
                <Text style={[theme.typography.labelSmall, { color: theme.colors.onPrimary }]}>
                  Default
                </Text>
              </View>
            ) : null}
          </View>
          <Text
            style={[
              theme.typography.bodySmall,
              {
                color: theme.colors.onSurfaceVariant,
                marginTop: 2,
              },
            ]}
          >
            {item.type === 'drawn' ? 'Drawn' : 'Typed'} signature
          </Text>
        </View>

        {/* Preview */}
        <View style={{ marginTop: theme.spacing.sm }}>
          <SignaturePreview signature={item} size="thumbnail" expandable />
        </View>

        {/* Actions */}
        <View style={[styles.cardActions, { marginTop: theme.spacing.sm }]}>
          {!item.isDefault ? (
            <Pressable
              style={[styles.actionButton, { marginRight: theme.spacing.md }]}
              onPress={() => onSetDefault(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`Set ${item.label} as default signature`}
              testID={`signature-set-default-${item.id}`}
            >
              <Ionicons name="star-outline" size={18} color={theme.colors.primary} />
              <Text
                style={[
                  theme.typography.labelMedium,
                  { color: theme.colors.primary, marginLeft: 4 },
                ]}
              >
                Set default
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            style={styles.actionButton}
            onPress={() => handleDelete(item)}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${item.label}`}
            testID={`signature-delete-${item.id}`}
          >
            <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
            <Text
              style={[theme.typography.labelMedium, { color: theme.colors.error, marginLeft: 4 }]}
            >
              Delete
            </Text>
          </Pressable>
        </View>
      </View>
    ),
    [theme, onSetDefault, handleDelete],
  );

  const keyExtractor = useCallback((item: StoredSignature) => item.id, []);

  return (
    <View style={styles.container} testID="signature-list">
      <FlatList
        data={signatures}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing['3xl'],
        }}
        ListEmptyComponent={
          <View style={[styles.empty, { padding: theme.spacing.xl }]}>
            <Ionicons name="create-outline" size={48} color={theme.colors.onSurfaceVariant} />
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
              No signatures yet
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
              Add a signature to use when signing documents.
            </Text>
          </View>
        }
        ListFooterComponent={
          <Button
            label="Add Signature"
            variant="primary"
            size="md"
            onPress={onAdd}
            testID="signature-add-button"
            iconLeft={<Ionicons name="add" size={20} color="#fff" />}
            style={{ marginTop: theme.spacing.md }}
          />
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
    overflow: 'hidden',
  },
  cardHeader: {},
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  defaultBadge: {},
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

SignatureList.displayName = 'SignatureList';
