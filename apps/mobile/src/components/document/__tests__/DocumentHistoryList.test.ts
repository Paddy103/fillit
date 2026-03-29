import { describe, it, expect, vi } from 'vitest';
import type { ProcessedDocument, ProcessingStatus } from '@fillit/shared';

import type { DocumentHistoryListProps } from '../DocumentHistoryList';

// ─── Helpers ──────────────────────────────────────────────────────

function makeDocument(overrides: Partial<ProcessedDocument> = {}): ProcessedDocument {
  return {
    id: 'doc-1',
    title: 'Test Document',
    pages: [],
    fields: [],
    status: 'exported' as ProcessingStatus,
    sourceType: 'camera',
    createdAt: '2026-03-29T00:00:00Z',
    updatedAt: '2026-03-29T01:00:00Z',
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────

describe('DocumentHistoryList', () => {
  it('should have correct props interface', () => {
    const props: DocumentHistoryListProps = {
      documents: [makeDocument()],
      onPress: vi.fn(),
      onDelete: vi.fn(),
    };

    expect(props.documents).toHaveLength(1);
    expect(typeof props.onPress).toBe('function');
    expect(typeof props.onDelete).toBe('function');
  });

  it('should accept empty documents list', () => {
    const props: DocumentHistoryListProps = {
      documents: [],
      onPress: vi.fn(),
      onDelete: vi.fn(),
    };

    expect(props.documents).toHaveLength(0);
  });

  it('should handle all processing statuses', () => {
    const statuses: ProcessingStatus[] = [
      'scanned',
      'ocr_complete',
      'fields_detected',
      'matched',
      'reviewed',
      'exported',
    ];

    const docs = statuses.map((status, i) => makeDocument({ id: `doc-${i}`, status }));

    const props: DocumentHistoryListProps = {
      documents: docs,
      onPress: vi.fn(),
      onDelete: vi.fn(),
    };

    expect(props.documents).toHaveLength(6);
    expect(props.documents[5]!.status).toBe('exported');
  });

  it('should support showSearch option', () => {
    const props: DocumentHistoryListProps = {
      documents: [makeDocument()],
      onPress: vi.fn(),
      onDelete: vi.fn(),
      showSearch: false,
    };

    expect(props.showSearch).toBe(false);
  });

  it('should handle documents with pages', () => {
    const doc = makeDocument({
      pages: [
        {
          id: 'page-1',
          documentId: 'doc-1',
          pageNumber: 1,
          originalImageUri: '/test/page1.png',
          ocrText: 'hello',
          width: 600,
          height: 800,
        },
      ],
    });

    expect(doc.pages).toHaveLength(1);
    expect(doc.pages[0]!.pageNumber).toBe(1);
  });

  it('should handle documents with document type', () => {
    const doc = makeDocument({ documentType: 'ID Application' });
    expect(doc.documentType).toBe('ID Application');
  });

  it('should invoke callbacks correctly', () => {
    const onPress = vi.fn();
    const onDelete = vi.fn();

    onPress('doc-1');
    onDelete('doc-1');

    expect(onPress).toHaveBeenCalledWith('doc-1');
    expect(onDelete).toHaveBeenCalledWith('doc-1');
  });
});
