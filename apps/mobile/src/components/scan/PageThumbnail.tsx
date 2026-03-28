/**
 * Page thumbnail card for the scan review screen.
 *
 * Displays a scanned page image with controls for reorder, delete, and retake.
 */

import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../../theme';
import { BodySmall } from '../ui';

interface PageThumbnailProps {
  readonly imageUri: string;
  readonly pageNumber: number;
  readonly totalPages: number;
  readonly disabled?: boolean;
  readonly onMoveUp: () => void;
  readonly onMoveDown: () => void;
  readonly onDelete: () => void;
  readonly onRetake: () => void;
}

export function PageThumbnail({
  imageUri,
  pageNumber,
  totalPages,
  disabled = false,
  onMoveUp,
  onMoveDown,
  onDelete,
  onRetake,
}: PageThumbnailProps) {
  const { theme } = useTheme();
  const isFirst = pageNumber === 1;
  const isLast = pageNumber === totalPages;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.lg,
          padding: theme.spacing.md,
          ...theme.elevations.sm,
        },
      ]}
      testID={`page-thumbnail-${pageNumber}`}
    >
      <View style={styles.row}>
        {/* Thumbnail image */}
        <View
          style={[
            styles.imageWrapper,
            {
              borderRadius: theme.radii.md,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
        >
          <Image
            source={{ uri: imageUri }}
            style={[styles.image, { borderRadius: theme.radii.md }]}
            resizeMode="cover"
            accessibilityLabel={`Page ${pageNumber}`}
          />
          <View
            style={[
              styles.badge,
              {
                backgroundColor: theme.colors.primary,
                borderRadius: theme.radii.full,
              },
            ]}
          >
            <BodySmall style={{ color: theme.colors.onPrimary }}>{String(pageNumber)}</BodySmall>
          </View>
        </View>

        {/* Controls */}
        <View style={[styles.controls, { gap: theme.spacing.sm }]}>
          {/* Reorder buttons */}
          <View style={[styles.reorderGroup, { gap: theme.spacing.xs }]}>
            <IconButton
              icon="chevron-up"
              label={`Move page ${pageNumber} up`}
              onPress={onMoveUp}
              disabled={disabled || isFirst}
              color={theme.colors.onSurfaceVariant}
              disabledColor={theme.colors.outlineVariant}
            />
            <IconButton
              icon="chevron-down"
              label={`Move page ${pageNumber} down`}
              onPress={onMoveDown}
              disabled={disabled || isLast}
              color={theme.colors.onSurfaceVariant}
              disabledColor={theme.colors.outlineVariant}
            />
          </View>

          {/* Action buttons */}
          <View style={[styles.actionGroup, { gap: theme.spacing.sm }]}>
            <IconButton
              icon="camera-outline"
              label={`Retake page ${pageNumber}`}
              onPress={onRetake}
              disabled={disabled}
              color={theme.colors.primary}
              disabledColor={theme.colors.outlineVariant}
            />
            <IconButton
              icon="trash-outline"
              label={`Delete page ${pageNumber}`}
              onPress={onDelete}
              disabled={disabled}
              color={theme.colors.error}
              disabledColor={theme.colors.outlineVariant}
            />
          </View>
        </View>
      </View>

      <BodySmall color="secondary" style={{ marginTop: theme.spacing.xs }}>
        Page {pageNumber} of {totalPages}
      </BodySmall>
    </View>
  );
}

PageThumbnail.displayName = 'PageThumbnail';

// ---------------------------------------------------------------------------
// Icon button helper
// ---------------------------------------------------------------------------

function IconButton({
  icon,
  label,
  onPress,
  disabled,
  color,
  disabledColor,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  disabled: boolean;
  color: string;
  disabledColor: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.iconButton, pressed && !disabled && styles.iconButtonPressed]}
    >
      <Ionicons name={icon} size={22} color={disabled ? disabledColor : color} />
    </Pressable>
  );
}

IconButton.displayName = 'IconButton';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageWrapper: {
    width: 100,
    height: 140,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 16,
  },
  reorderGroup: {
    alignItems: 'center',
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
  },
  iconButtonPressed: {
    opacity: 0.6,
  },
});
