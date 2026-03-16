/**
 * Document processing types for the FillIt application.
 * Covers AI-detected fields, document pages, and processed documents.
 */

import type { BoundingBox } from './index.js';

/** Field type for AI-detected form fields. */
export type DetectedFieldType = 'text' | 'date' | 'checkbox' | 'signature' | 'initial' | 'number';

/** Processing pipeline status for a document. */
export type ProcessingStatus =
  | 'scanned'
  | 'ocr_complete'
  | 'fields_detected'
  | 'matched'
  | 'reviewed'
  | 'exported';

/** How the document was acquired. */
export type DocumentSourceType = 'camera' | 'import';

/** A field detected by AI on a document page. */
export interface DetectedField {
  id: string;
  pageId: string;
  label: string;
  normalizedLabel: string;
  fieldType: DetectedFieldType;
  bounds: BoundingBox;
  matchedProfileField?: string;
  matchedProfileId?: string;
  matchConfidence: number;
  value: string;
  originalValue?: string;
  isConfirmed: boolean;
  isSignatureField: boolean;
  signatureId?: string;
}

/** A single page within a processed document. */
export interface DocumentPage {
  id: string;
  documentId: string;
  pageNumber: number;
  originalImageUri: string;
  processedImageUri?: string;
  ocrText: string;
  width: number;
  height: number;
}

/** A fully processed document with pages and detected fields. */
export interface ProcessedDocument {
  id: string;
  title: string;
  pages: DocumentPage[];
  fields: DetectedField[];
  status: ProcessingStatus;
  sourceType: DocumentSourceType;
  documentType?: string;
  createdAt: string;
  updatedAt: string;
  exportedPdfUri?: string;
}
