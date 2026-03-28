/**
 * Field detection progress screen component.
 *
 * Shows AI analysis progress with per-page status indicators,
 * an overall progress bar, detection method indicator (cloud/offline),
 * cancel button, and error recovery.
 */

import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../theme';
import { Button } from '../ui/Button';
import type { DetectionPageInfo, UseFieldDetectionReturn } from '../../hooks/useFieldDetection';

// ─── Types ─────────────────────────────────────────────────────────

export interface FieldDetectionProgressProps {
  /** Detection state from useFieldDetection hook. */
  detection: UseFieldDetectionReturn;
  /** Called when the user wants to proceed to field review. */
  onContinue?: () => void;
}

// ─── Helpers ───────────────────────────────────────────────────────

function getStatusIcon(status: DetectionPageInfo['status'], theme: any) {
  switch (status) {
    case 'pending':
      return <Ionicons name="ellipse-outline" size={18} color={theme.colors.onSurfaceVariant} />;
    case 'processing':
      return <ActivityIndicator size="small" color={theme.colors.primary} />;
    case 'complete':
      return <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />;
    case 'error':
      return <Ionicons name="alert-circle" size={18} color={theme.colors.error} />;
  }
}

// ─── Component ─────────────────────────────────────────────────────

export function FieldDetectionProgress({ detection, onContinue }: FieldDetectionProgressProps) {
  const { theme } = useTheme();

  const {
    pages,
    progress,
    isProcessing,
    isComplete,
    method,
    reducedAccuracy,
    error,
    start,
    cancel,
  } = detection;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      testID="field-detection-progress"
    >
      {/* Title */}
      <Text
        style={[
          theme.typography.headlineMedium,
          { color: theme.colors.onBackground, textAlign: 'center', marginBottom: theme.spacing.lg },
        ]}
      >
        {isComplete ? 'Detection Complete' : 'Analyzing Document'}
      </Text>

      {/* Method indicator */}
      {method ? (
        <View
          style={[
            styles.methodBadge,
            {
              backgroundColor: reducedAccuracy
                ? theme.colors.warningLight
                : theme.colors.successLight,
              borderRadius: theme.radii.full,
              marginBottom: theme.spacing.lg,
            },
          ]}
          testID="field-detection-method"
        >
          <Ionicons
            name={method === 'cloud' ? 'cloud' : 'phone-portrait'}
            size={16}
            color={reducedAccuracy ? theme.colors.warning : theme.colors.success}
          />
          <Text
            style={[
              theme.typography.labelMedium,
              {
                color: reducedAccuracy ? theme.colors.warning : theme.colors.success,
                marginLeft: theme.spacing.xs,
              },
            ]}
          >
            {method === 'cloud' ? 'Cloud AI' : 'Offline Mode'}
          </Text>
        </View>
      ) : null}

      {/* Reduced accuracy warning */}
      {reducedAccuracy && isComplete ? (
        <View
          style={[
            styles.warningBox,
            {
              backgroundColor: theme.colors.warningLight,
              borderRadius: theme.radii.md,
              marginBottom: theme.spacing.lg,
            },
          ]}
          testID="field-detection-warning"
          accessibilityRole="alert"
        >
          <Ionicons name="warning" size={20} color={theme.colors.warning} />
          <Text
            style={[
              theme.typography.bodySmall,
              { color: theme.colors.onBackground, marginLeft: theme.spacing.sm, flex: 1 },
            ]}
          >
            Offline detection has reduced accuracy. Review fields carefully.
          </Text>
        </View>
      ) : null}

      {/* Progress bar */}
      <View
        style={[
          styles.progressTrack,
          { backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.radii.full },
        ]}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      >
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.round(progress * 100)}%`,
              backgroundColor: error ? theme.colors.error : theme.colors.primary,
              borderRadius: theme.radii.full,
            },
          ]}
          testID="field-detection-progress-bar"
        />
      </View>
      <Text
        style={[
          theme.typography.labelMedium,
          {
            color: theme.colors.onSurfaceVariant,
            textAlign: 'center',
            marginTop: theme.spacing.sm,
            marginBottom: theme.spacing.xl,
          },
        ]}
      >
        {error ? 'Error' : isComplete ? '100%' : `${Math.round(progress * 100)}%`}
      </Text>

      {/* Per-page status */}
      <View style={[styles.pageList, { marginBottom: theme.spacing.xl }]}>
        {pages.map((page) => (
          <View
            key={page.pageId}
            style={[styles.pageRow, { paddingVertical: theme.spacing.sm }]}
            testID={`field-detection-page-${page.pageNumber}`}
          >
            {getStatusIcon(page.status, theme)}
            <Text
              style={[
                theme.typography.bodyMedium,
                { color: theme.colors.onBackground, marginLeft: theme.spacing.md, flex: 1 },
              ]}
            >
              Page {page.pageNumber}
            </Text>
            {page.status === 'complete' && page.fieldCount !== undefined ? (
              <Text
                style={[theme.typography.labelMedium, { color: theme.colors.onSurfaceVariant }]}
              >
                {page.fieldCount} field{page.fieldCount !== 1 ? 's' : ''}
              </Text>
            ) : null}
            {page.status === 'error' ? (
              <Text style={[theme.typography.labelMedium, { color: theme.colors.error }]}>
                Failed
              </Text>
            ) : null}
          </View>
        ))}
      </View>

      {/* Error message */}
      {error ? (
        <Text
          style={[
            theme.typography.bodyMedium,
            { color: theme.colors.error, textAlign: 'center', marginBottom: theme.spacing.lg },
          ]}
          testID="field-detection-error"
          accessibilityRole="alert"
        >
          {error}
        </Text>
      ) : null}

      {/* Actions */}
      <View style={styles.actions}>
        {isProcessing ? (
          <Button
            label="Cancel"
            variant="outline"
            onPress={cancel}
            fullWidth
            testID="field-detection-cancel"
          />
        ) : error ? (
          <Button
            label="Retry"
            variant="primary"
            onPress={start}
            fullWidth
            testID="field-detection-retry"
          />
        ) : isComplete ? (
          <Button
            label="Review Fields"
            variant="primary"
            onPress={onContinue}
            fullWidth
            testID="field-detection-continue"
          />
        ) : null}
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  progressTrack: {
    height: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  pageList: {},
  pageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actions: {},
});

FieldDetectionProgress.displayName = 'FieldDetectionProgress';
