/**
 * PDF export actions: save, share, and print.
 *
 * Provides the final export pipeline for completed PDFs:
 * - Save to device storage via expo-file-system
 * - Share via system share sheet (WhatsApp, email, etc.)
 * - Print via system print dialog
 */

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

// ─── Types ─────────────────────────────────────────────────────────

export interface SaveResult {
  /** URI of the saved file. */
  uri: string;
  /** Filename used. */
  filename: string;
}

export interface ExportActionsConfig {
  /** The PDF bytes to export. */
  pdfBytes: Uint8Array;
  /** The document title (used for filename). */
  title: string;
  /** Document ID (used for organizing files). */
  documentId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────

/** Sanitize a title into a safe filename. */
function toSafeFilename(title: string): string {
  return (
    title
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 100) || 'document'
  );
}

/** Write PDF bytes to a temporary file and return its URI. */
function writeTempPdf(pdfBytes: Uint8Array, filename: string): string {
  const tempDir = new File(Paths.cache, 'pdf-export');
  if (!tempDir.exists) {
    tempDir.create();
  }

  const tempFile = new File(tempDir, filename);
  if (tempFile.exists) {
    tempFile.delete();
  }

  tempFile.write(pdfBytes);
  return tempFile.uri;
}

/** Write PDF bytes to the document's PDF directory for permanent storage. */
function writePermanentPdf(pdfBytes: Uint8Array, documentId: string, filename: string): string {
  const pdfDir = new File(Paths.document, `documents/${documentId}/pdf`);
  if (!pdfDir.exists) {
    pdfDir.create();
  }

  const pdfFile = new File(pdfDir, filename);
  if (pdfFile.exists) {
    pdfFile.delete();
  }

  pdfFile.write(pdfBytes);
  return pdfFile.uri;
}

// ─── Actions ──────────────────────────────────────────────────────

/**
 * Save a PDF to the device's document storage.
 *
 * Saves to `documents/{documentId}/pdf/{filename}.pdf` under the
 * app's document directory for persistent storage.
 */
export async function savePdf(config: ExportActionsConfig): Promise<SaveResult> {
  const filename = `${toSafeFilename(config.title)}.pdf`;
  const uri = writePermanentPdf(config.pdfBytes, config.documentId, filename);
  return { uri, filename };
}

/**
 * Share a PDF via the system share sheet.
 *
 * Writes the PDF to a temp file and opens the native share dialog,
 * which supports WhatsApp, email, AirDrop, Google Drive, etc.
 */
export async function sharePdf(config: ExportActionsConfig): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new ExportError('Sharing is not available on this device');
  }

  const filename = `${toSafeFilename(config.title)}.pdf`;
  const tempUri = writeTempPdf(config.pdfBytes, filename);

  await Sharing.shareAsync(tempUri, {
    mimeType: 'application/pdf',
    dialogTitle: `Share ${config.title}`,
    UTI: 'com.adobe.pdf',
  });
}

/**
 * Print a PDF via the system print dialog.
 *
 * Writes the PDF to a temp file and opens the native print dialog.
 */
export async function printPdf(config: ExportActionsConfig): Promise<void> {
  const filename = `${toSafeFilename(config.title)}.pdf`;
  const tempUri = writeTempPdf(config.pdfBytes, filename);

  await Print.printAsync({ uri: tempUri });
}

// ─── Error ────────────────────────────────────────────────────────

export class ExportError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'ExportError';
    this.cause = cause;
  }
}
