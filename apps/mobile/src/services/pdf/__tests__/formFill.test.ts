/**
 * Tests for PDF form-fill service.
 *
 * Uses pdf-lib to create test PDFs with AcroForm fields,
 * then verifies the fill logic, date formatting, and field mapping.
 */

import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import type { DetectedField } from '@fillit/shared';

import {
  fillPdfForm,
  formatDateSA,
  listPdfFormFields,
  mapDetectedFieldsToFormValues,
  type FormFieldValue,
} from '../formFill';

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Create a test PDF with AcroForm fields.
 */
async function createTestPdf(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 400]);
  const form = pdfDoc.getForm();

  // Add text fields
  const firstNameField = form.createTextField('firstName');
  firstNameField.addToPage(page, { x: 50, y: 350, width: 200, height: 20 });

  const lastNameField = form.createTextField('lastName');
  lastNameField.addToPage(page, { x: 50, y: 320, width: 200, height: 20 });

  const dateField = form.createTextField('dateOfBirth');
  dateField.addToPage(page, { x: 50, y: 290, width: 200, height: 20 });

  const emailField = form.createTextField('email');
  emailField.addToPage(page, { x: 50, y: 260, width: 200, height: 20 });

  // Add checkbox
  const consentField = form.createCheckBox('consent');
  consentField.addToPage(page, { x: 50, y: 230, width: 15, height: 15 });

  return await pdfDoc.save();
}

// ─── formatDateSA ─────────────────────────────────────────────────

describe('formatDateSA', () => {
  it('should format ISO date to DD/MM/YYYY', () => {
    expect(formatDateSA('2026-03-29T00:00:00Z')).toBe('29/03/2026');
  });

  it('should format YYYY-MM-DD to DD/MM/YYYY', () => {
    expect(formatDateSA('1990-12-25')).toBe('25/12/1990');
  });

  it('should return already-formatted DD/MM/YYYY unchanged', () => {
    expect(formatDateSA('25/12/1990')).toBe('25/12/1990');
  });

  it('should return empty string for empty input', () => {
    expect(formatDateSA('')).toBe('');
  });

  it('should return unparseable string unchanged', () => {
    expect(formatDateSA('not-a-date')).toBe('not-a-date');
  });

  it('should handle date with timezone', () => {
    const result = formatDateSA('2026-01-15T12:30:00+02:00');
    // The exact day may shift depending on UTC offset handling
    expect(result).toMatch(/^\d{2}\/\d{2}\/2026$/);
  });
});

// ─── mapDetectedFieldsToFormValues ───────────────────────────────

describe('mapDetectedFieldsToFormValues', () => {
  const baseField: DetectedField = {
    id: 'f-1',
    pageId: 'p-1',
    label: 'First Name',
    normalizedLabel: 'first_name',
    fieldType: 'text',
    bounds: { x: 0, y: 0, width: 100, height: 20 },
    matchedProfileField: 'firstName',
    matchConfidence: 0.9,
    value: 'John',
    isConfirmed: true,
    isSignatureField: false,
  };

  it('should map confirmed fields with values', () => {
    const result = mapDetectedFieldsToFormValues([baseField]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      fieldName: 'firstName',
      value: 'John',
      fieldType: 'text',
    });
  });

  it('should use normalizedLabel when matchedProfileField is missing', () => {
    const field = { ...baseField, matchedProfileField: undefined };
    const result = mapDetectedFieldsToFormValues([field]);
    expect(result[0]!.fieldName).toBe('first_name');
  });

  it('should fall back to label when normalizedLabel is also empty', () => {
    const field = { ...baseField, matchedProfileField: undefined, normalizedLabel: '' };
    const result = mapDetectedFieldsToFormValues([field]);
    expect(result[0]!.fieldName).toBe('First Name');
  });

  it('should exclude unconfirmed fields', () => {
    const field = { ...baseField, isConfirmed: false };
    const result = mapDetectedFieldsToFormValues([field]);
    expect(result).toHaveLength(0);
  });

  it('should exclude empty-value fields', () => {
    const field = { ...baseField, value: '' };
    const result = mapDetectedFieldsToFormValues([field]);
    expect(result).toHaveLength(0);
  });

  it('should exclude signature fields', () => {
    const field = { ...baseField, isSignatureField: true };
    const result = mapDetectedFieldsToFormValues([field]);
    expect(result).toHaveLength(0);
  });

  it('should handle multiple fields', () => {
    const fields = [
      baseField,
      {
        ...baseField,
        id: 'f-2',
        label: 'Last Name',
        matchedProfileField: 'lastName',
        value: 'Doe',
      },
      { ...baseField, id: 'f-3', isConfirmed: false, value: 'ignored' },
    ];
    const result = mapDetectedFieldsToFormValues(fields);
    expect(result).toHaveLength(2);
  });
});

// ─── fillPdfForm ─────────────────────────────────────────────────

describe('fillPdfForm', () => {
  it('should fill text fields in a PDF', async () => {
    const pdfBytes = await createTestPdf();
    const fieldValues: FormFieldValue[] = [
      { fieldName: 'firstName', value: 'John', fieldType: 'text' },
      { fieldName: 'lastName', value: 'Doe', fieldType: 'text' },
    ];

    const result = await fillPdfForm(new Uint8Array(pdfBytes), fieldValues);

    expect(result.filledCount).toBe(2);
    expect(result.skippedCount).toBe(0);
    expect(result.skippedFields).toEqual([]);
    expect(result.pdfBytes).toBeInstanceOf(Uint8Array);
    expect(result.pdfBytes.length).toBeGreaterThan(0);

    // Verify the values were actually set by reloading the PDF
    const filledPdf = await PDFDocument.load(result.pdfBytes);
    const form = filledPdf.getForm();
    expect(form.getTextField('firstName').getText()).toBe('John');
    expect(form.getTextField('lastName').getText()).toBe('Doe');
  });

  it('should format date fields in SA format', async () => {
    const pdfBytes = await createTestPdf();
    const fieldValues: FormFieldValue[] = [
      { fieldName: 'dateOfBirth', value: '1990-12-25', fieldType: 'date' },
    ];

    const result = await fillPdfForm(new Uint8Array(pdfBytes), fieldValues);

    expect(result.filledCount).toBe(1);

    const filledPdf = await PDFDocument.load(result.pdfBytes);
    const form = filledPdf.getForm();
    expect(form.getTextField('dateOfBirth').getText()).toBe('25/12/1990');
  });

  it('should check checkboxes', async () => {
    const pdfBytes = await createTestPdf();
    const fieldValues: FormFieldValue[] = [
      { fieldName: 'consent', value: 'true', fieldType: 'checkbox' },
    ];

    const result = await fillPdfForm(new Uint8Array(pdfBytes), fieldValues);

    expect(result.filledCount).toBe(1);

    const filledPdf = await PDFDocument.load(result.pdfBytes);
    const form = filledPdf.getForm();
    expect(form.getCheckBox('consent').isChecked()).toBe(true);
  });

  it('should uncheck checkboxes for falsy values', async () => {
    const pdfBytes = await createTestPdf();

    // First check it
    const preResult = await fillPdfForm(new Uint8Array(pdfBytes), [
      { fieldName: 'consent', value: 'yes', fieldType: 'checkbox' },
    ]);

    // Then uncheck it
    const result = await fillPdfForm(preResult.pdfBytes, [
      { fieldName: 'consent', value: 'no', fieldType: 'checkbox' },
    ]);

    const filledPdf = await PDFDocument.load(result.pdfBytes);
    const form = filledPdf.getForm();
    expect(form.getCheckBox('consent').isChecked()).toBe(false);
  });

  it('should skip fields not found in the PDF', async () => {
    const pdfBytes = await createTestPdf();
    const fieldValues: FormFieldValue[] = [
      { fieldName: 'firstName', value: 'John', fieldType: 'text' },
      { fieldName: 'nonExistentField', value: 'ignored', fieldType: 'text' },
    ];

    const result = await fillPdfForm(new Uint8Array(pdfBytes), fieldValues);

    expect(result.filledCount).toBe(1);
    expect(result.skippedCount).toBe(1);
    expect(result.skippedFields).toEqual(['nonExistentField']);
  });

  it('should handle empty field values list', async () => {
    const pdfBytes = await createTestPdf();
    const result = await fillPdfForm(new Uint8Array(pdfBytes), []);

    expect(result.filledCount).toBe(0);
    expect(result.skippedCount).toBe(0);
    expect(result.pdfBytes.length).toBeGreaterThan(0);
  });

  it('should flatten the form when requested', async () => {
    const pdfBytes = await createTestPdf();
    const fieldValues: FormFieldValue[] = [
      { fieldName: 'firstName', value: 'John', fieldType: 'text' },
    ];

    const result = await fillPdfForm(new Uint8Array(pdfBytes), fieldValues, { flatten: true });

    expect(result.filledCount).toBe(1);

    // After flattening, fields should not be editable
    const filledPdf = await PDFDocument.load(result.pdfBytes);
    const form = filledPdf.getForm();
    expect(form.getFields()).toHaveLength(0);
  });

  it('should handle various checkbox truthy values', async () => {
    const truthyValues = ['true', 'yes', '1', 'on', 'checked', 'x', 'YES', 'True'];
    const pdfBytes = await createTestPdf();

    for (const val of truthyValues) {
      const result = await fillPdfForm(new Uint8Array(pdfBytes), [
        { fieldName: 'consent', value: val, fieldType: 'checkbox' },
      ]);
      const pdf = await PDFDocument.load(result.pdfBytes);
      expect(pdf.getForm().getCheckBox('consent').isChecked()).toBe(true);
    }
  });

  it('should handle checkbox falsy values', async () => {
    const falsyValues = ['false', 'no', '0', 'off', '', 'anything-else'];
    const pdfBytes = await createTestPdf();

    for (const val of falsyValues) {
      const result = await fillPdfForm(new Uint8Array(pdfBytes), [
        { fieldName: 'consent', value: val, fieldType: 'checkbox' },
      ]);
      const pdf = await PDFDocument.load(result.pdfBytes);
      expect(pdf.getForm().getCheckBox('consent').isChecked()).toBe(false);
    }
  });
});

// ─── listPdfFormFields ────────────────────────────────────────────

describe('listPdfFormFields', () => {
  it('should list all form fields', async () => {
    const pdfBytes = await createTestPdf();
    const fields = await listPdfFormFields(new Uint8Array(pdfBytes));

    expect(fields).toHaveLength(5);
    const names = fields.map((f) => f.name);
    expect(names).toContain('firstName');
    expect(names).toContain('lastName');
    expect(names).toContain('dateOfBirth');
    expect(names).toContain('email');
    expect(names).toContain('consent');
  });

  it('should identify field types', async () => {
    const pdfBytes = await createTestPdf();
    const fields = await listPdfFormFields(new Uint8Array(pdfBytes));

    const consent = fields.find((f) => f.name === 'consent');
    expect(consent?.type).toBe('PDFCheckBox');

    const firstName = fields.find((f) => f.name === 'firstName');
    expect(firstName?.type).toBe('PDFTextField');
  });

  it('should return empty array for PDF without forms', async () => {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage();
    const pdfBytes = await pdfDoc.save();

    const fields = await listPdfFormFields(new Uint8Array(pdfBytes));
    expect(fields).toHaveLength(0);
  });
});
