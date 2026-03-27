/**
 * Individual document card for the recent documents list.
 *
 * Shows the document title, creation date, page count, and a
 * status chip. Pressable to navigate to the document detail.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ProcessedDocument } from '@fillit/shared';

import { useTheme } from '../../theme';
import { BodySmall, TitleMedium, PressableCard, Chip } from '../ui';

import { formatStatus, getStatusChipColor } from './RecentDocuments';

/** Props for the DocumentCard component */
export interface DocumentCardProps {
  /** The document to render */
  readonly document: ProcessedDocument;
  /** Called when the card is pressed */
  readonly onPress?: (id: string) => void;
}

/** Format an ISO date string for display */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Pressable card displaying a single document summary.
 *
 * @example
 * ```tsx
 * <DocumentCard
 *   document={doc}
 *   onPress={(id) => router.push(`/document/${id}`)}
 * />
 * ```
 */
export function DocumentCard({ document, onPress }: DocumentCardProps) {
  const { theme } = useTheme();
  const pageCount = document.pages.length;

  return (
    <PressableCard
      elevation="sm"
      padding="lg"
      onPress={() => onPress?.(document.id)}
      accessibilityLabel={`Document: ${document.title}`}
      testID={`document-card-${document.id}`}
    >
      <TitleMedium numberOfLines={1}>{document.title}</TitleMedium>

      <View style={[styles.footer, { marginTop: theme.spacing.sm }]}>
        <View style={styles.meta}>
          <BodySmall color="secondary">{formatDate(document.createdAt)}</BodySmall>
          <BodySmall color="secondary">
            {' \u00B7 '}
            {pageCount} {pageCount === 1 ? 'page' : 'pages'}
          </BodySmall>
        </View>

        <Chip
          label={formatStatus(document.status)}
          color={getStatusChipColor(document.status)}
          variant="filled"
        />
      </View>
    </PressableCard>
  );
}

DocumentCard.displayName = 'DocumentCard';

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
});
