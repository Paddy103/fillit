/**
 * Reusable signature preview component.
 *
 * Renders both drawn (SVG path) and typed (text + font) signatures
 * in thumbnail or full-size mode. Supports tap-to-expand for
 * thumbnail previews.
 */

import { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { StoredSignature } from '@fillit/shared';

import { useTheme } from '../../theme';

// ─── Types ─────────────────────────────────────────────────────────

export type PreviewSize = 'thumbnail' | 'full';

export interface SignaturePreviewProps {
  /** The signature to display. */
  signature: StoredSignature;
  /** Display size. @default 'thumbnail' */
  size?: PreviewSize;
  /** Whether tapping the thumbnail opens a full-size modal. @default true */
  expandable?: boolean;
  /** Thumbnail height in dp. @default 60 */
  thumbnailHeight?: number;
  /** Full-size height in dp. @default 200 */
  fullHeight?: number;
}

// ─── Component ─────────────────────────────────────────────────────

export function SignaturePreview({
  signature,
  size = 'thumbnail',
  expandable = true,
  thumbnailHeight = 60,
  fullHeight = 200,
}: SignaturePreviewProps) {
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const isThumbnail = size === 'thumbnail';
  const height = isThumbnail ? thumbnailHeight : fullHeight;

  const handlePress = useCallback(() => {
    if (isThumbnail && expandable) {
      setModalVisible(true);
    }
  }, [isThumbnail, expandable]);

  const handleClose = useCallback(() => {
    setModalVisible(false);
  }, []);

  const renderContent = (displayHeight: number) => {
    if (signature.type === 'drawn' && signature.svgPath) {
      return (
        <View
          style={[
            styles.previewBox,
            {
              height: displayHeight,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
              borderRadius: theme.radii.md,
            },
          ]}
          testID="signature-preview-drawn"
        >
          <Svg width="100%" height="100%" viewBox="0 0 300 150" preserveAspectRatio="xMidYMid meet">
            <Path
              d={signature.svgPath}
              stroke={theme.colors.onSurface}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      );
    }

    if (signature.type === 'typed' && signature.text) {
      return (
        <View
          style={[
            styles.previewBox,
            {
              height: displayHeight,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
              borderRadius: theme.radii.md,
            },
          ]}
          testID="signature-preview-typed"
        >
          <Text
            style={[
              styles.typedText,
              {
                fontFamily: signature.fontFamily ?? undefined,
                color: theme.colors.onSurface,
                fontSize: isThumbnail ? 20 : 36,
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {signature.text}
          </Text>
        </View>
      );
    }

    // Fallback for signatures without renderable data
    return (
      <View
        style={[
          styles.previewBox,
          {
            height: displayHeight,
            backgroundColor: theme.colors.surfaceVariant,
            borderColor: theme.colors.outline,
            borderRadius: theme.radii.md,
          },
        ]}
        testID="signature-preview-empty"
      >
        <Text
          style={[
            theme.typography.bodySmall,
            { color: theme.colors.onSurfaceVariant, fontStyle: 'italic' },
          ]}
        >
          No preview available
        </Text>
      </View>
    );
  };

  return (
    <View testID="signature-preview">
      {/* Label */}
      {signature.label ? (
        <Text
          style={[
            theme.typography.labelSmall,
            {
              color: theme.colors.onSurfaceVariant,
              marginBottom: theme.spacing.xs,
            },
          ]}
          numberOfLines={1}
        >
          {signature.label}
          {signature.isDefault ? ' (Default)' : ''}
        </Text>
      ) : null}

      {/* Signature content */}
      {isThumbnail && expandable ? (
        <Pressable
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityLabel={`View ${signature.label ?? 'signature'} full size`}
        >
          {renderContent(height)}
        </Pressable>
      ) : (
        renderContent(height)
      )}

      {/* Full-size modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
        testID="signature-preview-modal"
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Close signature preview"
        >
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radii.lg,
                padding: theme.spacing.xl,
                ...theme.elevations.xl,
              },
            ]}
          >
            <Text
              style={[
                theme.typography.titleMedium,
                {
                  color: theme.colors.onSurface,
                  marginBottom: theme.spacing.md,
                  textAlign: 'center',
                },
              ]}
            >
              {signature.label}
            </Text>
            {renderContent(fullHeight)}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  previewBox: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 8,
  },
  typedText: {
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
  },
});

SignaturePreview.displayName = 'SignaturePreview';
