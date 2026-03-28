/**
 * Field overlay rectangle rendered on top of a document image.
 *
 * Positioned using normalized bounding box coordinates (0-1) scaled
 * to the actual image display dimensions. Color-coded by confidence:
 * green (≥0.7), yellow (≥0.4), red (<0.4).
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DetectedField } from '@fillit/shared';

import { useTheme } from '../../theme';

// ─── Helpers ────────────────────────────────────────────────────────

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.7) return 'rgba(76, 175, 80, 0.35)'; // green
  if (confidence >= 0.4) return 'rgba(255, 193, 7, 0.35)'; // yellow
  return 'rgba(244, 67, 54, 0.35)'; // red
}

function getBorderColor(confidence: number): string {
  if (confidence >= 0.7) return '#4CAF50';
  if (confidence >= 0.4) return '#FFC107';
  return '#F44336';
}

// ─── Props ──────────────────────────────────────────────────────────

export interface FieldOverlayProps {
  field: DetectedField;
  /** Width of the image container in pixels. */
  imageWidth: number;
  /** Height of the image container in pixels. */
  imageHeight: number;
  /** Whether this field is currently selected. */
  isSelected?: boolean;
  /** Called when the field overlay is tapped. */
  onPress?: (field: DetectedField) => void;
}

// ─── Component ──────────────────────────────────────────────────────

export function FieldOverlay({
  field,
  imageWidth,
  imageHeight,
  isSelected,
  onPress,
}: FieldOverlayProps) {
  const { theme } = useTheme();
  const { bounds, matchConfidence, label } = field;

  const left = bounds.x * imageWidth;
  const top = bounds.y * imageHeight;
  const width = bounds.width * imageWidth;
  const height = bounds.height * imageHeight;

  const bgColor = getConfidenceColor(matchConfidence);
  const borderColor = isSelected ? theme.colors.primary : getBorderColor(matchConfidence);

  return (
    <Pressable
      onPress={() => onPress?.(field)}
      style={[
        styles.overlay,
        {
          left,
          top,
          width,
          height,
          backgroundColor: bgColor,
          borderColor,
          borderWidth: isSelected ? 2.5 : 1.5,
        },
      ]}
      accessibilityLabel={`Field: ${label}`}
      accessibilityRole="button"
      testID={`field-overlay-${field.id}`}
    >
      {isSelected && (
        <View style={[styles.labelBadge, { backgroundColor: borderColor }]}>
          <Text style={styles.labelText} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    borderRadius: 2,
  },
  labelBadge: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    marginBottom: 2,
  },
  labelText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
});

FieldOverlay.displayName = 'FieldOverlay';
