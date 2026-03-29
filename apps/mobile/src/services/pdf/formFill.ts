/**
 * PDF form-fill service using pdf-lib.
 *
 * Fills AcroForm fields in existing form-fillable PDFs based on
 * detected/confirmed field values. Supports text, date, checkbox,
 * and number fields. Dates are formatted in SA format (DD/MM/YYYY).
 */

import { PDFDocument, PDFCheckBox, PDFTextField, PDFRadioGroup, PDFDropdown } from 'pdf-lib';
import type { DetectedField, DetectedFieldType } from '@fillit/shared';

// ─── Types ─────────────────────────────────────────────────────────

/** A field value to fill into the PDF form. */
export interface FormFieldValue {
  /** The AcroForm field name in the PDF. */
  fieldName: string;
  /** The value to set. */
  value: string;
  /** The detected field type (influences formatting). */
  fieldType: DetectedFieldType;
}

/** Options for the form-fill operation. */
export interface FormFillOptions {
  /** Whether to flatten the form after filling (makes fields non-editable). @default false */
  flatten?: boolean;
}

/** Result of the form-fill operation. */
export interface FormFillResult {
  /** The filled PDF as a Uint8Array. */
  pdfBytes: Uint8Array;
  /** Number of fields that were successfully filled. */
  filledCount: number;
  /** Number of fields that were skipped (not found in PDF). */
  skippedCount: number;
  /** Field names that were skipped. */
  skippedFields: string[];
}

// ─── Date Formatting ──────────────────────────────────────────────

/**
 * Format a date string to South African format (DD/MM/YYYY).
 *
 * Accepts ISO 8601 dates, YYYY-MM-DD, MM/DD/YYYY, and other
 * common date formats. Returns the original string if parsing fails.
 */
export function formatDateSA(dateStr: string): string {
  if (!dateStr) return dateStr;

  // Try parsing as a Date
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Already in DD/MM/YYYY format?
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    return dateStr;
  }

  return dateStr;
}

// ─── Field Mapping ────────────────────────────────────────────────

/**
 * Convert detected fields to form field values.
 *
 * Only includes fields that have a value and are confirmed.
 * Signature fields are excluded (handled separately).
 */
export function mapDetectedFieldsToFormValues(fields: DetectedField[]): FormFieldValue[] {
  return fields
    .filter((f) => f.value && f.isConfirmed && !f.isSignatureField)
    .map((f) => ({
      fieldName: f.matchedProfileField || f.normalizedLabel || f.label,
      value: f.value,
      fieldType: f.fieldType,
    }));
}

// ─── Form Fill ────────────────────────────────────────────────────

/**
 * Fill AcroForm fields in a PDF document.
 *
 * @param pdfBytes - The source PDF file as bytes.
 * @param fieldValues - The field values to fill.
 * @param options - Optional fill options.
 * @returns The filled PDF bytes and fill statistics.
 */
export async function fillPdfForm(
  pdfBytes: Uint8Array,
  fieldValues: FormFieldValue[],
  options: FormFillOptions = {},
): Promise<FormFillResult> {
  const pdfDoc = await PDFDocument.load(pdfBytes, {
    ignoreEncryption: true,
  });

  const form = pdfDoc.getForm();
  let filledCount = 0;
  const skippedFields: string[] = [];

  for (const fv of fieldValues) {
    try {
      const field = form.getField(fv.fieldName);

      if (field instanceof PDFTextField) {
        const value = fv.fieldType === 'date' ? formatDateSA(fv.value) : fv.value;
        field.setText(value);
        filledCount++;
      } else if (field instanceof PDFCheckBox) {
        const isChecked = isCheckboxChecked(fv.value);
        if (isChecked) {
          field.check();
        } else {
          field.uncheck();
        }
        filledCount++;
      } else if (field instanceof PDFRadioGroup) {
        field.select(fv.value);
        filledCount++;
      } else if (field instanceof PDFDropdown) {
        field.select(fv.value);
        filledCount++;
      } else {
        // Unknown field type — skip
        skippedFields.push(fv.fieldName);
      }
    } catch {
      // Field not found in the form
      skippedFields.push(fv.fieldName);
    }
  }

  if (options.flatten) {
    form.flatten();
  }

  const resultBytes = await pdfDoc.save();

  return {
    pdfBytes: resultBytes,
    filledCount,
    skippedCount: skippedFields.length,
    skippedFields,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Determine if a string value represents a checked checkbox.
 */
function isCheckboxChecked(value: string): boolean {
  const normalized = value.toLowerCase().trim();
  return ['true', 'yes', '1', 'on', 'checked', 'x'].includes(normalized);
}

/**
 * List all AcroForm field names in a PDF.
 *
 * Useful for debugging and matching detected fields to PDF form fields.
 */
export async function listPdfFormFields(
  pdfBytes: Uint8Array,
): Promise<Array<{ name: string; type: string }>> {
  const pdfDoc = await PDFDocument.load(pdfBytes, {
    ignoreEncryption: true,
  });

  const form = pdfDoc.getForm();
  const fields = form.getFields();

  return fields.map((f) => ({
    name: f.getName(),
    type: f.constructor.name,
  }));
}
