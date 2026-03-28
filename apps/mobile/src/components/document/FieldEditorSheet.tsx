/**
 * Bottom sheet for editing a detected field's value and source.
 *
 * Slides up from the bottom when a field is selected. Shows:
 * - Field label and confidence indicator
 * - Editable value input
 * - Source selector (profile, manual, skip)
 * - Save / Skip actions that advance to the next field
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DetectedField } from '@fillit/shared';

import { useTheme } from '../../theme';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Badge';
import { TextInput } from '../ui/TextInput';

// ─── Types ─────────────────────────────────────────────────────────

/** How the field value was sourced. */
export type FieldSource = 'profile' | 'manual' | 'skip';

/** Result emitted when the user saves a field edit. */
export interface FieldEditResult {
  fieldId: string;
  value: string;
  source: FieldSource;
  isConfirmed: boolean;
}

export interface FieldEditorSheetProps {
  /** The field to edit. Pass null to hide the sheet. */
  field: DetectedField | null;
  /** Called when the user saves or skips the field. */
  onSave: (result: FieldEditResult) => void;
  /** Called when the sheet is dismissed without saving. */
  onDismiss: () => void;
  /** Optional label for the profile source (e.g. profile name). */
  profileSourceLabel?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────

const ANIMATION_DURATION = 250;
const SHEET_HEIGHT = 360;

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return 'High';
  if (confidence >= 0.5) return 'Medium';
  if (confidence > 0) return 'Low';
  return 'None';
}

function getConfidenceChipColor(confidence: number): 'success' | 'warning' | 'error' | 'default' {
  if (confidence >= 0.8) return 'success';
  if (confidence >= 0.5) return 'warning';
  if (confidence > 0) return 'error';
  return 'default';
}

function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

// ─── Component ─────────────────────────────────────────────────────

export function FieldEditorSheet({
  field,
  onSave,
  onDismiss,
  profileSourceLabel,
}: FieldEditorSheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Local editing state
  const [editValue, setEditValue] = useState('');
  const [source, setSource] = useState<FieldSource>('profile');

  // Animation
  const translateY = useSharedValue(SHEET_HEIGHT);
  const opacity = useSharedValue(0);
  const isVisible = field !== null;

  // Sync local state when field changes
  useEffect(() => {
    if (field) {
      setEditValue(field.value);
      setSource(field.matchedProfileField ? 'profile' : 'manual');
    }
  }, [field]);

  // Animate in/out
  useEffect(() => {
    if (isVisible) {
      translateY.value = withTiming(0, { duration: ANIMATION_DURATION });
      opacity.value = withTiming(0.5, { duration: ANIMATION_DURATION });
    } else {
      translateY.value = withTiming(SHEET_HEIGHT, { duration: ANIMATION_DURATION });
      opacity.value = withTiming(0, { duration: ANIMATION_DURATION });
    }
  }, [isVisible, translateY, opacity]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleSave = useCallback(() => {
    if (!field) return;
    Keyboard.dismiss();
    onSave({
      fieldId: field.id,
      value: source === 'skip' ? '' : editValue.trim(),
      source,
      isConfirmed: source !== 'skip',
    });
  }, [field, editValue, source, onSave]);

  const handleSkip = useCallback(() => {
    if (!field) return;
    Keyboard.dismiss();
    onSave({
      fieldId: field.id,
      value: '',
      source: 'skip',
      isConfirmed: false,
    });
  }, [field, onSave]);

  const handleBackdropPress = useCallback(() => {
    Keyboard.dismiss();
    onDismiss();
  }, [onDismiss]);

  const handleSourceChange = useCallback((newSource: FieldSource) => {
    setSource(newSource);
  }, []);

  const confidenceLabel = useMemo(
    () => (field ? getConfidenceLabel(field.matchConfidence) : ''),
    [field],
  );
  const confidenceColor = useMemo(
    () => (field ? getConfidenceChipColor(field.matchConfidence) : ('default' as const)),
    [field],
  );
  const confidenceText = useMemo(
    () => (field ? formatConfidence(field.matchConfidence) : ''),
    [field],
  );

  if (!isVisible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" testID="field-editor-sheet">
      {/* Backdrop */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={handleBackdropPress}
        accessibilityRole="button"
        accessibilityLabel="Close field editor"
      >
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, backdropStyle]}
          testID="field-editor-backdrop"
        />
      </Pressable>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.colors.surface,
            paddingBottom: insets.bottom + theme.spacing.lg,
            borderTopLeftRadius: theme.radii.lg,
            borderTopRightRadius: theme.radii.lg,
            ...theme.elevations.xl,
          },
          sheetStyle,
        ]}
        testID="field-editor-content"
        accessibilityViewIsModal={true}
        accessibilityRole="none"
      >
        {/* Handle */}
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: theme.colors.outline }]} />
        </View>

        {/* Header: label + confidence */}
        <View style={[styles.header, { paddingHorizontal: theme.spacing.xl }]}>
          <View style={styles.headerLeft}>
            <Text
              style={[theme.typography.titleMedium, { color: theme.colors.onSurface }]}
              numberOfLines={1}
              testID="field-editor-label"
            >
              {field?.label}
            </Text>
            {field?.fieldType !== 'text' ? (
              <Text
                style={[
                  theme.typography.bodySmall,
                  { color: theme.colors.onSurfaceVariant, marginTop: 2 },
                ]}
              >
                {field?.fieldType}
              </Text>
            ) : null}
          </View>
          <View testID="field-editor-confidence">
            <Chip
              label={`${confidenceLabel} ${confidenceText}`}
              color={confidenceColor}
              variant="filled"
            />
          </View>
        </View>

        {/* Source selector */}
        <View style={[styles.sourceRow, { paddingHorizontal: theme.spacing.xl }]}>
          <Text
            style={[
              theme.typography.labelMedium,
              { color: theme.colors.onSurfaceVariant, marginBottom: theme.spacing.sm },
            ]}
          >
            Source
          </Text>
          <View style={styles.sourceChips}>
            <Chip
              label={profileSourceLabel ?? 'Profile'}
              variant={source === 'profile' ? 'filled' : 'outlined'}
              color={source === 'profile' ? 'primary' : 'default'}
              selected={source === 'profile'}
              onPress={() => handleSourceChange('profile')}
            />
            <Chip
              label="Manual"
              variant={source === 'manual' ? 'filled' : 'outlined'}
              color={source === 'manual' ? 'primary' : 'default'}
              selected={source === 'manual'}
              onPress={() => handleSourceChange('manual')}
              style={{ marginLeft: theme.spacing.sm }}
            />
            <Chip
              label="Skip"
              variant={source === 'skip' ? 'filled' : 'outlined'}
              color={source === 'skip' ? 'warning' : 'default'}
              selected={source === 'skip'}
              onPress={() => handleSourceChange('skip')}
              style={{ marginLeft: theme.spacing.sm }}
            />
          </View>
        </View>

        {/* Value editor */}
        {source !== 'skip' ? (
          <View style={{ paddingHorizontal: theme.spacing.xl }}>
            <TextInput
              label="Value"
              value={editValue}
              onChangeText={setEditValue}
              variant="outlined"
              disabled={source !== 'manual'}
              placeholder={source === 'profile' ? 'From profile' : 'Enter value'}
              maxLength={500}
              testID="field-editor-value-input"
              containerStyle={{ marginBottom: 0 }}
            />
          </View>
        ) : (
          <View style={[styles.skipMessage, { paddingHorizontal: theme.spacing.xl }]}>
            <Text
              style={[
                theme.typography.bodyMedium,
                { color: theme.colors.onSurfaceVariant, fontStyle: 'italic' },
              ]}
            >
              This field will be left empty
            </Text>
          </View>
        )}

        {/* Actions */}
        <View
          style={[
            styles.actions,
            {
              paddingHorizontal: theme.spacing.xl,
              marginTop: theme.spacing.lg,
            },
          ]}
        >
          <Button
            label="Skip"
            variant="ghost"
            size="md"
            onPress={handleSkip}
            testID="field-editor-skip-btn"
            style={{ flex: 1, marginRight: theme.spacing.sm }}
          />
          <Button
            label="Save"
            variant="primary"
            size="md"
            onPress={handleSave}
            disabled={source !== 'skip' && !editValue.trim()}
            testID="field-editor-save-btn"
            style={{ flex: 2 }}
          />
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: SHEET_HEIGHT,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  sourceRow: {
    paddingVertical: 8,
  },
  sourceChips: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skipMessage: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

FieldEditorSheet.displayName = 'FieldEditorSheet';
