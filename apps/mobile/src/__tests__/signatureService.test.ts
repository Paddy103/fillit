import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — vi.hoisted() ensures variables are available inside vi.mock factories
// ---------------------------------------------------------------------------

const {
  mockRunQuery,
  mockGetFirst,
  mockGetAll,
  mockWithTransaction,
  mockDeleteFile,
  mockFileExists,
} = vi.hoisted(() => {
  return {
    mockRunQuery: vi.fn(),
    mockGetFirst: vi.fn(),
    mockGetAll: vi.fn(),
    mockWithTransaction: vi.fn(async (callback: () => Promise<void>) => {
      await callback();
    }),
    mockDeleteFile: vi.fn(),
    mockFileExists: vi.fn(() => false),
  };
});

vi.mock('../services/storage/database', () => ({
  runQuery: mockRunQuery,
  getFirst: mockGetFirst,
  getAll: mockGetAll,
  withTransaction: mockWithTransaction,
}));

vi.mock('../services/storage/fileStorage', () => ({
  deleteFile: mockDeleteFile,
  fileExists: mockFileExists,
}));

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import {
  createSignature,
  getSignatureById,
  getSignaturesByProfile,
  getDefaultSignature,
  countSignaturesByProfile,
  updateSignature,
  setDefaultSignature,
  deleteSignature,
  deleteSignaturesByProfile,
  SignatureNotFoundError,
  SignatureValidationError,
  type CreateSignatureInput,
} from '../services/storage/signatureService';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Build a valid drawn signature input. */
function makeDrawnInput(overrides?: Partial<CreateSignatureInput>): CreateSignatureInput {
  return {
    id: 'sig-1',
    profileId: 'profile-1',
    type: 'drawn',
    label: 'Full signature',
    imageUri: 'file:///signatures/sig-1.png',
    svgPath: 'M0,0 L100,100',
    ...overrides,
  };
}

/** Build a valid typed signature input. */
function makeTypedInput(overrides?: Partial<CreateSignatureInput>): CreateSignatureInput {
  return {
    id: 'sig-2',
    profileId: 'profile-1',
    type: 'typed',
    label: 'Typed signature',
    text: 'John Doe',
    fontFamily: 'Dancing Script',
    ...overrides,
  };
}

/** A database row matching a drawn signature. */
function makeDrawnRow(overrides?: Record<string, unknown>) {
  return {
    id: 'sig-1',
    profile_id: 'profile-1',
    type: 'drawn',
    label: 'Full signature',
    image_uri: 'file:///signatures/sig-1.png',
    svg_path: 'M0,0 L100,100',
    text: null,
    font_family: null,
    created_at: '2026-01-01T00:00:00.000Z',
    is_default: 0,
    ...overrides,
  };
}

/** A database row matching a typed signature. */
function makeTypedRow(overrides?: Record<string, unknown>) {
  return {
    id: 'sig-2',
    profile_id: 'profile-1',
    type: 'typed',
    label: 'Typed signature',
    image_uri: null,
    svg_path: null,
    text: 'John Doe',
    font_family: 'Dancing Script',
    created_at: '2026-01-01T00:00:00.000Z',
    is_default: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Signature CRUD Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunQuery.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
  });

  // ── createSignature ────────────────────────────────────────────────

  describe('createSignature', () => {
    it('should create a drawn signature', async () => {
      const input = makeDrawnInput();
      const row = makeDrawnRow();

      // getSignatureById call after creation
      mockGetFirst.mockResolvedValueOnce(row);

      const result = await createSignature(input);

      expect(result.id).toBe('sig-1');
      expect(result.profileId).toBe('profile-1');
      expect(result.type).toBe('drawn');
      expect(result.label).toBe('Full signature');
      expect(result.imageUri).toBe('file:///signatures/sig-1.png');
      expect(result.svgPath).toBe('M0,0 L100,100');
      expect(result.text).toBeUndefined();
      expect(result.fontFamily).toBeUndefined();
      expect(result.isDefault).toBe(false);
    });

    it('should create a typed signature', async () => {
      const input = makeTypedInput();
      const row = makeTypedRow();

      mockGetFirst.mockResolvedValueOnce(row);

      const result = await createSignature(input);

      expect(result.id).toBe('sig-2');
      expect(result.type).toBe('typed');
      expect(result.text).toBe('John Doe');
      expect(result.fontFamily).toBe('Dancing Script');
      expect(result.imageUri).toBeUndefined();
      expect(result.svgPath).toBeUndefined();
    });

    it('should execute INSERT with correct params', async () => {
      const input = makeDrawnInput();
      mockGetFirst.mockResolvedValueOnce(makeDrawnRow());

      await createSignature(input);

      // Find the INSERT call within the transaction
      expect(mockRunQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO signatures'),
        expect.arrayContaining([
          'sig-1',
          'profile-1',
          'drawn',
          'Full signature',
          'file:///signatures/sig-1.png',
          'M0,0 L100,100',
          null,
          null,
        ]),
      );
    });

    it('should use a transaction for creation', async () => {
      const input = makeDrawnInput();
      mockGetFirst.mockResolvedValueOnce(makeDrawnRow());

      await createSignature(input);

      expect(mockWithTransaction).toHaveBeenCalledTimes(1);
    });

    it('should unset existing default when creating a default signature', async () => {
      const input = makeDrawnInput({ isDefault: true });
      const row = makeDrawnRow({ is_default: 1 });

      mockGetFirst.mockResolvedValueOnce(row);

      await createSignature(input);

      // Should have called UPDATE to clear existing default
      expect(mockRunQuery).toHaveBeenCalledWith(
        expect.stringContaining(
          'UPDATE signatures SET is_default = 0 WHERE profile_id = ? AND is_default = 1',
        ),
        ['profile-1'],
      );
    });

    it('should not unset default when creating a non-default signature', async () => {
      const input = makeDrawnInput({ isDefault: false });
      mockGetFirst.mockResolvedValueOnce(makeDrawnRow());

      await createSignature(input);

      // The UPDATE to clear defaults should NOT have been called
      const updateCalls = mockRunQuery.mock.calls.filter(([sql]: [string]) =>
        sql.includes('UPDATE signatures SET is_default = 0'),
      );
      expect(updateCalls).toHaveLength(0);
    });

    it('should pass null for optional drawn fields not provided', async () => {
      const input = makeDrawnInput({ svgPath: undefined });
      mockGetFirst.mockResolvedValueOnce(makeDrawnRow({ svg_path: null }));

      await createSignature(input);

      expect(mockRunQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO signatures'),
        expect.arrayContaining([null]), // svgPath passed as null
      );
    });

    // ── Validation ─────────────────────────────────────────────────

    it('should throw SignatureValidationError when id is missing', async () => {
      const input = makeDrawnInput({ id: '' });
      await expect(createSignature(input)).rejects.toThrow(SignatureValidationError);
      await expect(createSignature(input)).rejects.toThrow('Signature id is required');
    });

    it('should throw SignatureValidationError when profileId is missing', async () => {
      const input = makeDrawnInput({ profileId: '' });
      await expect(createSignature(input)).rejects.toThrow(SignatureValidationError);
      await expect(createSignature(input)).rejects.toThrow('Profile id is required');
    });

    it('should throw SignatureValidationError when type is invalid', async () => {
      const input = makeDrawnInput({
        type: 'stamp' as 'drawn',
      });
      await expect(createSignature(input)).rejects.toThrow(SignatureValidationError);
      await expect(createSignature(input)).rejects.toThrow(
        'Signature type must be "drawn" or "typed"',
      );
    });

    it('should throw SignatureValidationError when label is missing', async () => {
      const input = makeDrawnInput({ label: '' });
      await expect(createSignature(input)).rejects.toThrow(SignatureValidationError);
      await expect(createSignature(input)).rejects.toThrow('Signature label is required');
    });

    it('should throw SignatureValidationError when typed signature has no text', async () => {
      const input = makeTypedInput({ text: '' });
      await expect(createSignature(input)).rejects.toThrow(SignatureValidationError);
      await expect(createSignature(input)).rejects.toThrow('Typed signature must include text');
    });

    it('should throw SignatureValidationError when typed signature has no fontFamily', async () => {
      const input = makeTypedInput({ fontFamily: '' });
      await expect(createSignature(input)).rejects.toThrow(SignatureValidationError);
      await expect(createSignature(input)).rejects.toThrow(
        'Typed signature must include fontFamily',
      );
    });

    it('should allow drawn signature without imageUri', async () => {
      const input = makeDrawnInput({ imageUri: undefined });
      mockGetFirst.mockResolvedValueOnce(makeDrawnRow({ image_uri: null }));

      const result = await createSignature(input);
      expect(result.imageUri).toBeUndefined();
    });
  });

  // ── getSignatureById ───────────────────────────────────────────────

  describe('getSignatureById', () => {
    it('should return a signature when found', async () => {
      mockGetFirst.mockResolvedValueOnce(makeDrawnRow());

      const result = await getSignatureById('sig-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('sig-1');
      expect(result!.type).toBe('drawn');
    });

    it('should return null when not found', async () => {
      mockGetFirst.mockResolvedValueOnce(null);

      const result = await getSignatureById('nonexistent');
      expect(result).toBeNull();
    });

    it('should query with the correct SQL and params', async () => {
      mockGetFirst.mockResolvedValueOnce(null);

      await getSignatureById('sig-1');

      expect(mockGetFirst).toHaveBeenCalledWith('SELECT * FROM signatures WHERE id = ?', ['sig-1']);
    });

    it('should map null DB fields to undefined in result', async () => {
      const row = makeDrawnRow({
        image_uri: null,
        svg_path: null,
        text: null,
        font_family: null,
        label: null,
      });
      mockGetFirst.mockResolvedValueOnce(row);

      const result = await getSignatureById('sig-1');
      expect(result!.imageUri).toBeUndefined();
      expect(result!.svgPath).toBeUndefined();
      expect(result!.text).toBeUndefined();
      expect(result!.fontFamily).toBeUndefined();
      expect(result!.label).toBe('');
    });

    it('should map is_default integer to boolean', async () => {
      mockGetFirst.mockResolvedValueOnce(makeDrawnRow({ is_default: 1 }));
      const result = await getSignatureById('sig-1');
      expect(result!.isDefault).toBe(true);

      mockGetFirst.mockResolvedValueOnce(makeDrawnRow({ is_default: 0 }));
      const result2 = await getSignatureById('sig-1');
      expect(result2!.isDefault).toBe(false);
    });
  });

  // ── getSignaturesByProfile ─────────────────────────────────────────

  describe('getSignaturesByProfile', () => {
    it('should return all signatures for a profile', async () => {
      mockGetAll.mockResolvedValueOnce([makeDrawnRow(), makeTypedRow()]);

      const results = await getSignaturesByProfile('profile-1');

      expect(results).toHaveLength(2);
      expect(results[0]!.type).toBe('drawn');
      expect(results[1]!.type).toBe('typed');
    });

    it('should return empty array when no signatures exist', async () => {
      mockGetAll.mockResolvedValueOnce([]);

      const results = await getSignaturesByProfile('profile-1');
      expect(results).toEqual([]);
    });

    it('should query with ORDER BY is_default DESC, created_at DESC', async () => {
      mockGetAll.mockResolvedValueOnce([]);

      await getSignaturesByProfile('profile-1');

      expect(mockGetAll).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY is_default DESC, created_at DESC'),
        ['profile-1'],
      );
    });
  });

  // ── getDefaultSignature ────────────────────────────────────────────

  describe('getDefaultSignature', () => {
    it('should return the default signature', async () => {
      mockGetFirst.mockResolvedValueOnce(makeDrawnRow({ is_default: 1 }));

      const result = await getDefaultSignature('profile-1');

      expect(result).not.toBeNull();
      expect(result!.isDefault).toBe(true);
    });

    it('should return null when no default is set', async () => {
      mockGetFirst.mockResolvedValueOnce(null);

      const result = await getDefaultSignature('profile-1');
      expect(result).toBeNull();
    });

    it('should query for is_default = 1', async () => {
      mockGetFirst.mockResolvedValueOnce(null);

      await getDefaultSignature('profile-1');

      expect(mockGetFirst).toHaveBeenCalledWith(expect.stringContaining('is_default = 1'), [
        'profile-1',
      ]);
    });
  });

  // ── countSignaturesByProfile ───────────────────────────────────────

  describe('countSignaturesByProfile', () => {
    it('should return the count of signatures', async () => {
      mockGetFirst.mockResolvedValueOnce({ count: 3 });

      const count = await countSignaturesByProfile('profile-1');
      expect(count).toBe(3);
    });

    it('should return 0 when no signatures exist', async () => {
      mockGetFirst.mockResolvedValueOnce({ count: 0 });

      const count = await countSignaturesByProfile('profile-1');
      expect(count).toBe(0);
    });

    it('should return 0 when query returns null', async () => {
      mockGetFirst.mockResolvedValueOnce(null);

      const count = await countSignaturesByProfile('profile-1');
      expect(count).toBe(0);
    });

    it('should use COUNT(*) in the query', async () => {
      mockGetFirst.mockResolvedValueOnce({ count: 0 });

      await countSignaturesByProfile('profile-1');

      expect(mockGetFirst).toHaveBeenCalledWith(expect.stringContaining('COUNT(*)'), ['profile-1']);
    });
  });

  // ── updateSignature ────────────────────────────────────────────────

  describe('updateSignature', () => {
    it('should update the label', async () => {
      // First call: getSignatureById (existence check)
      mockGetFirst.mockResolvedValueOnce(makeDrawnRow());
      // Second call: getSignatureById (return updated)
      mockGetFirst.mockResolvedValueOnce(makeDrawnRow({ label: 'New label' }));

      const result = await updateSignature('sig-1', {
        label: 'New label',
      });

      expect(result.label).toBe('New label');
      expect(mockRunQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE signatures SET label = ?'),
        ['New label', 'sig-1'],
      );
    });

    it('should update the imageUri', async () => {
      mockGetFirst.mockResolvedValueOnce(makeDrawnRow());
      mockGetFirst.mockResolvedValueOnce(makeDrawnRow({ image_uri: 'file:///new/path.png' }));

      const result = await updateSignature('sig-1', {
        imageUri: 'file:///new/path.png',
      });

      expect(result.imageUri).toBe('file:///new/path.png');
    });

    it('should update multiple fields at once', async () => {
      mockGetFirst.mockResolvedValueOnce(makeTypedRow());
      mockGetFirst.mockResolvedValueOnce(
        makeTypedRow({
          text: 'Jane Smith',
          font_family: 'Great Vibes',
        }),
      );

      const result = await updateSignature('sig-2', {
        text: 'Jane Smith',
        fontFamily: 'Great Vibes',
      });

      expect(result.text).toBe('Jane Smith');
      expect(result.fontFamily).toBe('Great Vibes');
    });

    it('should unset other defaults when setting as default', async () => {
      mockGetFirst.mockResolvedValueOnce(makeDrawnRow());
      mockGetFirst.mockResolvedValueOnce(makeDrawnRow({ is_default: 1 }));

      await updateSignature('sig-1', { isDefault: true });

      // Should unset other defaults for the same profile
      expect(mockRunQuery).toHaveBeenCalledWith(
        expect.stringContaining(
          'UPDATE signatures SET is_default = 0 WHERE profile_id = ? AND is_default = 1 AND id != ?',
        ),
        ['profile-1', 'sig-1'],
      );
    });

    it('should not unset other defaults when setting isDefault to false', async () => {
      mockGetFirst.mockResolvedValueOnce(makeDrawnRow({ is_default: 1 }));
      mockGetFirst.mockResolvedValueOnce(makeDrawnRow({ is_default: 0 }));

      await updateSignature('sig-1', { isDefault: false });

      const clearDefaultCalls = mockRunQuery.mock.calls.filter(([sql]: [string]) =>
        sql.includes('UPDATE signatures SET is_default = 0 WHERE profile_id'),
      );
      expect(clearDefaultCalls).toHaveLength(0);
    });

    it('should use a transaction', async () => {
      mockGetFirst.mockResolvedValueOnce(makeDrawnRow());
      mockGetFirst.mockResolvedValueOnce(makeDrawnRow({ label: 'Updated' }));

      await updateSignature('sig-1', { label: 'Updated' });

      expect(mockWithTransaction).toHaveBeenCalled();
    });

    it('should return the existing record when no fields are provided', async () => {
      const row = makeDrawnRow();
      mockGetFirst.mockResolvedValueOnce(row);

      const result = await updateSignature('sig-1', {});

      expect(result.id).toBe('sig-1');
      // No update query should have been executed
      expect(mockRunQuery).not.toHaveBeenCalled();
    });

    it('should throw SignatureNotFoundError when signature does not exist', async () => {
      mockGetFirst.mockResolvedValueOnce(null);

      await expect(updateSignature('nonexistent', { label: 'New' })).rejects.toThrow(
        SignatureNotFoundError,
      );
    });
  });

  // ── setDefaultSignature ────────────────────────────────────────────

  describe('setDefaultSignature', () => {
    it('should set the signature as default', async () => {
      mockGetFirst.mockResolvedValueOnce(makeDrawnRow());
      mockGetFirst.mockResolvedValueOnce(makeDrawnRow({ is_default: 1 }));

      const result = await setDefaultSignature('sig-1');

      expect(result.isDefault).toBe(true);
    });

    it('should throw SignatureNotFoundError for missing signature', async () => {
      mockGetFirst.mockResolvedValueOnce(null);

      await expect(setDefaultSignature('nonexistent')).rejects.toThrow(SignatureNotFoundError);
    });
  });

  // ── deleteSignature ────────────────────────────────────────────────

  describe('deleteSignature', () => {
    it('should delete a signature by ID', async () => {
      mockGetFirst.mockResolvedValueOnce(makeDrawnRow());
      mockFileExists.mockReturnValueOnce(true);

      await deleteSignature('sig-1');

      expect(mockRunQuery).toHaveBeenCalledWith('DELETE FROM signatures WHERE id = ?', ['sig-1']);
    });

    it('should delete the associated image file when it exists', async () => {
      mockGetFirst.mockResolvedValueOnce(makeDrawnRow({ image_uri: 'file:///sigs/sig-1.png' }));
      mockFileExists.mockReturnValueOnce(true);

      await deleteSignature('sig-1');

      expect(mockFileExists).toHaveBeenCalledWith('file:///sigs/sig-1.png');
      expect(mockDeleteFile).toHaveBeenCalledWith('file:///sigs/sig-1.png');
    });

    it('should not attempt to delete file when imageUri is null', async () => {
      mockGetFirst.mockResolvedValueOnce(makeDrawnRow({ image_uri: null }));

      await deleteSignature('sig-1');

      expect(mockFileExists).not.toHaveBeenCalled();
      expect(mockDeleteFile).not.toHaveBeenCalled();
    });

    it('should not attempt to delete file when file does not exist on disk', async () => {
      mockGetFirst.mockResolvedValueOnce(makeDrawnRow({ image_uri: 'file:///missing.png' }));
      mockFileExists.mockReturnValueOnce(false);

      await deleteSignature('sig-1');

      expect(mockFileExists).toHaveBeenCalledWith('file:///missing.png');
      expect(mockDeleteFile).not.toHaveBeenCalled();
    });

    it('should still delete DB record even if file cleanup fails', async () => {
      mockGetFirst.mockResolvedValueOnce(makeDrawnRow({ image_uri: 'file:///sigs/sig-1.png' }));
      mockFileExists.mockImplementationOnce(() => {
        throw new Error('disk error');
      });

      await deleteSignature('sig-1');

      // DB delete should still happen
      expect(mockRunQuery).toHaveBeenCalledWith('DELETE FROM signatures WHERE id = ?', ['sig-1']);
    });

    it('should throw SignatureNotFoundError when signature does not exist', async () => {
      mockGetFirst.mockResolvedValueOnce(null);

      await expect(deleteSignature('nonexistent')).rejects.toThrow(SignatureNotFoundError);
    });
  });

  // ── deleteSignaturesByProfile ──────────────────────────────────────

  describe('deleteSignaturesByProfile', () => {
    it('should delete all signatures for a profile', async () => {
      mockGetAll.mockResolvedValueOnce([makeDrawnRow(), makeTypedRow()]);
      mockRunQuery.mockResolvedValueOnce({
        lastInsertRowId: 0,
        changes: 2,
      });

      const count = await deleteSignaturesByProfile('profile-1');

      expect(count).toBe(2);
      expect(mockRunQuery).toHaveBeenCalledWith('DELETE FROM signatures WHERE profile_id = ?', [
        'profile-1',
      ]);
    });

    it('should clean up image files for each signature', async () => {
      mockGetAll.mockResolvedValueOnce([
        makeDrawnRow({ image_uri: 'file:///sigs/sig-1.png' }),
        makeTypedRow({ image_uri: null }),
        makeDrawnRow({
          id: 'sig-3',
          image_uri: 'file:///sigs/sig-3.png',
        }),
      ]);
      mockFileExists.mockReturnValue(true);
      mockRunQuery.mockResolvedValueOnce({
        lastInsertRowId: 0,
        changes: 3,
      });

      await deleteSignaturesByProfile('profile-1');

      // Should check and delete files for sigs with image_uri
      expect(mockFileExists).toHaveBeenCalledWith('file:///sigs/sig-1.png');
      expect(mockDeleteFile).toHaveBeenCalledWith('file:///sigs/sig-1.png');
      expect(mockFileExists).toHaveBeenCalledWith('file:///sigs/sig-3.png');
      expect(mockDeleteFile).toHaveBeenCalledWith('file:///sigs/sig-3.png');
      // Should NOT try to delete for typed sig with no imageUri
      expect(mockFileExists).toHaveBeenCalledTimes(2);
    });

    it('should return 0 when no signatures exist', async () => {
      mockGetAll.mockResolvedValueOnce([]);
      mockRunQuery.mockResolvedValueOnce({
        lastInsertRowId: 0,
        changes: 0,
      });

      const count = await deleteSignaturesByProfile('profile-1');
      expect(count).toBe(0);
    });

    it('should continue deletion even if individual file cleanup fails', async () => {
      mockGetAll.mockResolvedValueOnce([
        makeDrawnRow({ image_uri: 'file:///sigs/sig-1.png' }),
        makeDrawnRow({
          id: 'sig-3',
          image_uri: 'file:///sigs/sig-3.png',
        }),
      ]);
      // First file cleanup fails, second succeeds
      mockFileExists
        .mockImplementationOnce(() => {
          throw new Error('disk error');
        })
        .mockReturnValueOnce(true);
      mockRunQuery.mockResolvedValueOnce({
        lastInsertRowId: 0,
        changes: 2,
      });

      const count = await deleteSignaturesByProfile('profile-1');
      expect(count).toBe(2);

      // Should still have attempted cleanup for the second file
      expect(mockDeleteFile).toHaveBeenCalledWith('file:///sigs/sig-3.png');
    });
  });

  // ── Row mapping edge cases ─────────────────────────────────────────

  describe('row mapping', () => {
    it('should handle typed signature row correctly', async () => {
      mockGetFirst.mockResolvedValueOnce(makeTypedRow());

      const result = await getSignatureById('sig-2');

      expect(result).not.toBeNull();
      expect(result!.type).toBe('typed');
      expect(result!.text).toBe('John Doe');
      expect(result!.fontFamily).toBe('Dancing Script');
      expect(result!.imageUri).toBeUndefined();
      expect(result!.svgPath).toBeUndefined();
    });

    it('should handle default signature flag correctly', async () => {
      mockGetFirst.mockResolvedValueOnce(makeDrawnRow({ is_default: 1 }));
      const defaultSig = await getSignatureById('sig-1');
      expect(defaultSig!.isDefault).toBe(true);

      mockGetFirst.mockResolvedValueOnce(makeDrawnRow({ is_default: 0 }));
      const nonDefaultSig = await getSignatureById('sig-1');
      expect(nonDefaultSig!.isDefault).toBe(false);
    });
  });
});
