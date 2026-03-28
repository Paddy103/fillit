/**
 * OCR Progress Screen (S-44)
 *
 * Displays real-time progress as each document page is processed
 * through OCR. Shows per-page status (pending/processing/success/error),
 * overall progress bar, and auto-advances to the next pipeline stage
 * on completion.
 */

import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme } from '../../src/theme';
import {
  Button,
  BodyLarge,
  BodyMedium,
  BodySmall,
  TitleLarge,
  Card,
} from '../../src/components/ui';
import { ScreenHeader } from '../../src/components/profile/ScreenHeader';
import {
  useOcrProgress,
  type PageOcrInfo,
  type PageOcrStatus,
} from '../../src/hooks/useOcrProgress';

export default function OcrProgressScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();

  const { pages, progress, isProcessing, isComplete, cancel } = useOcrProgress({
    documentId: id ?? '',
    onComplete: () => {
      // Auto-advance to home for now — field detection screen comes in Phase 3
      setTimeout(() => {
        router.replace('/(tabs)/home');
      }, 1500);
    },
  });

  const handleCancel = () => {
    cancel();
    router.back();
  };

  if (!id) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <ScreenHeader title="Processing" onBack={() => router.back()} />
        <View style={styles.center}>
          <BodyLarge color="secondary">No document ID provided.</BodyLarge>
        </View>
      </View>
    );
  }

  const progressPercent = Math.round(progress * 100);
  const completedCount = pages.filter(
    (p) => p.status === 'success' || p.status === 'no_text',
  ).length;
  const errorCount = pages.filter((p) => p.status === 'error').length;

  return (
    <View
      style={[styles.root, { backgroundColor: theme.colors.background }]}
      testID="ocr-progress-screen"
    >
      <ScreenHeader title="Processing OCR" onBack={handleCancel} />

      {/* Overall progress section */}
      <View style={[styles.progressSection, { padding: theme.spacing.lg }]}>
        <View style={styles.progressHeader}>
          <TitleLarge>{isComplete ? 'Complete' : 'Extracting text...'}</TitleLarge>
          <BodyLarge color="primary">{progressPercent}%</BodyLarge>
        </View>

        {/* Progress bar */}
        <View
          style={[
            styles.progressTrack,
            {
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.radii.full,
              marginTop: theme.spacing.sm,
            },
          ]}
        >
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: isComplete ? theme.colors.success : theme.colors.primary,
                borderRadius: theme.radii.full,
                width: `${progressPercent}%` as `${number}%`,
              },
            ]}
          />
        </View>

        <BodySmall color="secondary" style={{ marginTop: theme.spacing.xs }}>
          {completedCount} of {pages.length} pages processed
          {errorCount > 0 ? ` (${errorCount} failed)` : ''}
        </BodySmall>
      </View>

      {/* Per-page status list */}
      <FlatList
        data={pages}
        keyExtractor={(page) => page.pageId}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg }}
        renderItem={({ item }) => <PageStatusCard page={item} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <BodyMedium color="secondary" style={{ marginTop: theme.spacing.md }}>
              Preparing pages...
            </BodyMedium>
          </View>
        }
      />

      {/* Bottom actions */}
      <View
        style={[
          styles.footer,
          {
            padding: theme.spacing.lg,
            backgroundColor: theme.colors.surface,
            borderTopWidth: 1,
            borderTopColor: theme.colors.outline,
          },
        ]}
      >
        {isComplete ? (
          <Button
            label="Continue"
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => router.replace('/(tabs)/home')}
            testID="ocr-continue-button"
          />
        ) : (
          <Button
            label="Cancel"
            variant="outline"
            size="lg"
            fullWidth
            onPress={handleCancel}
            disabled={!isProcessing}
            testID="ocr-cancel-button"
          />
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Page status card
// ---------------------------------------------------------------------------

function PageStatusCard({ page }: { page: PageOcrInfo }) {
  const { theme } = useTheme();

  return (
    <Card elevation="none" bordered padding="md" style={{ marginBottom: theme.spacing.sm }}>
      <View style={styles.pageRow}>
        <StatusIcon status={page.status} />
        <View style={[styles.pageInfo, { marginLeft: theme.spacing.md }]}>
          <BodyMedium>Page {page.pageNumber}</BodyMedium>
          {page.status === 'success' && page.textPreview ? (
            <BodySmall color="secondary" numberOfLines={1}>
              {page.textPreview}
            </BodySmall>
          ) : page.status === 'error' && page.error ? (
            <BodySmall color="error" numberOfLines={1}>
              {page.error}
            </BodySmall>
          ) : page.status === 'no_text' ? (
            <BodySmall color="warning">No text detected</BodySmall>
          ) : page.status === 'processing' ? (
            <BodySmall color="secondary">Processing...</BodySmall>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

PageStatusCard.displayName = 'PageStatusCard';

function StatusIcon({ status }: { status: PageOcrStatus }) {
  const { theme } = useTheme();

  switch (status) {
    case 'processing':
      return <ActivityIndicator size="small" color={theme.colors.primary} />;
    case 'success':
      return <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />;
    case 'error':
      return <Ionicons name="alert-circle" size={24} color={theme.colors.error} />;
    case 'no_text':
      return <Ionicons name="warning" size={24} color={theme.colors.warning} />;
    default:
      return <Ionicons name="ellipse-outline" size={24} color={theme.colors.outlineVariant} />;
  }
}

StatusIcon.displayName = 'StatusIcon';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  progressSection: {
    // padding applied via style prop
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  progressTrack: {
    height: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  footer: {
    // padding applied via style prop
  },
  pageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageInfo: {
    flex: 1,
  },
});
