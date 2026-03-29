/**
 * Tests for signature CRUD actions in the profile store.
 *
 * Verifies that createSignature, deleteSignature, setDefaultSignature,
 * and updateSignature correctly update store state and call the service layer.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { StoredSignature, SignatureType } from '@fillit/shared';

// ─── Mocks ────────────────────────────────────────────────────────

const mockCreateSignature = vi.fn();
const mockGetSignaturesByProfile = vi.fn();
const mockUpdateSignature = vi.fn();
const mockDeleteSignature = vi.fn();
const mockSetDefaultSignature = vi.fn();

vi.mock('../../services/storage/signatureService', () => ({
  createSignature: (...args: unknown[]) => mockCreateSignature(...args),
  getSignaturesByProfile: (...args: unknown[]) => mockGetSignaturesByProfile(...args),
  updateSignature: (...args: unknown[]) => mockUpdateSignature(...args),
  deleteSignature: (...args: unknown[]) => mockDeleteSignature(...args),
  setDefaultSignature: (...args: unknown[]) => mockSetDefaultSignature(...args),
}));

vi.mock('../../services/storage/profileCrud', () => ({
  listProfiles: vi.fn().mockResolvedValue([]),
  createProfile: vi.fn(),
  getProfileById: vi.fn(),
  updateProfile: vi.fn(),
  deleteProfile: vi.fn(),
  createAddress: vi.fn(),
  getAddressesByProfileId: vi.fn(),
  updateAddress: vi.fn(),
  deleteAddress: vi.fn(),
  createIdentityDocument: vi.fn(),
  getIdentityDocumentsByProfileId: vi.fn(),
  updateIdentityDocument: vi.fn(),
  deleteIdentityDocument: vi.fn(),
  createProfessionalRegistration: vi.fn(),
  getProfessionalRegistrationsByProfileId: vi.fn(),
  updateProfessionalRegistration: vi.fn(),
  deleteProfessionalRegistration: vi.fn(),
  createEmergencyContact: vi.fn(),
  getEmergencyContactsByProfileId: vi.fn(),
  updateEmergencyContact: vi.fn(),
  deleteEmergencyContact: vi.fn(),
  createFullProfile: vi.fn(),
}));

vi.mock('../../services/storage/database', () => ({
  initializeDatabase: vi.fn().mockResolvedValue({}),
}));

import { useProfileStore } from '../profile-store';

// ─── Helpers ──────────────────────────────────────────────────────

function makeSignature(overrides: Partial<StoredSignature> = {}): StoredSignature {
  return {
    id: 'sig-1',
    profileId: 'profile-1',
    type: 'drawn' as SignatureType,
    label: 'Full Name',
    svgPath: 'M 10 20 L 30 40',
    createdAt: '2026-03-29T00:00:00Z',
    isDefault: false,
    ...overrides,
  };
}

function seedStore(signatures: StoredSignature[] = []) {
  useProfileStore.setState({
    profiles: [
      {
        id: 'profile-1',
        isPrimary: true,
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        phone: '',
        dateOfBirth: '',
        idNumber: '',
        gender: 'male',
        title: 'Mr',
        addresses: [],
        documents: [],
        professionalRegistrations: [],
        emergencyContacts: [],
        signatures,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ],
    activeProfileId: 'profile-1',
    isInitialized: true,
    isLoading: false,
    mutationCount: 0,
    error: null,
  });
}

// ─── Tests ────────────────────────────────────────────────────────

describe('signature store actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProfileStore.getState().reset();
  });

  describe('createSignature', () => {
    it('should create a signature and refresh the profile signatures', async () => {
      seedStore();
      const newSig = makeSignature({ id: 'sig-new', isDefault: true });
      mockCreateSignature.mockResolvedValue(newSig);
      mockGetSignaturesByProfile.mockResolvedValue([newSig]);

      const result = await useProfileStore.getState().createSignature({
        id: 'sig-new',
        profileId: 'profile-1',
        type: 'drawn',
        label: 'Full Name',
        svgPath: 'M 10 20 L 30 40',
        isDefault: true,
      });

      expect(result.id).toBe('sig-new');
      expect(mockCreateSignature).toHaveBeenCalledOnce();
      expect(mockGetSignaturesByProfile).toHaveBeenCalledWith('profile-1');

      const profile = useProfileStore.getState().profiles[0]!;
      expect(profile.signatures).toHaveLength(1);
      expect(profile.signatures[0]!.id).toBe('sig-new');
    });

    it('should set error on failure', async () => {
      seedStore();
      mockCreateSignature.mockRejectedValue(new Error('DB error'));

      await expect(
        useProfileStore.getState().createSignature({
          id: 'sig-fail',
          profileId: 'profile-1',
          type: 'drawn',
          label: 'Test',
          svgPath: 'M 0 0',
        }),
      ).rejects.toThrow('DB error');

      expect(useProfileStore.getState().error?.operation).toBe('createSignature');
    });
  });

  describe('deleteSignature', () => {
    it('should remove a signature from the store', async () => {
      const sig = makeSignature();
      seedStore([sig]);
      mockDeleteSignature.mockResolvedValue(undefined);

      await useProfileStore.getState().deleteSignature('sig-1', 'profile-1');

      expect(mockDeleteSignature).toHaveBeenCalledWith('sig-1');
      const profile = useProfileStore.getState().profiles[0]!;
      expect(profile.signatures).toHaveLength(0);
    });

    it('should set error on failure', async () => {
      const sig = makeSignature();
      seedStore([sig]);
      mockDeleteSignature.mockRejectedValue(new Error('Not found'));

      await expect(
        useProfileStore.getState().deleteSignature('sig-1', 'profile-1'),
      ).rejects.toThrow('Not found');

      expect(useProfileStore.getState().error?.operation).toBe('deleteSignature');
    });
  });

  describe('setDefaultSignature', () => {
    it('should update the default signature and refresh', async () => {
      const sig1 = makeSignature({ id: 'sig-1', isDefault: true });
      const sig2 = makeSignature({ id: 'sig-2', label: 'Initials', isDefault: false });
      seedStore([sig1, sig2]);

      const updatedSig2 = { ...sig2, isDefault: true };
      mockSetDefaultSignature.mockResolvedValue(updatedSig2);
      mockGetSignaturesByProfile.mockResolvedValue([{ ...sig1, isDefault: false }, updatedSig2]);

      const result = await useProfileStore.getState().setDefaultSignature('sig-2', 'profile-1');

      expect(result.isDefault).toBe(true);
      expect(mockSetDefaultSignature).toHaveBeenCalledWith('sig-2');

      const profile = useProfileStore.getState().profiles[0]!;
      expect(profile.signatures.find((s) => s.id === 'sig-2')!.isDefault).toBe(true);
      expect(profile.signatures.find((s) => s.id === 'sig-1')!.isDefault).toBe(false);
    });
  });

  describe('updateSignature', () => {
    it('should update a signature label', async () => {
      const sig = makeSignature();
      seedStore([sig]);

      const updated = { ...sig, label: 'New Label' };
      mockUpdateSignature.mockResolvedValue(updated);
      mockGetSignaturesByProfile.mockResolvedValue([updated]);

      const result = await useProfileStore
        .getState()
        .updateSignature('sig-1', 'profile-1', { label: 'New Label' });

      expect(result.label).toBe('New Label');
      expect(mockUpdateSignature).toHaveBeenCalledWith('sig-1', { label: 'New Label' });
    });
  });
});
