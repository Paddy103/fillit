import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — vi.hoisted() ensures variables are available inside vi.mock factories
// ---------------------------------------------------------------------------

const { mockRandomUUID, mockRunQuery, mockGetFirst, mockGetAll, mockWithTransaction } = vi.hoisted(
  () => {
    let uuidCounter = 0;
    return {
      mockRandomUUID: vi.fn(() => `uuid-${++uuidCounter}`),
      mockRunQuery: vi.fn(async () => ({ lastInsertRowId: 1, changes: 1 })),
      mockGetFirst: vi.fn(async () => null),
      mockGetAll: vi.fn(async () => []),
      mockWithTransaction: vi.fn(async (cb: () => Promise<void>) => cb()),
    };
  },
);

vi.mock('expo-crypto', () => ({
  randomUUID: mockRandomUUID,
}));

vi.mock('../services/storage/database', () => ({
  runQuery: mockRunQuery,
  getFirst: mockGetFirst,
  getAll: mockGetAll,
  withTransaction: mockWithTransaction,
}));

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import {
  createAddress,
  getAddressById,
  getAddressesByProfile,
  updateAddress,
  deleteAddress,
  countAddressesByProfile,
  getDefaultAddress,
  setDefaultAddress,
  deleteAddressesByProfile,
  type CreateAddressInput,
} from '../services/storage/addressCrud';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeAddressRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'addr-1',
    profile_id: 'profile-1',
    label: 'Home',
    street1: '123 Main St',
    street2: null,
    suburb: 'Sandton',
    city: 'Johannesburg',
    province: 'Gauteng',
    postal_code: '2196',
    country: 'South Africa',
    is_default: 0,
    ...overrides,
  };
}

function makeCreateInput(overrides: Partial<CreateAddressInput> = {}): CreateAddressInput {
  return {
    profileId: 'profile-1',
    label: 'Home',
    street1: '123 Main St',
    city: 'Johannesburg',
    province: 'Gauteng',
    postalCode: '2196',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Address CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset UUID counter by restoring mock to return sequential IDs
    let counter = 0;
    mockRandomUUID.mockImplementation(() => `uuid-${++counter}`);
    // Reset defaults
    mockRunQuery.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
    mockGetFirst.mockResolvedValue(null);
    mockGetAll.mockResolvedValue([]);
    mockWithTransaction.mockImplementation(async (cb: () => Promise<void>) => cb());
  });

  // ── createAddress ─────────────────────────────────────────────────

  describe('createAddress', () => {
    it('should create an address with a generated UUID', async () => {
      const input = makeCreateInput();
      const result = await createAddress(input);

      expect(result.id).toBe('uuid-1');
      expect(mockRandomUUID).toHaveBeenCalledOnce();
    });

    it('should insert into the addresses table with correct values', async () => {
      const input = makeCreateInput({
        suburb: 'Sandton',
        street2: 'Suite 100',
      });

      await createAddress(input);

      // Find the INSERT call
      const insertCall = mockRunQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO addresses'),
      );
      expect(insertCall).toBeDefined();
      expect(insertCall![1]).toEqual([
        'uuid-1',
        'profile-1',
        'Home',
        '123 Main St',
        'Suite 100',
        'Sandton',
        'Johannesburg',
        'Gauteng',
        '2196',
        'South Africa',
        0,
      ]);
    });

    it('should default country to "South Africa"', async () => {
      const result = await createAddress(makeCreateInput());
      expect(result.country).toBe('South Africa');
    });

    it('should accept a custom country', async () => {
      const result = await createAddress(makeCreateInput({ country: 'Namibia' }));
      expect(result.country).toBe('Namibia');
    });

    it('should default isDefault to false', async () => {
      const result = await createAddress(makeCreateInput());
      expect(result.isDefault).toBe(false);
    });

    it('should set optional fields to undefined when not provided', async () => {
      const result = await createAddress(makeCreateInput());
      expect(result.street2).toBeUndefined();
      expect(result.suburb).toBeUndefined();
    });

    it('should return the complete address object', async () => {
      const input = makeCreateInput({
        suburb: 'Sandton',
        street2: 'Unit 5',
      });
      const result = await createAddress(input);

      expect(result).toEqual({
        id: 'uuid-1',
        label: 'Home',
        street1: '123 Main St',
        street2: 'Unit 5',
        suburb: 'Sandton',
        city: 'Johannesburg',
        province: 'Gauteng',
        postalCode: '2196',
        country: 'South Africa',
        isDefault: false,
      });
    });

    it('should run within a transaction', async () => {
      await createAddress(makeCreateInput());
      expect(mockWithTransaction).toHaveBeenCalledOnce();
    });

    it('should clear existing defaults when isDefault is true', async () => {
      await createAddress(makeCreateInput({ isDefault: true }));

      // Should have an UPDATE to clear existing defaults
      const clearCall = mockRunQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('UPDATE addresses SET is_default = 0') &&
          sql.includes('profile_id = ?') &&
          sql.includes('is_default = 1'),
      );
      expect(clearCall).toBeDefined();
      expect(clearCall![1]).toEqual(['profile-1']);
    });

    it('should not clear defaults when isDefault is false', async () => {
      await createAddress(makeCreateInput({ isDefault: false }));

      const clearCall = mockRunQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('UPDATE addresses SET is_default = 0') && sql.includes('profile_id = ?'),
      );
      expect(clearCall).toBeUndefined();
    });

    it('should pass null for optional fields when not provided', async () => {
      await createAddress(makeCreateInput());

      const insertCall = mockRunQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO addresses'),
      );
      // street2 and suburb should be null
      expect(insertCall![1][4]).toBeNull(); // street2
      expect(insertCall![1][5]).toBeNull(); // suburb
    });
  });

  // ── getAddressById ────────────────────────────────────────────────

  describe('getAddressById', () => {
    it('should return null when address not found', async () => {
      mockGetFirst.mockResolvedValueOnce(null);
      const result = await getAddressById('nonexistent');
      expect(result).toBeNull();
    });

    it('should return the mapped address when found', async () => {
      const row = makeAddressRow({ is_default: 1 });
      mockGetFirst.mockResolvedValueOnce(row);

      const result = await getAddressById('addr-1');

      expect(result).toEqual({
        id: 'addr-1',
        label: 'Home',
        street1: '123 Main St',
        street2: undefined,
        suburb: 'Sandton',
        city: 'Johannesburg',
        province: 'Gauteng',
        postalCode: '2196',
        country: 'South Africa',
        isDefault: true,
      });
    });

    it('should query with the correct SQL and params', async () => {
      mockGetFirst.mockResolvedValueOnce(null);
      await getAddressById('addr-42');

      expect(mockGetFirst).toHaveBeenCalledWith('SELECT * FROM addresses WHERE id = ?', [
        'addr-42',
      ]);
    });

    it('should map is_default 0 to false', async () => {
      mockGetFirst.mockResolvedValueOnce(makeAddressRow({ is_default: 0 }));
      const result = await getAddressById('addr-1');
      expect(result!.isDefault).toBe(false);
    });

    it('should map is_default 1 to true', async () => {
      mockGetFirst.mockResolvedValueOnce(makeAddressRow({ is_default: 1 }));
      const result = await getAddressById('addr-1');
      expect(result!.isDefault).toBe(true);
    });

    it('should map null street2 to undefined', async () => {
      mockGetFirst.mockResolvedValueOnce(makeAddressRow({ street2: null }));
      const result = await getAddressById('addr-1');
      expect(result!.street2).toBeUndefined();
    });

    it('should map non-null street2 to string', async () => {
      mockGetFirst.mockResolvedValueOnce(makeAddressRow({ street2: 'Apt 5' }));
      const result = await getAddressById('addr-1');
      expect(result!.street2).toBe('Apt 5');
    });

    it('should default country to "South Africa" when null', async () => {
      mockGetFirst.mockResolvedValueOnce(makeAddressRow({ country: null }));
      const result = await getAddressById('addr-1');
      expect(result!.country).toBe('South Africa');
    });
  });

  // ── getAddressesByProfile ─────────────────────────────────────────

  describe('getAddressesByProfile', () => {
    it('should return empty array when no addresses exist', async () => {
      mockGetAll.mockResolvedValueOnce([]);
      const result = await getAddressesByProfile('profile-1');
      expect(result).toEqual([]);
    });

    it('should return mapped addresses', async () => {
      const rows = [
        makeAddressRow({ id: 'addr-1', label: 'Home', is_default: 1 }),
        makeAddressRow({ id: 'addr-2', label: 'Work', is_default: 0 }),
      ];
      mockGetAll.mockResolvedValueOnce(rows);

      const result = await getAddressesByProfile('profile-1');
      expect(result).toHaveLength(2);
      expect(result[0]!.id).toBe('addr-1');
      expect(result[0]!.isDefault).toBe(true);
      expect(result[1]!.id).toBe('addr-2');
      expect(result[1]!.isDefault).toBe(false);
    });

    it('should order by is_default DESC, label ASC', async () => {
      await getAddressesByProfile('profile-1');
      expect(mockGetAll).toHaveBeenCalledWith(
        'SELECT * FROM addresses WHERE profile_id = ? ORDER BY is_default DESC, label ASC',
        ['profile-1'],
      );
    });
  });

  // ── updateAddress ─────────────────────────────────────────────────

  describe('updateAddress', () => {
    it('should return null when address not found after update', async () => {
      // getAddressById will return null after the update
      mockGetFirst.mockResolvedValue(null);

      const result = await updateAddress('nonexistent', { label: 'New Label' });
      expect(result).toBeNull();
    });

    it('should return the current address when no fields are provided', async () => {
      const row = makeAddressRow();
      mockGetFirst.mockResolvedValueOnce(row);

      const result = await updateAddress('addr-1', {});
      // Should call getAddressById, not runQuery for UPDATE
      expect(mockGetFirst).toHaveBeenCalledWith('SELECT * FROM addresses WHERE id = ?', ['addr-1']);
      expect(result).not.toBeNull();
    });

    it('should build correct SET clause for single field update', async () => {
      const updatedRow = makeAddressRow({ label: 'Office' });
      mockGetFirst.mockResolvedValueOnce(updatedRow);

      await updateAddress('addr-1', { label: 'Office' });

      const updateCall = mockRunQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('UPDATE addresses SET'),
      );
      expect(updateCall).toBeDefined();
      expect(updateCall![0]).toBe('UPDATE addresses SET label = ? WHERE id = ?');
      expect(updateCall![1]).toEqual(['Office', 'addr-1']);
    });

    it('should build correct SET clause for multiple field updates', async () => {
      const updatedRow = makeAddressRow({
        label: 'Office',
        city: 'Cape Town',
        province: 'Western Cape',
      });
      mockGetFirst.mockResolvedValueOnce(updatedRow);

      await updateAddress('addr-1', {
        label: 'Office',
        city: 'Cape Town',
        province: 'Western Cape',
      });

      const updateCall = mockRunQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('UPDATE addresses SET'),
      );
      expect(updateCall![0]).toBe(
        'UPDATE addresses SET label = ?, city = ?, province = ? WHERE id = ?',
      );
      expect(updateCall![1]).toEqual(['Office', 'Cape Town', 'Western Cape', 'addr-1']);
    });

    it('should allow setting street2 to null', async () => {
      mockGetFirst.mockResolvedValueOnce(makeAddressRow());

      await updateAddress('addr-1', { street2: null });

      const updateCall = mockRunQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('UPDATE addresses SET'),
      );
      expect(updateCall![0]).toContain('street2 = ?');
      expect(updateCall![1]).toContain(null);
    });

    it('should allow setting suburb to null', async () => {
      mockGetFirst.mockResolvedValueOnce(makeAddressRow());

      await updateAddress('addr-1', { suburb: null });

      const updateCall = mockRunQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('UPDATE addresses SET'),
      );
      expect(updateCall![0]).toContain('suburb = ?');
      expect(updateCall![1]).toContain(null);
    });

    it('should update postalCode mapping to postal_code column', async () => {
      mockGetFirst.mockResolvedValueOnce(makeAddressRow());

      await updateAddress('addr-1', { postalCode: '8001' });

      const updateCall = mockRunQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('UPDATE addresses SET'),
      );
      expect(updateCall![0]).toContain('postal_code = ?');
      expect(updateCall![1]).toContain('8001');
    });

    it('should run within a transaction', async () => {
      mockGetFirst.mockResolvedValueOnce(makeAddressRow());

      await updateAddress('addr-1', { label: 'New' });
      expect(mockWithTransaction).toHaveBeenCalledOnce();
    });

    it('should clear other defaults when isDefault is set to true', async () => {
      // First call: lookup profile_id for this address
      mockGetFirst
        .mockResolvedValueOnce({ profile_id: 'profile-1' }) // lookup
        .mockResolvedValueOnce(makeAddressRow({ is_default: 1 })); // final getAddressById

      await updateAddress('addr-1', { isDefault: true });

      const clearCall = mockRunQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('UPDATE addresses SET is_default = 0') && sql.includes('id != ?'),
      );
      expect(clearCall).toBeDefined();
      expect(clearCall![1]).toEqual(['profile-1', 'addr-1']);
    });

    it('should not clear defaults when isDefault is false', async () => {
      mockGetFirst.mockResolvedValueOnce(makeAddressRow());

      await updateAddress('addr-1', { isDefault: false });

      const clearCall = mockRunQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('UPDATE addresses SET is_default = 0') && sql.includes('profile_id = ?'),
      );
      expect(clearCall).toBeUndefined();
    });

    it('should convert isDefault boolean to integer for SQL', async () => {
      mockGetFirst
        .mockResolvedValueOnce({ profile_id: 'profile-1' })
        .mockResolvedValueOnce(makeAddressRow({ is_default: 1 }));

      await updateAddress('addr-1', { isDefault: true });

      const updateCall = mockRunQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('UPDATE addresses SET is_default = ?') && sql.includes('WHERE id = ?'),
      );
      expect(updateCall).toBeDefined();
      // isDefault = true should be 1
      expect(updateCall![1]).toContain(1);
    });
  });

  // ── deleteAddress ─────────────────────────────────────────────────

  describe('deleteAddress', () => {
    it('should return true when a row is deleted', async () => {
      mockRunQuery.mockResolvedValueOnce({ lastInsertRowId: 0, changes: 1 });
      const result = await deleteAddress('addr-1');
      expect(result).toBe(true);
    });

    it('should return false when no row was found', async () => {
      mockRunQuery.mockResolvedValueOnce({ lastInsertRowId: 0, changes: 0 });
      const result = await deleteAddress('nonexistent');
      expect(result).toBe(false);
    });

    it('should execute correct SQL', async () => {
      await deleteAddress('addr-1');
      expect(mockRunQuery).toHaveBeenCalledWith('DELETE FROM addresses WHERE id = ?', ['addr-1']);
    });
  });

  // ── countAddressesByProfile ───────────────────────────────────────

  describe('countAddressesByProfile', () => {
    it('should return the count of addresses', async () => {
      mockGetFirst.mockResolvedValueOnce({ count: 3 });
      const result = await countAddressesByProfile('profile-1');
      expect(result).toBe(3);
    });

    it('should return 0 when no addresses exist', async () => {
      mockGetFirst.mockResolvedValueOnce({ count: 0 });
      const result = await countAddressesByProfile('profile-1');
      expect(result).toBe(0);
    });

    it('should return 0 when query returns null', async () => {
      mockGetFirst.mockResolvedValueOnce(null);
      const result = await countAddressesByProfile('profile-1');
      expect(result).toBe(0);
    });

    it('should execute correct SQL', async () => {
      await countAddressesByProfile('profile-1');
      expect(mockGetFirst).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM addresses WHERE profile_id = ?',
        ['profile-1'],
      );
    });
  });

  // ── getDefaultAddress ─────────────────────────────────────────────

  describe('getDefaultAddress', () => {
    it('should return null when no default is set', async () => {
      mockGetFirst.mockResolvedValueOnce(null);
      const result = await getDefaultAddress('profile-1');
      expect(result).toBeNull();
    });

    it('should return the default address', async () => {
      mockGetFirst.mockResolvedValueOnce(makeAddressRow({ is_default: 1 }));
      const result = await getDefaultAddress('profile-1');

      expect(result).not.toBeNull();
      expect(result!.isDefault).toBe(true);
    });

    it('should query with correct SQL', async () => {
      await getDefaultAddress('profile-1');
      expect(mockGetFirst).toHaveBeenCalledWith(
        'SELECT * FROM addresses WHERE profile_id = ? AND is_default = 1',
        ['profile-1'],
      );
    });
  });

  // ── setDefaultAddress ─────────────────────────────────────────────

  describe('setDefaultAddress', () => {
    it('should return null when address not found', async () => {
      mockGetFirst.mockResolvedValueOnce(null);
      const result = await setDefaultAddress('nonexistent');
      expect(result).toBeNull();
    });

    it('should clear existing defaults and set new default', async () => {
      const row = makeAddressRow({ profile_id: 'profile-1' });
      mockGetFirst
        .mockResolvedValueOnce(row) // initial lookup
        .mockResolvedValueOnce(makeAddressRow({ is_default: 1 })); // final getAddressById

      await setDefaultAddress('addr-1');

      // Should clear all defaults for the profile
      const clearCall = mockRunQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('UPDATE addresses SET is_default = 0') && sql.includes('profile_id = ?'),
      );
      expect(clearCall).toBeDefined();
      expect(clearCall![1]).toEqual(['profile-1']);

      // Should set the new default
      const setCall = mockRunQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('UPDATE addresses SET is_default = 1') && sql.includes('WHERE id = ?'),
      );
      expect(setCall).toBeDefined();
      expect(setCall![1]).toEqual(['addr-1']);
    });

    it('should run within a transaction', async () => {
      mockGetFirst
        .mockResolvedValueOnce(makeAddressRow())
        .mockResolvedValueOnce(makeAddressRow({ is_default: 1 }));

      await setDefaultAddress('addr-1');
      expect(mockWithTransaction).toHaveBeenCalledOnce();
    });

    it('should return the updated address', async () => {
      mockGetFirst
        .mockResolvedValueOnce(makeAddressRow())
        .mockResolvedValueOnce(makeAddressRow({ is_default: 1 }));

      const result = await setDefaultAddress('addr-1');
      expect(result).not.toBeNull();
      expect(result!.isDefault).toBe(true);
    });
  });

  // ── deleteAddressesByProfile ──────────────────────────────────────

  describe('deleteAddressesByProfile', () => {
    it('should return the number of deleted addresses', async () => {
      mockRunQuery.mockResolvedValueOnce({ lastInsertRowId: 0, changes: 3 });
      const result = await deleteAddressesByProfile('profile-1');
      expect(result).toBe(3);
    });

    it('should return 0 when no addresses exist', async () => {
      mockRunQuery.mockResolvedValueOnce({ lastInsertRowId: 0, changes: 0 });
      const result = await deleteAddressesByProfile('profile-1');
      expect(result).toBe(0);
    });

    it('should execute correct SQL', async () => {
      await deleteAddressesByProfile('profile-1');
      expect(mockRunQuery).toHaveBeenCalledWith('DELETE FROM addresses WHERE profile_id = ?', [
        'profile-1',
      ]);
    });
  });

  // ── SA-specific fields ────────────────────────────────────────────

  describe('SA-specific address fields', () => {
    it('should store suburb (SA-specific field)', async () => {
      const input = makeCreateInput({ suburb: 'Bryanston' });
      const result = await createAddress(input);
      expect(result.suburb).toBe('Bryanston');
    });

    it('should store SA province', async () => {
      const input = makeCreateInput({ province: 'KwaZulu-Natal' });
      const result = await createAddress(input);
      expect(result.province).toBe('KwaZulu-Natal');
    });

    it('should store 4-digit SA postal code', async () => {
      const input = makeCreateInput({ postalCode: '4001' });
      const result = await createAddress(input);
      expect(result.postalCode).toBe('4001');
    });

    it('should store all 9 SA provinces correctly', async () => {
      const provinces = [
        'Eastern Cape',
        'Free State',
        'Gauteng',
        'KwaZulu-Natal',
        'Limpopo',
        'Mpumalanga',
        'North West',
        'Northern Cape',
        'Western Cape',
      ];

      for (const province of provinces) {
        vi.clearAllMocks();
        mockWithTransaction.mockImplementation(async (cb: () => Promise<void>) => cb());
        mockRunQuery.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });

        const input = makeCreateInput({ province });
        const result = await createAddress(input);
        expect(result.province).toBe(province);
      }
    });

    it('should support various address label types', async () => {
      const labels = ['Home', 'Work', 'Mailing', 'Postal', 'Custom Label'];

      for (const label of labels) {
        vi.clearAllMocks();
        mockWithTransaction.mockImplementation(async (cb: () => Promise<void>) => cb());
        mockRunQuery.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });

        const input = makeCreateInput({ label });
        const result = await createAddress(input);
        expect(result.label).toBe(label);
      }
    });
  });

  // ── Row to domain mapping ─────────────────────────────────────────

  describe('row mapping', () => {
    it('should correctly map all database columns to Address fields', async () => {
      const row = {
        id: 'addr-99',
        profile_id: 'profile-5',
        label: 'Postal',
        street1: '456 Oak Ave',
        street2: 'Building B',
        suburb: 'Rosebank',
        city: 'Cape Town',
        province: 'Western Cape',
        postal_code: '8001',
        country: 'Namibia',
        is_default: 1,
      };
      mockGetFirst.mockResolvedValueOnce(row);

      const result = await getAddressById('addr-99');

      expect(result).toEqual({
        id: 'addr-99',
        label: 'Postal',
        street1: '456 Oak Ave',
        street2: 'Building B',
        suburb: 'Rosebank',
        city: 'Cape Town',
        province: 'Western Cape',
        postalCode: '8001',
        country: 'Namibia',
        isDefault: true,
      });
    });

    it('should handle null suburb', async () => {
      mockGetFirst.mockResolvedValueOnce(makeAddressRow({ suburb: null }));
      const result = await getAddressById('addr-1');
      expect(result!.suburb).toBeUndefined();
    });

    it('should handle non-null suburb', async () => {
      mockGetFirst.mockResolvedValueOnce(makeAddressRow({ suburb: 'Melville' }));
      const result = await getAddressById('addr-1');
      expect(result!.suburb).toBe('Melville');
    });
  });
});
