import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — vi.hoisted() ensures variables are available inside vi.mock factories
// ---------------------------------------------------------------------------

const { mockRunQuery, mockGetFirst, mockGetAll, mockWithTransaction, mockEncrypt, mockDecrypt } =
  vi.hoisted(() => {
    return {
      mockRunQuery: vi.fn(),
      mockGetFirst: vi.fn(),
      mockGetAll: vi.fn(),
      mockWithTransaction: vi.fn(),
      mockEncrypt: vi.fn(),
      mockDecrypt: vi.fn(),
    };
  });

// Mock the database module
vi.mock('../services/storage/database', () => ({
  runQuery: mockRunQuery,
  getFirst: mockGetFirst,
  getAll: mockGetAll,
  withTransaction: mockWithTransaction,
}));

// Mock the encryption module
vi.mock('../utils/encryption', () => ({
  encrypt: mockEncrypt,
  decrypt: mockDecrypt,
}));

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import {
  createIdentityDocument,
  getIdentityDocumentById,
  getIdentityDocumentsByProfile,
  updateIdentityDocument,
  deleteIdentityDocument,
  deleteIdentityDocumentsByProfile,
  countIdentityDocuments,
  createIdentityDocumentsBatch,
  IdentityDocumentError,
  IdentityDocumentNotFoundError,
  IdentityDocumentValidationError,
} from '../services/storage/identityDocumentService';

import type {
  CreateIdentityDocumentInput,
  UpdateIdentityDocumentInput,
} from '../services/storage/identityDocumentService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A valid SA ID number that passes Luhn checksum: 8001015009087 */
const VALID_SA_ID = '8001015009087';

/** An invalid SA ID (wrong checksum). */
const INVALID_SA_ID = '8001015009080';

function makeCreateInput(
  overrides: Partial<CreateIdentityDocumentInput> = {},
): CreateIdentityDocumentInput {
  return {
    id: 'doc-1',
    profileId: 'profile-1',
    type: 'passport',
    label: 'My Passport',
    number: 'A12345678',
    issueDate: '2020-01-15',
    expiryDate: '2030-01-15',
    issuingAuthority: 'DHA',
    additionalFields: { placeOfBirth: 'Cape Town' },
    ...overrides,
  };
}

function makeDbRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'doc-1',
    profile_id: 'profile-1',
    type: 'passport',
    label: 'My Passport',
    encrypted_number: 'enc:A12345678',
    issue_date: '2020-01-15',
    expiry_date: '2030-01-15',
    issuing_authority: 'DHA',
    additional_fields_encrypted: 'enc:{"placeOfBirth":"Cape Town"}',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  // Default encrypt/decrypt mocks — prefix with "enc:" for easy identification
  mockEncrypt.mockImplementation(async (plaintext: string) => `enc:${plaintext}`);
  mockDecrypt.mockImplementation(async (encrypted: string) => encrypted.replace(/^enc:/, ''));

  // Default runQuery mock
  mockRunQuery.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });

  // Default withTransaction mock — just executes the callback
  mockWithTransaction.mockImplementation(async (callback: () => Promise<void>) => {
    await callback();
  });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Identity Document Service', () => {
  // ── createIdentityDocument ──────────────────────────────────────────

  describe('createIdentityDocument', () => {
    it('should create a document and encrypt the number', async () => {
      const input = makeCreateInput();
      const result = await createIdentityDocument(input);

      expect(mockEncrypt).toHaveBeenCalledWith('A12345678');
      expect(result.id).toBe('doc-1');
      expect(result.number).toBe('A12345678');
      expect(result.type).toBe('passport');
      expect(result.label).toBe('My Passport');
    });

    it('should encrypt additional fields as JSON', async () => {
      const input = makeCreateInput({
        additionalFields: { placeOfBirth: 'Cape Town', nationality: 'South African' },
      });
      await createIdentityDocument(input);

      // The second encrypt call should be the additional fields JSON
      expect(mockEncrypt).toHaveBeenCalledTimes(2);
      const secondCall = mockEncrypt.mock.calls[1]![0] as string;
      const parsed = JSON.parse(secondCall);
      expect(parsed.placeOfBirth).toBe('Cape Town');
      expect(parsed.nationality).toBe('South African');
    });

    it('should not encrypt additional fields when empty', async () => {
      const input = makeCreateInput({ additionalFields: {} });
      await createIdentityDocument(input);

      // Only the document number should be encrypted
      expect(mockEncrypt).toHaveBeenCalledTimes(1);
    });

    it('should not encrypt additional fields when undefined', async () => {
      const input = makeCreateInput({ additionalFields: undefined });
      await createIdentityDocument(input);

      expect(mockEncrypt).toHaveBeenCalledTimes(1);
    });

    it('should pass correct SQL params to runQuery', async () => {
      const input = makeCreateInput();
      await createIdentityDocument(input);

      expect(mockRunQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO identity_documents'),
        expect.arrayContaining([
          'doc-1',
          'profile-1',
          'passport',
          'My Passport',
          'enc:A12345678',
          '2020-01-15',
          '2030-01-15',
          'DHA',
        ]),
      );
    });

    it('should return the document with plaintext fields', async () => {
      const input = makeCreateInput();
      const result = await createIdentityDocument(input);

      expect(result).toEqual({
        id: 'doc-1',
        type: 'passport',
        label: 'My Passport',
        number: 'A12345678',
        issueDate: '2020-01-15',
        expiryDate: '2030-01-15',
        issuingAuthority: 'DHA',
        additionalFields: { placeOfBirth: 'Cape Town' },
      });
    });

    it('should handle documents without optional fields', async () => {
      const input = makeCreateInput({
        issueDate: undefined,
        expiryDate: undefined,
        issuingAuthority: undefined,
        additionalFields: undefined,
      });
      const result = await createIdentityDocument(input);

      expect(result.issueDate).toBeUndefined();
      expect(result.expiryDate).toBeUndefined();
      expect(result.issuingAuthority).toBeUndefined();
      expect(result.additionalFields).toEqual({});
    });

    it('should validate SA ID numbers for sa_id_book type', async () => {
      const input = makeCreateInput({
        type: 'sa_id_book',
        number: INVALID_SA_ID,
      });

      await expect(createIdentityDocument(input)).rejects.toThrow(IdentityDocumentValidationError);
    });

    it('should validate SA ID numbers for sa_smart_id type', async () => {
      const input = makeCreateInput({
        type: 'sa_smart_id',
        number: INVALID_SA_ID,
      });

      await expect(createIdentityDocument(input)).rejects.toThrow(IdentityDocumentValidationError);
    });

    it('should accept a valid SA ID number', async () => {
      const input = makeCreateInput({
        type: 'sa_id_book',
        number: VALID_SA_ID,
      });

      const result = await createIdentityDocument(input);
      expect(result.number).toBe(VALID_SA_ID);
    });

    it('should not validate SA ID for non-SA document types', async () => {
      // Passport numbers don't need SA ID validation
      const input = makeCreateInput({
        type: 'passport',
        number: '12345',
      });

      const result = await createIdentityDocument(input);
      expect(result.number).toBe('12345');
    });

    // Validation errors

    it('should reject empty document ID', async () => {
      const input = makeCreateInput({ id: '' });
      await expect(createIdentityDocument(input)).rejects.toThrow(IdentityDocumentValidationError);
    });

    it('should reject empty profile ID', async () => {
      const input = makeCreateInput({ profileId: '' });
      await expect(createIdentityDocument(input)).rejects.toThrow(IdentityDocumentValidationError);
    });

    it('should reject invalid document type', async () => {
      const input = makeCreateInput({ type: 'invalid_type' as never });
      await expect(createIdentityDocument(input)).rejects.toThrow(IdentityDocumentValidationError);
    });

    it('should reject empty label', async () => {
      const input = makeCreateInput({ label: '' });
      await expect(createIdentityDocument(input)).rejects.toThrow(IdentityDocumentValidationError);
    });

    it('should reject empty number', async () => {
      const input = makeCreateInput({ number: '' });
      await expect(createIdentityDocument(input)).rejects.toThrow(IdentityDocumentValidationError);
    });

    it('should reject whitespace-only label', async () => {
      const input = makeCreateInput({ label: '   ' });
      await expect(createIdentityDocument(input)).rejects.toThrow(IdentityDocumentValidationError);
    });

    it('should wrap database errors in IdentityDocumentError', async () => {
      mockRunQuery.mockRejectedValueOnce(new Error('constraint violation'));
      const input = makeCreateInput();

      await expect(createIdentityDocument(input)).rejects.toThrow(IdentityDocumentError);
    });

    it('should wrap encryption errors in IdentityDocumentError', async () => {
      mockEncrypt.mockRejectedValueOnce(new Error('encryption failed'));
      const input = makeCreateInput();

      await expect(createIdentityDocument(input)).rejects.toThrow(IdentityDocumentError);
    });
  });

  // ── getIdentityDocumentById ─────────────────────────────────────────

  describe('getIdentityDocumentById', () => {
    it('should return null when document does not exist', async () => {
      mockGetFirst.mockResolvedValueOnce(null);

      const result = await getIdentityDocumentById('nonexistent');
      expect(result).toBeNull();
    });

    it('should decrypt and return the document', async () => {
      mockGetFirst.mockResolvedValueOnce(makeDbRow());

      const result = await getIdentityDocumentById('doc-1');

      expect(result).not.toBeNull();
      expect(result!.number).toBe('A12345678');
      expect(result!.additionalFields).toEqual({ placeOfBirth: 'Cape Town' });
      expect(mockDecrypt).toHaveBeenCalledWith('enc:A12345678');
    });

    it('should handle null additional_fields_encrypted', async () => {
      mockGetFirst.mockResolvedValueOnce(makeDbRow({ additional_fields_encrypted: null }));

      const result = await getIdentityDocumentById('doc-1');
      expect(result!.additionalFields).toEqual({});
    });

    it('should handle null optional fields', async () => {
      mockGetFirst.mockResolvedValueOnce(
        makeDbRow({
          issue_date: null,
          expiry_date: null,
          issuing_authority: null,
        }),
      );

      const result = await getIdentityDocumentById('doc-1');
      expect(result!.issueDate).toBeUndefined();
      expect(result!.expiryDate).toBeUndefined();
      expect(result!.issuingAuthority).toBeUndefined();
    });

    it('should query with the correct SQL and params', async () => {
      mockGetFirst.mockResolvedValueOnce(null);
      await getIdentityDocumentById('doc-42');

      expect(mockGetFirst).toHaveBeenCalledWith('SELECT * FROM identity_documents WHERE id = ?', [
        'doc-42',
      ]);
    });

    it('should wrap database errors', async () => {
      mockGetFirst.mockRejectedValueOnce(new Error('db error'));

      await expect(getIdentityDocumentById('doc-1')).rejects.toThrow(IdentityDocumentError);
    });

    it('should wrap decryption errors', async () => {
      mockGetFirst.mockResolvedValueOnce(makeDbRow());
      mockDecrypt.mockRejectedValueOnce(new Error('key not found'));

      await expect(getIdentityDocumentById('doc-1')).rejects.toThrow(IdentityDocumentError);
    });
  });

  // ── getIdentityDocumentsByProfile ───────────────────────────────────

  describe('getIdentityDocumentsByProfile', () => {
    it('should return empty array when profile has no documents', async () => {
      mockGetAll.mockResolvedValueOnce([]);

      const result = await getIdentityDocumentsByProfile('profile-1');
      expect(result).toEqual([]);
    });

    it('should decrypt and return all documents for the profile', async () => {
      mockGetAll.mockResolvedValueOnce([
        makeDbRow({ id: 'doc-1', label: 'Passport' }),
        makeDbRow({
          id: 'doc-2',
          label: 'SA ID',
          type: 'sa_smart_id',
          encrypted_number: 'enc:8001015009087',
          additional_fields_encrypted: null,
        }),
      ]);

      const results = await getIdentityDocumentsByProfile('profile-1');

      expect(results).toHaveLength(2);
      expect(results[0]!.id).toBe('doc-1');
      expect(results[1]!.id).toBe('doc-2');
      expect(results[1]!.number).toBe('8001015009087');
    });

    it('should query with ORDER BY label ASC', async () => {
      mockGetAll.mockResolvedValueOnce([]);
      await getIdentityDocumentsByProfile('profile-1');

      expect(mockGetAll).toHaveBeenCalledWith(expect.stringContaining('ORDER BY label ASC'), [
        'profile-1',
      ]);
    });

    it('should wrap errors', async () => {
      mockGetAll.mockRejectedValueOnce(new Error('db error'));

      await expect(getIdentityDocumentsByProfile('profile-1')).rejects.toThrow(
        IdentityDocumentError,
      );
    });
  });

  // ── updateIdentityDocument ──────────────────────────────────────────

  describe('updateIdentityDocument', () => {
    beforeEach(() => {
      // Mock the initial fetch for the existing document
      mockGetFirst.mockResolvedValueOnce(makeDbRow());
    });

    it('should throw IdentityDocumentNotFoundError when document does not exist', async () => {
      mockGetFirst.mockReset();
      mockGetFirst.mockResolvedValueOnce(null);

      await expect(updateIdentityDocument('nonexistent', { label: 'New' })).rejects.toThrow(
        IdentityDocumentNotFoundError,
      );
    });

    it('should update the label', async () => {
      // Mock the re-read after update
      mockGetFirst.mockResolvedValueOnce(makeDbRow({ label: 'Updated Label' }));

      const result = await updateIdentityDocument('doc-1', { label: 'Updated Label' });

      expect(mockRunQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE identity_documents SET label = ?'),
        expect.arrayContaining(['Updated Label', 'doc-1']),
      );
      expect(result.label).toBe('Updated Label');
    });

    it('should re-encrypt the number when updated', async () => {
      mockGetFirst.mockResolvedValueOnce(makeDbRow({ encrypted_number: 'enc:B99999999' }));

      await updateIdentityDocument('doc-1', { number: 'B99999999' });

      expect(mockEncrypt).toHaveBeenCalledWith('B99999999');
      expect(mockRunQuery).toHaveBeenCalledWith(
        expect.stringContaining('encrypted_number = ?'),
        expect.arrayContaining(['enc:B99999999']),
      );
    });

    it('should re-encrypt additional fields when updated', async () => {
      mockGetFirst.mockResolvedValueOnce(makeDbRow());

      await updateIdentityDocument('doc-1', {
        additionalFields: { newField: 'newValue' },
      });

      expect(mockEncrypt).toHaveBeenCalledWith(JSON.stringify({ newField: 'newValue' }));
    });

    it('should set additional_fields_encrypted to null for empty object', async () => {
      mockGetFirst.mockResolvedValueOnce(makeDbRow());

      await updateIdentityDocument('doc-1', { additionalFields: {} });

      expect(mockRunQuery).toHaveBeenCalledWith(
        expect.stringContaining('additional_fields_encrypted = ?'),
        expect.arrayContaining([null]),
      );
    });

    it('should return the existing document when nothing to update', async () => {
      const result = await updateIdentityDocument('doc-1', {});

      expect(mockRunQuery).not.toHaveBeenCalled();
      expect(result.id).toBe('doc-1');
    });

    it('should validate SA ID when number is updated for SA doc type', async () => {
      mockGetFirst.mockReset();
      mockGetFirst.mockResolvedValueOnce(
        makeDbRow({ type: 'sa_id_book', encrypted_number: 'enc:8001015009087' }),
      );

      await expect(updateIdentityDocument('doc-1', { number: INVALID_SA_ID })).rejects.toThrow(
        IdentityDocumentValidationError,
      );
    });

    it('should validate existing number when type changes to SA ID type', async () => {
      // The existing doc has a passport number, not a valid SA ID
      mockGetFirst.mockReset();
      mockGetFirst.mockResolvedValueOnce(
        makeDbRow({ type: 'passport', encrypted_number: 'enc:A12345678' }),
      );

      await expect(updateIdentityDocument('doc-1', { type: 'sa_id_book' })).rejects.toThrow(
        IdentityDocumentValidationError,
      );
    });

    it('should allow updating to a non-SA type without SA ID validation', async () => {
      mockGetFirst.mockResolvedValueOnce(makeDbRow({ type: 'drivers_license' }));

      const result = await updateIdentityDocument('doc-1', { type: 'drivers_license' });
      expect(result.type).toBe('drivers_license');
    });

    it('should validate label is not empty on update', async () => {
      await expect(updateIdentityDocument('doc-1', { label: '' })).rejects.toThrow(
        IdentityDocumentValidationError,
      );
    });

    it('should allow clearing optional fields with null', async () => {
      mockGetFirst.mockResolvedValueOnce(
        makeDbRow({ issue_date: null, expiry_date: null, issuing_authority: null }),
      );

      const result = await updateIdentityDocument('doc-1', {
        issueDate: null,
        expiryDate: null,
        issuingAuthority: null,
      });

      expect(mockRunQuery).toHaveBeenCalledWith(
        expect.stringContaining('issue_date = ?'),
        expect.arrayContaining([null, null, null]),
      );
      expect(result).toBeDefined();
    });

    it('should update multiple fields at once', async () => {
      mockGetFirst.mockResolvedValueOnce(
        makeDbRow({ label: 'New Label', type: 'drivers_license' }),
      );

      await updateIdentityDocument('doc-1', {
        label: 'New Label',
        type: 'drivers_license',
      });

      const sql = mockRunQuery.mock.calls[0]![0] as string;
      expect(sql).toContain('label = ?');
      expect(sql).toContain('type = ?');
    });

    it('should wrap database errors', async () => {
      mockRunQuery.mockRejectedValueOnce(new Error('db error'));

      await expect(updateIdentityDocument('doc-1', { label: 'New' })).rejects.toThrow(
        IdentityDocumentError,
      );
    });
  });

  // ── deleteIdentityDocument ──────────────────────────────────────────

  describe('deleteIdentityDocument', () => {
    it('should return true when a document is deleted', async () => {
      mockRunQuery.mockResolvedValueOnce({ lastInsertRowId: 0, changes: 1 });

      const result = await deleteIdentityDocument('doc-1');
      expect(result).toBe(true);
    });

    it('should return false when the document does not exist', async () => {
      mockRunQuery.mockResolvedValueOnce({ lastInsertRowId: 0, changes: 0 });

      const result = await deleteIdentityDocument('nonexistent');
      expect(result).toBe(false);
    });

    it('should use correct SQL', async () => {
      mockRunQuery.mockResolvedValueOnce({ lastInsertRowId: 0, changes: 1 });

      await deleteIdentityDocument('doc-1');

      expect(mockRunQuery).toHaveBeenCalledWith('DELETE FROM identity_documents WHERE id = ?', [
        'doc-1',
      ]);
    });

    it('should wrap errors', async () => {
      mockRunQuery.mockRejectedValueOnce(new Error('db error'));

      await expect(deleteIdentityDocument('doc-1')).rejects.toThrow(IdentityDocumentError);
    });
  });

  // ── deleteIdentityDocumentsByProfile ────────────────────────────────

  describe('deleteIdentityDocumentsByProfile', () => {
    it('should return the number of deleted documents', async () => {
      mockRunQuery.mockResolvedValueOnce({ lastInsertRowId: 0, changes: 3 });

      const count = await deleteIdentityDocumentsByProfile('profile-1');
      expect(count).toBe(3);
    });

    it('should return 0 when profile has no documents', async () => {
      mockRunQuery.mockResolvedValueOnce({ lastInsertRowId: 0, changes: 0 });

      const count = await deleteIdentityDocumentsByProfile('profile-1');
      expect(count).toBe(0);
    });

    it('should use correct SQL', async () => {
      mockRunQuery.mockResolvedValueOnce({ lastInsertRowId: 0, changes: 0 });

      await deleteIdentityDocumentsByProfile('profile-1');

      expect(mockRunQuery).toHaveBeenCalledWith(
        'DELETE FROM identity_documents WHERE profile_id = ?',
        ['profile-1'],
      );
    });

    it('should wrap errors', async () => {
      mockRunQuery.mockRejectedValueOnce(new Error('db error'));

      await expect(deleteIdentityDocumentsByProfile('profile-1')).rejects.toThrow(
        IdentityDocumentError,
      );
    });
  });

  // ── countIdentityDocuments ──────────────────────────────────────────

  describe('countIdentityDocuments', () => {
    it('should return the document count', async () => {
      mockGetFirst.mockResolvedValueOnce({ count: 5 });

      const count = await countIdentityDocuments('profile-1');
      expect(count).toBe(5);
    });

    it('should return 0 when no documents exist', async () => {
      mockGetFirst.mockResolvedValueOnce({ count: 0 });

      const count = await countIdentityDocuments('profile-1');
      expect(count).toBe(0);
    });

    it('should return 0 when result is null', async () => {
      mockGetFirst.mockResolvedValueOnce(null);

      const count = await countIdentityDocuments('profile-1');
      expect(count).toBe(0);
    });

    it('should wrap errors', async () => {
      mockGetFirst.mockRejectedValueOnce(new Error('db error'));

      await expect(countIdentityDocuments('profile-1')).rejects.toThrow(IdentityDocumentError);
    });
  });

  // ── createIdentityDocumentsBatch ────────────────────────────────────

  describe('createIdentityDocumentsBatch', () => {
    it('should create multiple documents in a transaction', async () => {
      const inputs = [
        makeCreateInput({ id: 'doc-1', label: 'Doc A' }),
        makeCreateInput({ id: 'doc-2', label: 'Doc B', number: 'B999' }),
      ];

      const results = await createIdentityDocumentsBatch(inputs);

      expect(mockWithTransaction).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(2);
      expect(results[0]!.id).toBe('doc-1');
      expect(results[1]!.id).toBe('doc-2');
    });

    it('should encrypt each document number', async () => {
      const inputs = [
        makeCreateInput({ id: 'doc-1', number: 'NUM1' }),
        makeCreateInput({ id: 'doc-2', number: 'NUM2' }),
      ];

      await createIdentityDocumentsBatch(inputs);

      expect(mockEncrypt).toHaveBeenCalledWith('NUM1');
      expect(mockEncrypt).toHaveBeenCalledWith('NUM2');
    });

    it('should validate all documents before starting transaction', async () => {
      const inputs = [
        makeCreateInput({ id: 'doc-1' }),
        makeCreateInput({ id: '', label: 'Invalid' }), // Invalid — empty ID
      ];

      await expect(createIdentityDocumentsBatch(inputs)).rejects.toThrow(
        IdentityDocumentValidationError,
      );

      // Transaction should not have been called
      expect(mockWithTransaction).not.toHaveBeenCalled();
    });

    it('should handle empty batch', async () => {
      const results = await createIdentityDocumentsBatch([]);

      expect(results).toEqual([]);
      expect(mockWithTransaction).toHaveBeenCalledTimes(1);
    });

    it('should wrap transaction errors', async () => {
      mockWithTransaction.mockRejectedValueOnce(new Error('transaction failed'));

      const inputs = [makeCreateInput()];

      await expect(createIdentityDocumentsBatch(inputs)).rejects.toThrow(IdentityDocumentError);
    });

    it('should validate SA ID numbers in batch', async () => {
      const inputs = [makeCreateInput({ id: 'doc-1', type: 'sa_id_book', number: INVALID_SA_ID })];

      await expect(createIdentityDocumentsBatch(inputs)).rejects.toThrow(
        IdentityDocumentValidationError,
      );
    });
  });

  // ── Error class hierarchy ───────────────────────────────────────────

  describe('error classes', () => {
    it('IdentityDocumentError should extend Error', () => {
      const err = new IdentityDocumentError('test');
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('IdentityDocumentError');
      expect(err.message).toBe('test');
    });

    it('IdentityDocumentError should store cause', () => {
      const cause = new Error('root cause');
      const err = new IdentityDocumentError('test', cause);
      expect(err.cause).toBe(cause);
    });

    it('IdentityDocumentNotFoundError should extend IdentityDocumentError', () => {
      const err = new IdentityDocumentNotFoundError('doc-42');
      expect(err).toBeInstanceOf(IdentityDocumentError);
      expect(err.name).toBe('IdentityDocumentNotFoundError');
      expect(err.message).toContain('doc-42');
    });

    it('IdentityDocumentValidationError should extend IdentityDocumentError', () => {
      const err = new IdentityDocumentValidationError('number', 'Bad number');
      expect(err).toBeInstanceOf(IdentityDocumentError);
      expect(err.name).toBe('IdentityDocumentValidationError');
      expect(err.field).toBe('number');
    });
  });

  // ── Document type coverage ──────────────────────────────────────────

  describe('document type coverage', () => {
    const nonSATypes: Array<{ type: string; label: string }> = [
      { type: 'passport', label: 'Passport' },
      { type: 'drivers_license', label: 'Drivers License' },
      { type: 'prdp', label: 'PrDP' },
      { type: 'tax_number', label: 'Tax Number' },
      { type: 'bank_account', label: 'Bank Account' },
      { type: 'medical_aid', label: 'Medical Aid' },
      { type: 'work_permit', label: 'Work Permit' },
      { type: 'birth_certificate', label: 'Birth Certificate' },
      { type: 'custom', label: 'Custom Document' },
    ];

    it.each(nonSATypes)(
      'should create $type documents without SA ID validation',
      async ({ type, label }) => {
        const input = makeCreateInput({
          type: type as CreateIdentityDocumentInput['type'],
          label,
          number: 'ABC123',
        });
        const result = await createIdentityDocument(input);
        expect(result.type).toBe(type);
      },
    );

    it('should accept valid SA ID for sa_id_book', async () => {
      const input = makeCreateInput({ type: 'sa_id_book', number: VALID_SA_ID });
      const result = await createIdentityDocument(input);
      expect(result.type).toBe('sa_id_book');
    });

    it('should accept valid SA ID for sa_smart_id', async () => {
      const input = makeCreateInput({ type: 'sa_smart_id', number: VALID_SA_ID });
      const result = await createIdentityDocument(input);
      expect(result.type).toBe('sa_smart_id');
    });
  });
});
