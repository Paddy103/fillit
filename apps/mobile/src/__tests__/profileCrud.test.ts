import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────

// Mock expo native modules that are pulled in transitively
vi.mock('expo-crypto', () => ({
  getRandomBytes: vi.fn(() => new Uint8Array(12)),
}));

vi.mock('expo-file-system', () => ({
  Paths: { document: { uri: 'file:///mock/' } },
  File: vi.fn(),
  Directory: vi.fn(),
}));

vi.mock('expo-sqlite', () => ({
  openDatabaseAsync: vi.fn(),
  deleteDatabaseAsync: vi.fn(),
}));

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
  isAvailableAsync: vi.fn(() => Promise.resolve(true)),
  AFTER_FIRST_UNLOCK: 1,
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 2,
  WHEN_UNLOCKED: 3,
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 4,
  WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 5,
  ALWAYS: 6,
  ALWAYS_THIS_DEVICE_ONLY: 7,
}));

// Mock encryption — uses simple identity transform for testing
vi.mock('../utils/encryption', () => ({
  encrypt: vi.fn(async (plaintext: string) => `encrypted:${plaintext}`),
  decrypt: vi.fn(async (encrypted: string) => {
    if (encrypted.startsWith('encrypted:')) {
      return encrypted.slice('encrypted:'.length);
    }
    return encrypted;
  }),
}));

// Mock the database module
const mockRunQuery = vi.fn();
const mockGetFirst = vi.fn();
const mockGetAll = vi.fn();
const mockWithTransaction = vi.fn();

vi.mock('../services/storage/database', () => ({
  runQuery: (...args: unknown[]) => mockRunQuery(...args),
  getFirst: (...args: unknown[]) => mockGetFirst(...args),
  getAll: (...args: unknown[]) => mockGetAll(...args),
  withTransaction: (...args: unknown[]) => mockWithTransaction(...args),
}));

vi.mock('../services/storage/databaseErrors', () => {
  class QueryError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'QueryError';
    }
  }
  return { QueryError };
});

// ─── Imports (after mocks) ──────────────────────────────────────────

import {
  createProfile,
  getProfileById,
  listProfiles,
  getPrimaryProfile,
  updateProfile,
  deleteProfile,
  getProfileCount,
  createAddress,
  getAddressesByProfileId,
  updateAddress,
  deleteAddress,
  createIdentityDocument,
  getIdentityDocumentsByProfileId,
  updateIdentityDocument,
  deleteIdentityDocument,
  createProfessionalRegistration,
  getProfessionalRegistrationsByProfileId,
  updateProfessionalRegistration,
  deleteProfessionalRegistration,
  createEmergencyContact,
  getEmergencyContactsByProfileId,
  updateEmergencyContact,
  deleteEmergencyContact,
  createFullProfile,
} from '../services/storage/profileCrud';

import { encrypt, decrypt } from '../utils/encryption';

// ─── Test Data ──────────────────────────────────────────────────────

const PROFILE_ID = 'test-profile-123';
const ADDRESS_ID = 'test-address-456';
const DOC_ID = 'test-doc-789';
const REG_ID = 'test-reg-101';
const CONTACT_ID = 'test-contact-202';

const sampleProfileInput = {
  id: PROFILE_ID,
  isPrimary: true,
  firstName: 'John',
  lastName: 'Doe',
  middleName: 'Michael',
  maidenName: undefined,
  dateOfBirth: '1990-01-15',
  gender: 'male' as const,
  nationality: 'South African',
  maritalStatus: 'single' as const,
  saIdNumber: '9001155000083',
  citizenship: 'citizen' as const,
  email: 'john.doe@example.com',
  phoneMobile: '+27821234567',
  phoneWork: '+27111234567',
  employer: 'Acme Corp',
  jobTitle: 'Software Engineer',
  workPhone: '+27111234568',
  workAddress: undefined,
  employeeNumber: 'EMP001',
  industry: 'Technology',
  highestQualification: 'BSc Computer Science',
  institution: 'University of Cape Town',
  yearCompleted: 2012,
  studentNumber: 'STU12345',
};

const sampleProfileRow = {
  id: PROFILE_ID,
  is_primary: 1,
  relationship: null,
  first_name: 'John',
  middle_name: 'Michael',
  last_name: 'Doe',
  maiden_name: null,
  date_of_birth: '1990-01-15',
  gender: 'male',
  nationality: 'South African',
  marital_status: 'single',
  sa_id_number_encrypted: 'encrypted:9001155000083',
  citizenship: 'citizen',
  email: 'john.doe@example.com',
  phone_mobile: '+27821234567',
  phone_work: '+27111234567',
  employer: 'Acme Corp',
  job_title: 'Software Engineer',
  work_phone: '+27111234568',
  employee_number: 'EMP001',
  industry: 'Technology',
  highest_qualification: 'BSc Computer Science',
  institution: 'University of Cape Town',
  year_completed: 2012,
  student_number: 'STU12345',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const sampleAddressRow = {
  id: ADDRESS_ID,
  profile_id: PROFILE_ID,
  label: 'Home',
  street1: '123 Main St',
  street2: 'Apt 4',
  suburb: 'Gardens',
  city: 'Cape Town',
  province: 'Western Cape',
  postal_code: '8001',
  country: 'South Africa',
  is_default: 1,
};

const sampleIdentityDocRow = {
  id: DOC_ID,
  profile_id: PROFILE_ID,
  type: 'sa_smart_id',
  label: 'Smart ID Card',
  encrypted_number: 'encrypted:9001155000083',
  issue_date: '2020-06-15',
  expiry_date: '2030-06-15',
  issuing_authority: 'DHA',
  additional_fields_encrypted: 'encrypted:{"cardNumber":"ABC123"}',
};

const sampleProfRegRow = {
  id: REG_ID,
  profile_id: PROFILE_ID,
  body: 'SAICA',
  registration_number_encrypted: 'encrypted:REG12345',
  expiry_date: '2027-12-31',
};

const sampleEmergencyContactRow = {
  id: CONTACT_ID,
  profile_id: PROFILE_ID,
  name: 'Jane Doe',
  relationship: 'spouse',
  phone: '+27821112222',
  email: 'jane@example.com',
  address_json: null,
};

// ─── Helpers ────────────────────────────────────────────────────────

function setupTransactionMock() {
  mockWithTransaction.mockImplementation(async (callback: () => Promise<void>) => {
    await callback();
  });
}

// ─── Test Suite ─────────────────────────────────────────────────────

describe('Profile CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupTransactionMock();
    mockRunQuery.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
  });

  // ── createProfile ──────────────────────────────────────────────────

  describe('createProfile', () => {
    it('should create a profile with all fields', async () => {
      const result = await createProfile(sampleProfileInput);

      expect(result.id).toBe(PROFILE_ID);
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.isPrimary).toBe(true);
      expect(result.email).toBe('john.doe@example.com');
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(result.addresses).toEqual([]);
      expect(result.documents).toEqual([]);
      expect(result.professionalRegistrations).toEqual([]);
      expect(result.emergencyContacts).toEqual([]);
      expect(result.signatures).toEqual([]);
    });

    it('should call runQuery with INSERT SQL', async () => {
      await createProfile(sampleProfileInput);

      expect(mockRunQuery).toHaveBeenCalledTimes(1);
      const [sql] = mockRunQuery.mock.calls[0];
      expect(sql).toContain('INSERT INTO profiles');
    });

    it('should encrypt the SA ID number', async () => {
      await createProfile(sampleProfileInput);

      expect(encrypt).toHaveBeenCalledWith('9001155000083');
      const [, params] = mockRunQuery.mock.calls[0];
      // sa_id_number_encrypted is at index 11 (0-based)
      expect(params[11]).toBe('encrypted:9001155000083');
    });

    it('should handle missing optional fields', async () => {
      const minimalInput = {
        id: 'minimal-id',
        isPrimary: false,
        firstName: 'Jane',
        lastName: 'Smith',
        dateOfBirth: '',
        nationality: 'South African',
        email: '',
        phoneMobile: '',
      };

      const result = await createProfile(minimalInput);

      expect(result.id).toBe('minimal-id');
      expect(result.firstName).toBe('Jane');
      expect(result.saIdNumber).toBeUndefined();
      expect(encrypt).not.toHaveBeenCalled();
    });

    it('should generate an ID if not provided', async () => {
      const input = {
        ...sampleProfileInput,
        id: '',
      };

      const result = await createProfile(input);

      // Should have a non-empty generated ID
      expect(result.id).toBeTruthy();
      expect(result.id).not.toBe('');
    });

    it('should pass null for SA ID when not provided', async () => {
      const input = { ...sampleProfileInput, saIdNumber: undefined };
      await createProfile(input);

      const [, params] = mockRunQuery.mock.calls[0];
      expect(params[11]).toBeNull();
    });

    it('should set created_at and updated_at to current timestamp', async () => {
      const before = new Date().toISOString();
      const result = await createProfile(sampleProfileInput);
      const after = new Date().toISOString();

      expect(result.createdAt >= before).toBe(true);
      expect(result.createdAt <= after).toBe(true);
      expect(result.updatedAt).toBe(result.createdAt);
    });
  });

  // ── getProfileById ─────────────────────────────────────────────────

  describe('getProfileById', () => {
    it('should return null when profile not found', async () => {
      mockGetFirst.mockResolvedValueOnce(null);

      const result = await getProfileById('nonexistent');

      expect(result).toBeNull();
    });

    it('should return a full profile with all child entities', async () => {
      mockGetFirst.mockResolvedValueOnce(sampleProfileRow);
      mockGetAll
        .mockResolvedValueOnce([sampleAddressRow]) // addresses
        .mockResolvedValueOnce([sampleIdentityDocRow]) // identity docs
        .mockResolvedValueOnce([sampleProfRegRow]) // prof regs
        .mockResolvedValueOnce([sampleEmergencyContactRow]); // emergency contacts

      const result = await getProfileById(PROFILE_ID);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(PROFILE_ID);
      expect(result!.firstName).toBe('John');
      expect(result!.isPrimary).toBe(true);
      expect(result!.addresses).toHaveLength(1);
      expect(result!.documents).toHaveLength(1);
      expect(result!.professionalRegistrations).toHaveLength(1);
      expect(result!.emergencyContacts).toHaveLength(1);
    });

    it('should decrypt the SA ID number', async () => {
      mockGetFirst.mockResolvedValueOnce(sampleProfileRow);
      mockGetAll
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await getProfileById(PROFILE_ID);

      expect(decrypt).toHaveBeenCalledWith('encrypted:9001155000083');
      expect(result!.saIdNumber).toBe('9001155000083');
    });

    it('should decrypt identity document numbers', async () => {
      mockGetFirst.mockResolvedValueOnce(sampleProfileRow);
      mockGetAll
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([sampleIdentityDocRow])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await getProfileById(PROFILE_ID);

      expect(result!.documents[0]!.number).toBe('9001155000083');
      expect(result!.documents[0]!.additionalFields).toEqual({ cardNumber: 'ABC123' });
    });

    it('should decrypt professional registration numbers', async () => {
      mockGetFirst.mockResolvedValueOnce(sampleProfileRow);
      mockGetAll
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([sampleProfRegRow])
        .mockResolvedValueOnce([]);

      const result = await getProfileById(PROFILE_ID);

      expect(result!.professionalRegistrations[0]!.registrationNumber).toBe('REG12345');
    });

    it('should map address rows correctly', async () => {
      mockGetFirst.mockResolvedValueOnce(sampleProfileRow);
      mockGetAll
        .mockResolvedValueOnce([sampleAddressRow])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await getProfileById(PROFILE_ID);
      const addr = result!.addresses[0]!;

      expect(addr.id).toBe(ADDRESS_ID);
      expect(addr.label).toBe('Home');
      expect(addr.street1).toBe('123 Main St');
      expect(addr.street2).toBe('Apt 4');
      expect(addr.suburb).toBe('Gardens');
      expect(addr.city).toBe('Cape Town');
      expect(addr.province).toBe('Western Cape');
      expect(addr.postalCode).toBe('8001');
      expect(addr.country).toBe('South Africa');
      expect(addr.isDefault).toBe(true);
    });

    it('should map emergency contact rows correctly', async () => {
      mockGetFirst.mockResolvedValueOnce(sampleProfileRow);
      mockGetAll
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([sampleEmergencyContactRow]);

      const result = await getProfileById(PROFILE_ID);
      const contact = result!.emergencyContacts[0]!;

      expect(contact.id).toBe(CONTACT_ID);
      expect(contact.firstName).toBe('Jane');
      expect(contact.lastName).toBe('Doe');
      expect(contact.relationship).toBe('spouse');
      expect(contact.phoneMobile).toBe('+27821112222');
      expect(contact.email).toBe('jane@example.com');
    });

    it('should return empty child arrays when profile has no children', async () => {
      mockGetFirst.mockResolvedValueOnce(sampleProfileRow);
      mockGetAll
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await getProfileById(PROFILE_ID);

      expect(result!.addresses).toEqual([]);
      expect(result!.documents).toEqual([]);
      expect(result!.professionalRegistrations).toEqual([]);
      expect(result!.emergencyContacts).toEqual([]);
    });

    it('should handle profile without encrypted SA ID', async () => {
      const rowWithoutSaId = { ...sampleProfileRow, sa_id_number_encrypted: null };
      mockGetFirst.mockResolvedValueOnce(rowWithoutSaId);
      mockGetAll
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await getProfileById(PROFILE_ID);

      expect(result!.saIdNumber).toBeUndefined();
    });
  });

  // ── listProfiles ───────────────────────────────────────────────────

  describe('listProfiles', () => {
    it('should return empty array when no profiles exist', async () => {
      mockGetAll.mockResolvedValueOnce([]);

      const result = await listProfiles();

      expect(result).toEqual([]);
    });

    it('should return all profiles without child entities', async () => {
      const secondProfile = {
        ...sampleProfileRow,
        id: 'profile-2',
        is_primary: 0,
        first_name: 'Jane',
      };
      mockGetAll.mockResolvedValueOnce([sampleProfileRow, secondProfile]);

      const result = await listProfiles();

      expect(result).toHaveLength(2);
      expect(result[0]!.firstName).toBe('John');
      expect(result[1]!.firstName).toBe('Jane');
      // Child arrays should be empty (listProfiles doesn't fetch them)
      expect(result[0]!.addresses).toEqual([]);
      expect(result[0]!.documents).toEqual([]);
    });

    it('should order by isPrimary DESC then firstName ASC', async () => {
      mockGetAll.mockResolvedValueOnce([]);
      await listProfiles();

      const [sql] = mockGetAll.mock.calls[0];
      expect(sql).toContain('ORDER BY is_primary DESC, first_name ASC');
    });
  });

  // ── getPrimaryProfile ──────────────────────────────────────────────

  describe('getPrimaryProfile', () => {
    it('should return null when no primary profile exists', async () => {
      mockGetFirst.mockResolvedValueOnce(null);

      const result = await getPrimaryProfile();

      expect(result).toBeNull();
    });

    it('should return the primary profile with child entities', async () => {
      // First call: get primary profile row
      mockGetFirst
        .mockResolvedValueOnce(sampleProfileRow)
        // Second call: getProfileById calls getFirst
        .mockResolvedValueOnce(sampleProfileRow);
      mockGetAll
        .mockResolvedValueOnce([sampleAddressRow])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await getPrimaryProfile();

      expect(result).not.toBeNull();
      expect(result!.isPrimary).toBe(true);
      expect(result!.addresses).toHaveLength(1);
    });
  });

  // ── updateProfile ──────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('should return null when profile not found', async () => {
      mockGetFirst.mockResolvedValueOnce(null);

      const result = await updateProfile('nonexistent', { firstName: 'Updated' });

      expect(result).toBeNull();
    });

    it('should update only the provided fields', async () => {
      // First call: check exists
      mockGetFirst.mockResolvedValueOnce({ id: PROFILE_ID });

      // After update: getProfileById calls
      mockGetFirst.mockResolvedValueOnce(sampleProfileRow);
      mockGetAll
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await updateProfile(PROFILE_ID, { firstName: 'Updated' });

      expect(mockRunQuery).toHaveBeenCalled();
      const [sql] = mockRunQuery.mock.calls[0];
      expect(sql).toContain('UPDATE profiles SET');
      expect(sql).toContain('first_name = ?');
      expect(sql).toContain('updated_at = ?');
      expect(result).not.toBeNull();
    });

    it('should encrypt SA ID number when updating', async () => {
      mockGetFirst.mockResolvedValueOnce({ id: PROFILE_ID });
      mockGetFirst.mockResolvedValueOnce(sampleProfileRow);
      mockGetAll
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await updateProfile(PROFILE_ID, { saIdNumber: '9001155000083' });

      expect(encrypt).toHaveBeenCalledWith('9001155000083');
      const [sql] = mockRunQuery.mock.calls[0];
      expect(sql).toContain('sa_id_number_encrypted = ?');
    });

    it('should set SA ID to null when clearing it', async () => {
      mockGetFirst.mockResolvedValueOnce({ id: PROFILE_ID });
      mockGetFirst.mockResolvedValueOnce(sampleProfileRow);
      mockGetAll
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await updateProfile(PROFILE_ID, { saIdNumber: undefined });

      const [, params] = mockRunQuery.mock.calls[0];
      // The null value for SA ID should be in the params
      expect(params).toContain(null);
    });

    it('should return current profile when no fields to update', async () => {
      mockGetFirst
        .mockResolvedValueOnce({ id: PROFILE_ID })
        .mockResolvedValueOnce(sampleProfileRow);
      mockGetAll
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await updateProfile(PROFILE_ID, {});

      expect(result).not.toBeNull();
      // runQuery should not have been called for the update itself
      expect(mockRunQuery).not.toHaveBeenCalled();
    });

    it('should update multiple fields at once', async () => {
      mockGetFirst.mockResolvedValueOnce({ id: PROFILE_ID });
      mockGetFirst.mockResolvedValueOnce(sampleProfileRow);
      mockGetAll
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await updateProfile(PROFILE_ID, {
        firstName: 'Updated',
        lastName: 'Name',
        email: 'new@example.com',
      });

      const [sql, params] = mockRunQuery.mock.calls[0];
      expect(sql).toContain('first_name = ?');
      expect(sql).toContain('last_name = ?');
      expect(sql).toContain('email = ?');
      expect(params).toContain('Updated');
      expect(params).toContain('Name');
      expect(params).toContain('new@example.com');
    });

    it('should update isPrimary field correctly', async () => {
      mockGetFirst.mockResolvedValueOnce({ id: PROFILE_ID });
      mockGetFirst.mockResolvedValueOnce(sampleProfileRow);
      mockGetAll
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await updateProfile(PROFILE_ID, { isPrimary: false });

      const [sql, params] = mockRunQuery.mock.calls[0];
      expect(sql).toContain('is_primary = ?');
      expect(params).toContain(0);
    });
  });

  // ── deleteProfile ──────────────────────────────────────────────────

  describe('deleteProfile', () => {
    it('should return true when profile is deleted', async () => {
      mockRunQuery.mockResolvedValueOnce({ lastInsertRowId: 0, changes: 1 });

      const result = await deleteProfile(PROFILE_ID);

      expect(result).toBe(true);
      const [sql] = mockRunQuery.mock.calls[0];
      expect(sql).toContain('DELETE FROM profiles');
    });

    it('should return false when profile not found', async () => {
      mockRunQuery.mockResolvedValueOnce({ lastInsertRowId: 0, changes: 0 });

      const result = await deleteProfile('nonexistent');

      expect(result).toBe(false);
    });
  });

  // ── getProfileCount ────────────────────────────────────────────────

  describe('getProfileCount', () => {
    it('should return the total count of profiles', async () => {
      mockGetFirst.mockResolvedValueOnce({ count: 5 });

      const result = await getProfileCount();

      expect(result).toBe(5);
    });

    it('should return 0 when no profiles exist', async () => {
      mockGetFirst.mockResolvedValueOnce({ count: 0 });

      const result = await getProfileCount();

      expect(result).toBe(0);
    });

    it('should return 0 when query returns null', async () => {
      mockGetFirst.mockResolvedValueOnce(null);

      const result = await getProfileCount();

      expect(result).toBe(0);
    });
  });
});

// ─── Address CRUD ───────────────────────────────────────────────────

describe('Address CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWithTransaction.mockImplementation(async (cb: () => Promise<void>) => cb());
    mockRunQuery.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
  });

  describe('createAddress', () => {
    it('should create an address with all fields', async () => {
      const input = {
        id: ADDRESS_ID,
        label: 'Home',
        street1: '123 Main St',
        street2: 'Apt 4',
        suburb: 'Gardens',
        city: 'Cape Town',
        province: 'Western Cape',
        postalCode: '8001',
        country: 'South Africa',
        isDefault: true,
      };

      const result = await createAddress(PROFILE_ID, input);

      expect(result.id).toBe(ADDRESS_ID);
      expect(result.label).toBe('Home');
      expect(result.city).toBe('Cape Town');
      expect(result.isDefault).toBe(true);
    });

    it('should clear existing defaults when creating a default address', async () => {
      const input = {
        label: 'Home',
        street1: '123 Main St',
        city: 'Cape Town',
        province: 'Western Cape',
        postalCode: '8001',
        country: 'South Africa',
        isDefault: true,
      };

      await createAddress(PROFILE_ID, input);

      // Should have called runQuery to clear defaults
      const clearDefaultCall = mockRunQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('UPDATE addresses SET is_default = 0'),
      );
      expect(clearDefaultCall).toBeDefined();
    });

    it('should not clear defaults when isDefault is false', async () => {
      const input = {
        label: 'Work',
        street1: '456 Office Rd',
        city: 'Johannesburg',
        province: 'Gauteng',
        postalCode: '2000',
        country: 'South Africa',
        isDefault: false,
      };

      await createAddress(PROFILE_ID, input);

      const clearDefaultCall = mockRunQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('UPDATE addresses SET is_default = 0'),
      );
      expect(clearDefaultCall).toBeUndefined();
    });

    it('should update profile updated_at timestamp', async () => {
      await createAddress(PROFILE_ID, {
        label: 'Home',
        street1: '123 Main St',
        city: 'Cape Town',
        province: 'Western Cape',
        postalCode: '8001',
        country: 'South Africa',
        isDefault: false,
      });

      const updateProfileCall = mockRunQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('UPDATE profiles SET updated_at'),
      );
      expect(updateProfileCall).toBeDefined();
    });

    it('should generate an ID when not provided', async () => {
      const result = await createAddress(PROFILE_ID, {
        label: 'Home',
        street1: '123 Main St',
        city: 'Cape Town',
        province: 'Western Cape',
        postalCode: '8001',
        country: 'South Africa',
        isDefault: false,
      });

      expect(result.id).toBeTruthy();
    });
  });

  describe('getAddressesByProfileId', () => {
    it('should return all addresses for a profile', async () => {
      mockGetAll.mockResolvedValueOnce([sampleAddressRow]);

      const result = await getAddressesByProfileId(PROFILE_ID);

      expect(result).toHaveLength(1);
      expect(result[0]!.label).toBe('Home');
      expect(result[0]!.isDefault).toBe(true);
    });

    it('should return empty array when no addresses exist', async () => {
      mockGetAll.mockResolvedValueOnce([]);

      const result = await getAddressesByProfileId(PROFILE_ID);

      expect(result).toEqual([]);
    });

    it('should order by is_default DESC, label ASC', async () => {
      mockGetAll.mockResolvedValueOnce([]);
      await getAddressesByProfileId(PROFILE_ID);

      const [sql] = mockGetAll.mock.calls[0];
      expect(sql).toContain('ORDER BY is_default DESC, label ASC');
    });
  });

  describe('updateAddress', () => {
    it('should return null when address not found', async () => {
      mockGetFirst.mockResolvedValueOnce(null);

      const result = await updateAddress('nonexistent', PROFILE_ID, { label: 'Updated' });

      expect(result).toBeNull();
    });

    it('should update specified fields only', async () => {
      mockGetFirst
        .mockResolvedValueOnce(sampleAddressRow) // existing
        .mockResolvedValueOnce({ ...sampleAddressRow, label: 'Updated' }); // after update

      const result = await updateAddress(ADDRESS_ID, PROFILE_ID, { label: 'Updated' });

      expect(result).not.toBeNull();
      expect(mockRunQuery).toHaveBeenCalled();
    });

    it('should clear other defaults when setting as default', async () => {
      mockGetFirst.mockResolvedValueOnce(sampleAddressRow).mockResolvedValueOnce(sampleAddressRow);

      await updateAddress(ADDRESS_ID, PROFILE_ID, { isDefault: true });

      const clearCall = mockRunQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('UPDATE addresses SET is_default = 0') && sql.includes('id != ?'),
      );
      expect(clearCall).toBeDefined();
    });

    it('should return existing address when no fields to update', async () => {
      mockGetFirst.mockResolvedValueOnce(sampleAddressRow);

      const result = await updateAddress(ADDRESS_ID, PROFILE_ID, {});

      expect(result).not.toBeNull();
      expect(result!.label).toBe('Home');
    });
  });

  describe('deleteAddress', () => {
    it('should return true when address is deleted', async () => {
      mockRunQuery.mockResolvedValueOnce({ changes: 1 });
      mockRunQuery.mockResolvedValueOnce({ changes: 1 }); // profile update

      const result = await deleteAddress(ADDRESS_ID, PROFILE_ID);

      expect(result).toBe(true);
    });

    it('should return false when address not found', async () => {
      mockRunQuery.mockResolvedValueOnce({ changes: 0 });

      const result = await deleteAddress('nonexistent', PROFILE_ID);

      expect(result).toBe(false);
    });

    it('should update profile timestamp on successful delete', async () => {
      mockRunQuery.mockResolvedValueOnce({ changes: 1 });
      mockRunQuery.mockResolvedValueOnce({ changes: 1 });

      await deleteAddress(ADDRESS_ID, PROFILE_ID);

      const updateCall = mockRunQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('UPDATE profiles SET updated_at'),
      );
      expect(updateCall).toBeDefined();
    });
  });
});

// ─── Identity Document CRUD ─────────────────────────────────────────

describe('Identity Document CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWithTransaction.mockImplementation(async (cb: () => Promise<void>) => cb());
    mockRunQuery.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
  });

  describe('createIdentityDocument', () => {
    it('should create a document with encrypted number', async () => {
      const input = {
        id: DOC_ID,
        type: 'sa_smart_id' as const,
        label: 'Smart ID Card',
        number: '9001155000083',
        issueDate: '2020-06-15',
        expiryDate: '2030-06-15',
        issuingAuthority: 'DHA',
        additionalFields: { cardNumber: 'ABC123' },
      };

      const result = await createIdentityDocument(PROFILE_ID, input);

      expect(result.id).toBe(DOC_ID);
      expect(result.type).toBe('sa_smart_id');
      expect(result.number).toBe('9001155000083');
      expect(encrypt).toHaveBeenCalledWith('9001155000083');
    });

    it('should encrypt additional fields as JSON', async () => {
      const input = {
        type: 'sa_smart_id' as const,
        label: 'Smart ID',
        number: '123',
        additionalFields: { cardNumber: 'ABC123' },
      };

      await createIdentityDocument(PROFILE_ID, input);

      expect(encrypt).toHaveBeenCalledWith(JSON.stringify({ cardNumber: 'ABC123' }));
    });

    it('should not encrypt empty additional fields', async () => {
      const input = {
        type: 'passport' as const,
        label: 'Passport',
        number: '123',
        additionalFields: {},
      };

      await createIdentityDocument(PROFILE_ID, input);

      // Only called once for the number, not for empty additional fields
      expect(encrypt).toHaveBeenCalledTimes(1);
      expect(encrypt).toHaveBeenCalledWith('123');
    });
  });

  describe('getIdentityDocumentsByProfileId', () => {
    it('should return all documents decrypted', async () => {
      mockGetAll.mockResolvedValueOnce([sampleIdentityDocRow]);

      const result = await getIdentityDocumentsByProfileId(PROFILE_ID);

      expect(result).toHaveLength(1);
      expect(result[0]!.number).toBe('9001155000083');
      expect(result[0]!.additionalFields).toEqual({ cardNumber: 'ABC123' });
    });

    it('should return empty array when no documents exist', async () => {
      mockGetAll.mockResolvedValueOnce([]);

      const result = await getIdentityDocumentsByProfileId(PROFILE_ID);

      expect(result).toEqual([]);
    });
  });

  describe('updateIdentityDocument', () => {
    it('should return null when document not found', async () => {
      mockGetFirst.mockResolvedValueOnce(null);

      const result = await updateIdentityDocument('nonexistent', PROFILE_ID, {
        label: 'Updated',
      });

      expect(result).toBeNull();
    });

    it('should re-encrypt number when updating', async () => {
      mockGetFirst
        .mockResolvedValueOnce(sampleIdentityDocRow)
        .mockResolvedValueOnce(sampleIdentityDocRow);

      await updateIdentityDocument(DOC_ID, PROFILE_ID, { number: 'NEW123' });

      expect(encrypt).toHaveBeenCalledWith('NEW123');
    });

    it('should re-encrypt additional fields when updating', async () => {
      mockGetFirst
        .mockResolvedValueOnce(sampleIdentityDocRow)
        .mockResolvedValueOnce(sampleIdentityDocRow);

      await updateIdentityDocument(DOC_ID, PROFILE_ID, {
        additionalFields: { newField: 'value' },
      });

      expect(encrypt).toHaveBeenCalledWith(JSON.stringify({ newField: 'value' }));
    });

    it('should return existing when no fields to update', async () => {
      mockGetFirst.mockResolvedValueOnce(sampleIdentityDocRow);

      const result = await updateIdentityDocument(DOC_ID, PROFILE_ID, {});

      expect(result).not.toBeNull();
      expect(result!.number).toBe('9001155000083');
    });
  });

  describe('deleteIdentityDocument', () => {
    it('should return true on successful delete', async () => {
      mockRunQuery.mockResolvedValueOnce({ changes: 1 });
      mockRunQuery.mockResolvedValueOnce({ changes: 1 });

      const result = await deleteIdentityDocument(DOC_ID, PROFILE_ID);

      expect(result).toBe(true);
    });

    it('should return false when not found', async () => {
      mockRunQuery.mockResolvedValueOnce({ changes: 0 });

      const result = await deleteIdentityDocument('nonexistent', PROFILE_ID);

      expect(result).toBe(false);
    });
  });
});

// ─── Professional Registration CRUD ─────────────────────────────────

describe('Professional Registration CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWithTransaction.mockImplementation(async (cb: () => Promise<void>) => cb());
    mockRunQuery.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
  });

  describe('createProfessionalRegistration', () => {
    it('should create a registration with encrypted number', async () => {
      const input = {
        id: REG_ID,
        body: 'SAICA',
        registrationNumber: 'REG12345',
        expiryDate: '2027-12-31',
      };

      const result = await createProfessionalRegistration(PROFILE_ID, input);

      expect(result.id).toBe(REG_ID);
      expect(result.body).toBe('SAICA');
      expect(encrypt).toHaveBeenCalledWith('REG12345');
    });

    it('should handle registration without expiry date', async () => {
      const input = {
        body: 'ECSA',
        registrationNumber: 'ENG001',
      };

      const result = await createProfessionalRegistration(PROFILE_ID, input);

      expect(result.body).toBe('ECSA');
      expect(result.expiryDate).toBeUndefined();
    });
  });

  describe('getProfessionalRegistrationsByProfileId', () => {
    it('should return all registrations decrypted', async () => {
      mockGetAll.mockResolvedValueOnce([sampleProfRegRow]);

      const result = await getProfessionalRegistrationsByProfileId(PROFILE_ID);

      expect(result).toHaveLength(1);
      expect(result[0]!.registrationNumber).toBe('REG12345');
    });
  });

  describe('updateProfessionalRegistration', () => {
    it('should return null when not found', async () => {
      mockGetFirst.mockResolvedValueOnce(null);

      const result = await updateProfessionalRegistration('nonexistent', PROFILE_ID, {
        body: 'Updated',
      });

      expect(result).toBeNull();
    });

    it('should re-encrypt number when updating', async () => {
      mockGetFirst.mockResolvedValueOnce(sampleProfRegRow).mockResolvedValueOnce(sampleProfRegRow);

      await updateProfessionalRegistration(REG_ID, PROFILE_ID, {
        registrationNumber: 'NEWREG',
      });

      expect(encrypt).toHaveBeenCalledWith('NEWREG');
    });

    it('should return existing when no fields to update', async () => {
      mockGetFirst.mockResolvedValueOnce(sampleProfRegRow);

      const result = await updateProfessionalRegistration(REG_ID, PROFILE_ID, {});

      expect(result).not.toBeNull();
    });
  });

  describe('deleteProfessionalRegistration', () => {
    it('should return true on successful delete', async () => {
      mockRunQuery.mockResolvedValueOnce({ changes: 1 });
      mockRunQuery.mockResolvedValueOnce({ changes: 1 });

      const result = await deleteProfessionalRegistration(REG_ID, PROFILE_ID);

      expect(result).toBe(true);
    });

    it('should return false when not found', async () => {
      mockRunQuery.mockResolvedValueOnce({ changes: 0 });

      const result = await deleteProfessionalRegistration('nonexistent', PROFILE_ID);

      expect(result).toBe(false);
    });
  });
});

// ─── Emergency Contact CRUD ─────────────────────────────────────────

describe('Emergency Contact CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWithTransaction.mockImplementation(async (cb: () => Promise<void>) => cb());
    mockRunQuery.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
  });

  describe('createEmergencyContact', () => {
    it('should create a contact combining first and last name', async () => {
      mockGetFirst.mockResolvedValueOnce({ count: 0 });

      const input = {
        id: CONTACT_ID,
        firstName: 'Jane',
        lastName: 'Doe',
        relationship: 'spouse',
        phoneMobile: '+27821112222',
        email: 'jane@example.com',
      };

      const result = await createEmergencyContact(PROFILE_ID, input);

      expect(result.id).toBe(CONTACT_ID);
      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Doe');

      // Verify the combined name was stored
      const insertCall = mockRunQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO emergency_contacts'),
      );
      expect(insertCall).toBeDefined();
      expect(insertCall![1]).toContain('Jane Doe');
    });

    it('should enforce max 2 emergency contacts per profile', async () => {
      mockGetFirst.mockResolvedValueOnce({ count: 2 });

      await expect(
        createEmergencyContact(PROFILE_ID, {
          firstName: 'Third',
          lastName: 'Contact',
          relationship: 'friend',
          phoneMobile: '+27821113333',
        }),
      ).rejects.toThrow('Maximum of 2 emergency contacts per profile');
    });

    it('should allow creation when fewer than 2 contacts exist', async () => {
      mockGetFirst.mockResolvedValueOnce({ count: 1 });

      const result = await createEmergencyContact(PROFILE_ID, {
        firstName: 'Second',
        lastName: 'Contact',
        relationship: 'parent',
        phoneMobile: '+27821114444',
      });

      expect(result.firstName).toBe('Second');
    });
  });

  describe('getEmergencyContactsByProfileId', () => {
    it('should return all contacts mapped correctly', async () => {
      mockGetAll.mockResolvedValueOnce([sampleEmergencyContactRow]);

      const result = await getEmergencyContactsByProfileId(PROFILE_ID);

      expect(result).toHaveLength(1);
      expect(result[0]!.firstName).toBe('Jane');
      expect(result[0]!.lastName).toBe('Doe');
    });
  });

  describe('updateEmergencyContact', () => {
    it('should return null when not found', async () => {
      mockGetFirst.mockResolvedValueOnce(null);

      const result = await updateEmergencyContact('nonexistent', PROFILE_ID, {
        firstName: 'Updated',
      });

      expect(result).toBeNull();
    });

    it('should update name by combining first and last', async () => {
      mockGetFirst
        .mockResolvedValueOnce(sampleEmergencyContactRow)
        .mockResolvedValueOnce({ ...sampleEmergencyContactRow, name: 'Janet Doe' });

      await updateEmergencyContact(CONTACT_ID, PROFILE_ID, { firstName: 'Janet' });

      const updateCall = mockRunQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('UPDATE emergency_contacts SET'),
      );
      expect(updateCall).toBeDefined();
      // The name should be updated to "Janet Doe" (new first + existing last)
      expect(updateCall![1]).toContain('Janet Doe');
    });

    it('should update phone number', async () => {
      mockGetFirst
        .mockResolvedValueOnce(sampleEmergencyContactRow)
        .mockResolvedValueOnce(sampleEmergencyContactRow);

      await updateEmergencyContact(CONTACT_ID, PROFILE_ID, { phoneMobile: '+27829999999' });

      const updateCall = mockRunQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('UPDATE emergency_contacts SET'),
      );
      expect(updateCall![0]).toContain('phone = ?');
    });

    it('should return existing when no fields to update', async () => {
      mockGetFirst.mockResolvedValueOnce(sampleEmergencyContactRow);

      const result = await updateEmergencyContact(CONTACT_ID, PROFILE_ID, {});

      expect(result).not.toBeNull();
    });
  });

  describe('deleteEmergencyContact', () => {
    it('should return true on successful delete', async () => {
      mockRunQuery.mockResolvedValueOnce({ changes: 1 });
      mockRunQuery.mockResolvedValueOnce({ changes: 1 });

      const result = await deleteEmergencyContact(CONTACT_ID, PROFILE_ID);

      expect(result).toBe(true);
    });

    it('should return false when not found', async () => {
      mockRunQuery.mockResolvedValueOnce({ changes: 0 });

      const result = await deleteEmergencyContact('nonexistent', PROFILE_ID);

      expect(result).toBe(false);
    });
  });
});

// ─── Full Profile Creation ──────────────────────────────────────────

describe('createFullProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWithTransaction.mockImplementation(async (cb: () => Promise<void>) => cb());
    mockRunQuery.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
    // Emergency contact count check
    mockGetFirst.mockResolvedValue({ count: 0 });
  });

  it('should create a profile with all child entities', async () => {
    const fullProfile = {
      id: PROFILE_ID,
      isPrimary: true,
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-15',
      nationality: 'South African',
      email: 'john@example.com',
      phoneMobile: '+27821234567',
      addresses: [
        {
          id: ADDRESS_ID,
          label: 'Home',
          street1: '123 Main St',
          city: 'Cape Town',
          province: 'Western Cape',
          postalCode: '8001',
          country: 'South Africa',
          isDefault: true,
        },
      ],
      documents: [
        {
          id: DOC_ID,
          type: 'passport' as const,
          label: 'Passport',
          number: 'P123456',
          additionalFields: {},
        },
      ],
      professionalRegistrations: [
        {
          id: REG_ID,
          body: 'SAICA',
          registrationNumber: 'REG001',
        },
      ],
      emergencyContacts: [
        {
          id: CONTACT_ID,
          firstName: 'Jane',
          lastName: 'Doe',
          relationship: 'spouse',
          phoneMobile: '+27821112222',
        },
      ],
    };

    const result = await createFullProfile(fullProfile);

    expect(result.id).toBe(PROFILE_ID);
    expect(result.addresses).toHaveLength(1);
    expect(result.documents).toHaveLength(1);
    expect(result.professionalRegistrations).toHaveLength(1);
    expect(result.emergencyContacts).toHaveLength(1);
    expect(result.createdAt).toBeDefined();
    expect(result.updatedAt).toBeDefined();
  });

  it('should limit emergency contacts to 2', async () => {
    const fullProfile = {
      id: PROFILE_ID,
      isPrimary: true,
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-15',
      nationality: 'South African',
      email: 'john@example.com',
      phoneMobile: '+27821234567',
      addresses: [],
      documents: [],
      professionalRegistrations: [],
      emergencyContacts: [
        {
          id: 'ec1',
          firstName: 'Contact',
          lastName: 'One',
          relationship: 'spouse',
          phoneMobile: '+27821111111',
        },
        {
          id: 'ec2',
          firstName: 'Contact',
          lastName: 'Two',
          relationship: 'parent',
          phoneMobile: '+27822222222',
        },
        {
          id: 'ec3',
          firstName: 'Contact',
          lastName: 'Three',
          relationship: 'friend',
          phoneMobile: '+27823333333',
        },
      ],
    };

    // Count check returns 0 for the first two, 2 would be the third
    mockGetFirst.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });

    const result = await createFullProfile(fullProfile);

    // Only 2 contacts should be created (the third is sliced off)
    expect(result.emergencyContacts).toHaveLength(2);
  });

  it('should handle profile with empty child arrays', async () => {
    const minimalProfile = {
      id: PROFILE_ID,
      isPrimary: false,
      firstName: 'Simple',
      lastName: 'Profile',
      dateOfBirth: '',
      nationality: 'South African',
      email: '',
      phoneMobile: '',
      addresses: [],
      documents: [],
      professionalRegistrations: [],
      emergencyContacts: [],
    };

    const result = await createFullProfile(minimalProfile);

    expect(result.addresses).toEqual([]);
    expect(result.documents).toEqual([]);
    expect(result.professionalRegistrations).toEqual([]);
    expect(result.emergencyContacts).toEqual([]);
  });
});
