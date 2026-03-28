/**
 * Scan Review Screen (S-40)
 *
 * Displays scanned page thumbnails in a reorderable list.
 * Users can delete pages, retake individual pages, reorder,
 * and confirm to advance to the OCR stage.
 */

import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme } from '../../src/theme';
import { Button, BodyLarge } from '../../src/components/ui';
import { ScreenHeader } from '../../src/components/profile/ScreenHeader';
import { PageThumbnail } from '../../src/components/scan';
import { useScanReview } from '../../src/hooks/useScanReview';

export default function ScanReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();

  const { pages, isBusy, movePageUp, movePageDown, removePage, retakePage, confirm, canConfirm } =
    useScanReview({
      documentId: id ?? '',
      onConfirm: (docId) => {
        router.push(`/ocr/${docId}` as never);
      },
    });

  if (!id) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <ScreenHeader title="Review Scan" onBack={() => router.back()} />
        <View style={styles.center}>
          <BodyLarge color="secondary">No document ID provided.</BodyLarge>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.root, { backgroundColor: theme.colors.background }]}
      testID="scan-review-screen"
    >
      <ScreenHeader title="Review Scan" onBack={() => router.back()} />

      {pages.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <BodyLarge color="secondary" style={{ marginTop: theme.spacing.md }}>
            Loading pages...
          </BodyLarge>
        </View>
      ) : (
        <>
          <FlatList
            data={pages}
            keyExtractor={(page) => page.id}
            contentContainerStyle={{ padding: theme.spacing.lg }}
            renderItem={({ item: page }) => (
              <PageThumbnail
                imageUri={page.originalImageUri}
                pageNumber={page.pageNumber}
                totalPages={pages.length}
                disabled={isBusy}
                onMoveUp={() => movePageUp(page.id)}
                onMoveDown={() => movePageDown(page.id)}
                onDelete={() => removePage(page.id)}
                onRetake={() => retakePage(page.id)}
              />
            )}
          />

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
            <BodyLarge color="secondary" align="center" style={{ marginBottom: theme.spacing.sm }}>
              {pages.length} {pages.length === 1 ? 'page' : 'pages'} scanned
            </BodyLarge>
            <Button
              label={isBusy ? 'Processing...' : 'Confirm & Continue'}
              variant="primary"
              size="lg"
              fullWidth
              onPress={confirm}
              disabled={!canConfirm || isBusy}
              loading={isBusy}
              accessibilityLabel="Confirm scan and proceed to processing"
              testID="confirm-scan-button"
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    alignItems: 'center',
  },
});
