/**
 * Export preview screen.
 *
 * Shows the filled PDF with all fields and signatures applied.
 * Users can review the document, then export, share, print,
 * or go back to edit fields before finalizing.
 */

import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../../theme';
import { Button } from '../ui/Button';
import { PdfPreview } from './PdfPreview';

// ─── Types ─────────────────────────────────────────────────────────

export interface ExportPreviewScreenProps {
  /** The filled PDF bytes to preview. */
  pdfBytes: Uint8Array;
  /** Document title for the header. */
  title: string;
  /** Called when the user taps "Export" / "Save". */
  onExport: () => void;
  /** Called when the user taps "Share". */
  onShare: () => void;
  /** Called when the user taps "Print". */
  onPrint: () => void;
  /** Called when the user wants to go back and edit fields. */
  onEditFields: () => void;
  /** Called when the user taps the back button. */
  onBack: () => void;
  /** Whether an export/share/print action is in progress. */
  isProcessing?: boolean;
}

// ─── Component ─────────────────────────────────────────────────────

export function ExportPreviewScreen({
  pdfBytes,
  title,
  onExport,
  onShare,
  onPrint,
  onEditFields,
  onBack,
  isProcessing = false,
}: ExportPreviewScreenProps) {
  const { theme } = useTheme();
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const handlePdfLoad = useCallback(() => {
    setPdfLoaded(true);
  }, []);

  const handlePdfError = useCallback((error: string) => {
    setPdfError(error);
  }, []);

  const handleEditFields = useCallback(() => {
    Alert.alert(
      'Edit Fields',
      'Go back to edit field values? Your current preview will be regenerated.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', onPress: onEditFields },
      ],
    );
  }, [onEditFields]);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      testID="export-preview-screen"
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.surface,
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing['3xl'],
            paddingBottom: theme.spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.outline,
          },
        ]}
      >
        <Pressable
          onPress={onBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          testID="export-back-button"
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
        </Pressable>
        <View style={styles.headerTitle}>
          <Text
            style={[theme.typography.titleMedium, { color: theme.colors.onSurface }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.onSurfaceVariant }]}>
            Preview
          </Text>
        </View>
        <Pressable
          onPress={handleEditFields}
          hitSlop={12}
          disabled={isProcessing}
          accessibilityRole="button"
          accessibilityLabel="Edit fields"
          testID="export-edit-button"
        >
          <Ionicons
            name="pencil-outline"
            size={22}
            color={isProcessing ? theme.colors.outline : theme.colors.primary}
          />
        </Pressable>
      </View>

      {/* PDF Preview */}
      <View style={styles.previewContainer}>
        <PdfPreview
          pdfBytes={pdfBytes}
          onLoad={handlePdfLoad}
          onError={handlePdfError}
          showControls
        />
      </View>

      {/* Action bar */}
      <View
        style={[
          styles.actionBar,
          {
            backgroundColor: theme.colors.surface,
            borderTopWidth: 1,
            borderTopColor: theme.colors.outline,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            ...theme.elevations.md,
          },
        ]}
        testID="export-action-bar"
      >
        {/* Secondary actions */}
        <View style={styles.secondaryActions}>
          <Pressable
            style={[styles.iconAction, { marginRight: theme.spacing.lg }]}
            onPress={onPrint}
            disabled={!pdfLoaded || isProcessing}
            accessibilityRole="button"
            accessibilityLabel="Print document"
            testID="export-print-button"
          >
            <Ionicons
              name="print-outline"
              size={24}
              color={pdfLoaded && !isProcessing ? theme.colors.onSurface : theme.colors.outline}
            />
            <Text
              style={[
                theme.typography.labelSmall,
                {
                  color:
                    pdfLoaded && !isProcessing
                      ? theme.colors.onSurfaceVariant
                      : theme.colors.outline,
                  marginTop: 2,
                },
              ]}
            >
              Print
            </Text>
          </Pressable>
          <Pressable
            style={styles.iconAction}
            onPress={onShare}
            disabled={!pdfLoaded || isProcessing}
            accessibilityRole="button"
            accessibilityLabel="Share document"
            testID="export-share-button"
          >
            <Ionicons
              name="share-outline"
              size={24}
              color={pdfLoaded && !isProcessing ? theme.colors.onSurface : theme.colors.outline}
            />
            <Text
              style={[
                theme.typography.labelSmall,
                {
                  color:
                    pdfLoaded && !isProcessing
                      ? theme.colors.onSurfaceVariant
                      : theme.colors.outline,
                  marginTop: 2,
                },
              ]}
            >
              Share
            </Text>
          </Pressable>
        </View>

        {/* Primary action */}
        <Button
          label={isProcessing ? 'Saving...' : 'Save PDF'}
          variant="primary"
          size="lg"
          onPress={onExport}
          disabled={!pdfLoaded || isProcessing}
          testID="export-save-button"
          style={{ flex: 1, marginLeft: theme.spacing.lg }}
        />
      </View>

      {/* Error overlay */}
      {pdfError ? (
        <View
          style={[
            styles.errorOverlay,
            { backgroundColor: theme.colors.background, padding: theme.spacing.xl },
          ]}
        >
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
          <Text
            style={[
              theme.typography.bodyLarge,
              { color: theme.colors.error, marginTop: theme.spacing.md, textAlign: 'center' },
            ]}
          >
            Failed to load preview
          </Text>
          <Text
            style={[
              theme.typography.bodySmall,
              {
                color: theme.colors.onSurfaceVariant,
                marginTop: theme.spacing.sm,
                textAlign: 'center',
              },
            ]}
          >
            {pdfError}
          </Text>
          <Button
            label="Go Back"
            variant="outline"
            size="md"
            onPress={onBack}
            style={{ marginTop: theme.spacing.lg }}
            testID="export-error-back-button"
          />
        </View>
      ) : null}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  previewContainer: {
    flex: 1,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconAction: {
    alignItems: 'center',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

ExportPreviewScreen.displayName = 'ExportPreviewScreen';
