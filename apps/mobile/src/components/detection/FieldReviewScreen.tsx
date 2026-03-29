/**
 * Field matching and review screen.
 *
 * Displays the document with field overlays, a field list with
 * matched values, and the field editor bottom sheet. Users can
 * review, edit, or skip each detected field before confirming
 * all fields and proceeding to signatures/export.
 */

import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { DetectedField } from '@fillit/shared';

import { useTheme } from '../../theme';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Badge';
import { DocumentViewer } from '../document/DocumentViewer';
import { FieldEditorSheet, type FieldEditResult } from '../document/FieldEditorSheet';

// ─── Types ─────────────────────────────────────────────────────────

export interface FieldReviewScreenProps {
  /** Document page image URI. */
  imageUri: string;
  /** Original image dimensions. */
  imageWidth: number;
  imageHeight: number;
  /** Detected fields to review. */
  fields: DetectedField[];
  /** Called when a field is updated. */
  onFieldUpdate: (result: FieldEditResult) => void;
  /** Called when the user confirms all fields. */
  onConfirmAll: () => void;
  /** Called when the user wants to re-analyze. */
  onReAnalyze: () => void;
  /** Whether the detection used reduced accuracy (offline). */
  reducedAccuracy?: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────

function getFieldStatusColor(field: DetectedField): 'success' | 'warning' | 'error' | 'default' {
  if (field.isConfirmed) return 'success';
  if (field.matchConfidence >= 0.7) return 'success';
  if (field.matchConfidence >= 0.4) return 'warning';
  if (field.matchConfidence > 0) return 'error';
  return 'default';
}

function getFieldStatusLabel(field: DetectedField): string {
  if (field.isConfirmed) return 'Confirmed';
  if (field.matchConfidence >= 0.7) return `${Math.round(field.matchConfidence * 100)}%`;
  if (field.matchConfidence >= 0.4) return `${Math.round(field.matchConfidence * 100)}%`;
  if (field.matchConfidence > 0) return `${Math.round(field.matchConfidence * 100)}%`;
  return 'No match';
}

// ─── Component ─────────────────────────────────────────────────────

export function FieldReviewScreen({
  imageUri,
  imageWidth,
  imageHeight,
  fields,
  onFieldUpdate,
  onConfirmAll,
  onReAnalyze,
  reducedAccuracy = false,
}: FieldReviewScreenProps) {
  const { theme } = useTheme();
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  const selectedField = useMemo(
    () => fields.find((f) => f.id === selectedFieldId) ?? null,
    [fields, selectedFieldId],
  );

  const confirmedCount = useMemo(() => fields.filter((f) => f.isConfirmed).length, [fields]);

  const allConfirmed = confirmedCount === fields.length && fields.length > 0;

  const handleFieldPress = useCallback((field: DetectedField) => {
    setSelectedFieldId(field.id);
  }, []);

  const handleEditorSave = useCallback(
    (result: FieldEditResult) => {
      onFieldUpdate(result);
      // Auto-advance to next unconfirmed field
      const currentIndex = fields.findIndex((f) => f.id === result.fieldId);
      const nextUnconfirmed = fields.find((f, i) => i > currentIndex && !f.isConfirmed);
      setSelectedFieldId(nextUnconfirmed?.id ?? null);
    },
    [fields, onFieldUpdate],
  );

  const handleEditorDismiss = useCallback(() => {
    setSelectedFieldId(null);
  }, []);

  const renderFieldItem = useCallback(
    ({ item }: { item: DetectedField }) => (
      <View
        style={[
          styles.fieldItem,
          {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radii.md,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.sm,
            borderLeftWidth: 3,
            borderLeftColor: item.isConfirmed
              ? theme.colors.success
              : item.matchConfidence >= 0.7
                ? theme.colors.success
                : item.matchConfidence >= 0.4
                  ? theme.colors.warning
                  : theme.colors.error,
          },
        ]}
        testID={`field-review-item-${item.id}`}
      >
        <View style={styles.fieldItemHeader}>
          <Text
            style={[theme.typography.bodyMedium, { color: theme.colors.onSurface, flex: 1 }]}
            numberOfLines={1}
          >
            {item.label}
          </Text>
          <Chip
            label={getFieldStatusLabel(item)}
            color={getFieldStatusColor(item)}
            variant="filled"
          />
        </View>
        <Text
          style={[
            theme.typography.bodySmall,
            {
              color: item.value ? theme.colors.onSurface : theme.colors.onSurfaceVariant,
              marginTop: theme.spacing.xs,
            },
          ]}
          numberOfLines={1}
        >
          {item.value || 'No value'}
        </Text>
        <Button
          label="Edit"
          variant="ghost"
          size="sm"
          onPress={() => handleFieldPress(item)}
          style={{ alignSelf: 'flex-end', marginTop: theme.spacing.xs }}
          testID={`field-review-edit-${item.id}`}
        />
      </View>
    ),
    [theme, handleFieldPress],
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      testID="field-review-screen"
    >
      {/* Reduced accuracy warning */}
      {reducedAccuracy ? (
        <View
          style={[
            styles.warningBar,
            {
              backgroundColor: theme.colors.warningLight,
              paddingVertical: theme.spacing.sm,
              paddingHorizontal: theme.spacing.lg,
            },
          ]}
          accessibilityRole="alert"
        >
          <Text style={[theme.typography.labelMedium, { color: theme.colors.warning }]}>
            Offline detection — review fields carefully
          </Text>
        </View>
      ) : null}

      {/* Document viewer with overlays */}
      <View style={styles.viewerSection}>
        <DocumentViewer
          imageUri={imageUri}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          fields={fields}
          selectedFieldId={selectedFieldId ?? undefined}
          onFieldPress={handleFieldPress}
        />
      </View>

      {/* Progress indicator */}
      <View
        style={[
          styles.progressBar,
          { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm },
        ]}
      >
        <Text style={[theme.typography.labelMedium, { color: theme.colors.onSurfaceVariant }]}>
          {confirmedCount}/{fields.length} fields confirmed
        </Text>
      </View>

      {/* Field list */}
      <FlatList
        data={fields}
        renderItem={renderFieldItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        style={styles.fieldList}
        testID="field-review-list"
      />

      {/* Actions */}
      <View
        style={[
          styles.actions,
          {
            padding: theme.spacing.lg,
            backgroundColor: theme.colors.surface,
            ...theme.elevations.md,
          },
        ]}
      >
        <Button
          label="Re-analyze"
          variant="outline"
          size="md"
          onPress={onReAnalyze}
          testID="field-review-reanalyze"
          style={{ marginRight: theme.spacing.sm }}
        />
        <Button
          label={allConfirmed ? 'Proceed' : `Confirm All (${confirmedCount}/${fields.length})`}
          variant="primary"
          size="md"
          onPress={onConfirmAll}
          testID="field-review-confirm"
          style={{ flex: 1 }}
        />
      </View>

      {/* Field editor bottom sheet */}
      <FieldEditorSheet
        field={selectedField}
        onSave={handleEditorSave}
        onDismiss={handleEditorDismiss}
      />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  warningBar: {
    alignItems: 'center',
  },
  viewerSection: {
    height: 250,
  },
  progressBar: {
    alignItems: 'center',
  },
  fieldList: {
    flex: 1,
  },
  fieldItem: {},
  fieldItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

FieldReviewScreen.displayName = 'FieldReviewScreen';
