/**
 * Recent documents list for the home dashboard.
 *
 * Displays the last 5 documents as pressable cards with a title,
 * date, and status chip. Shows the EmptyDashboard component when
 * there are no documents, and skeleton placeholders while loading.
 */

import React from 'react';
import { View } from 'react-native';
import type { ProcessedDocument, ProcessingStatus } from '@fillit/shared';

import { useTheme } from '../../theme';
import { HeadingMedium } from '../ui';
import { SkeletonDocumentCard } from '../skeleton';

import { DocumentCard } from './DocumentCard';
import { EmptyDashboard } from './EmptyDashboard';

/** Props for the RecentDocuments component */
export interface RecentDocumentsProps {
  /** Documents sorted by most recent first */
  readonly documents: ProcessedDocument[];
  /** Whether the document store is still loading */
  readonly isLoading: boolean;
  /** Called when a document card is pressed */
  readonly onDocumentPress?: (id: string) => void;
}

/** Maximum number of recent documents to display */
const MAX_RECENT = 5;

/** Map processing status to a chip color */
export function getStatusChipColor(
  status: ProcessingStatus,
): 'default' | 'primary' | 'success' | 'warning' | 'info' {
  const map: Record<ProcessingStatus, 'default' | 'primary' | 'success' | 'warning' | 'info'> = {
    scanned: 'default',
    ocr_complete: 'info',
    fields_detected: 'info',
    matched: 'primary',
    reviewed: 'warning',
    exported: 'success',
  };
  return map[status];
}

/** Format a status value for display */
export function formatStatus(status: ProcessingStatus): string {
  const labels: Record<ProcessingStatus, string> = {
    scanned: 'Scanned',
    ocr_complete: 'OCR Done',
    fields_detected: 'Fields Found',
    matched: 'Matched',
    reviewed: 'Reviewed',
    exported: 'Exported',
  };
  return labels[status];
}

/**
 * Recent documents section with heading, cards, and empty/loading states.
 *
 * @example
 * ```tsx
 * <RecentDocuments
 *   documents={recentDocs}
 *   isLoading={isLoading}
 *   onDocumentPress={(id) => router.push(`/document/${id}`)}
 * />
 * ```
 */
export function RecentDocuments({ documents, isLoading, onDocumentPress }: RecentDocumentsProps) {
  const { theme } = useTheme();
  const recent = documents.slice(0, MAX_RECENT);

  return (
    <View style={{ marginTop: theme.spacing['2xl'] }} testID="recent-documents">
      <HeadingMedium style={{ marginBottom: theme.spacing.md }}>Recent Documents</HeadingMedium>

      {isLoading ? (
        <LoadingSkeleton />
      ) : recent.length === 0 ? (
        <EmptyDashboard />
      ) : (
        <DocumentList documents={recent} onDocumentPress={onDocumentPress} />
      )}
    </View>
  );
}

RecentDocuments.displayName = 'RecentDocuments';

// ---------------------------------------------------------------------------
// Sub-components (keep functions under 80 lines)
// ---------------------------------------------------------------------------

/** Skeleton loading state for the document list */
function LoadingSkeleton() {
  const { theme } = useTheme();

  return (
    <View style={{ gap: theme.spacing.md }}>
      <SkeletonDocumentCard />
      <SkeletonDocumentCard />
    </View>
  );
}

LoadingSkeleton.displayName = 'LoadingSkeleton';

/** Rendered list of document cards */
function DocumentList({
  documents,
  onDocumentPress,
}: {
  documents: ProcessedDocument[];
  onDocumentPress?: (id: string) => void;
}) {
  const { theme } = useTheme();

  return (
    <View style={{ gap: theme.spacing.md }}>
      {documents.map((doc) => (
        <DocumentCard key={doc.id} document={doc} onPress={onDocumentPress} />
      ))}
    </View>
  );
}

DocumentList.displayName = 'DocumentList';
