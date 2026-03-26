import { describe, it, expect, vi, beforeEach } from 'vitest';

import type {
  Address,
  EmergencyContact,
  IdentityDocument,
  ProfessionalRegistration,
  UserProfile,
} from '@fillit/shared';

// ---------------------------------------------------------------------------
// Mock the profileCrud module
// ---------------------------------------------------------------------------

const mockListProfiles = vi.fn<() => Promise<UserProfile[]>>();
const mockGetProfileById = vi.fn<(id: string) => Promise<UserProfile | null>>();
const mockCreateProfile = vi.fn<(...args: unknown[]) => Promise<UserProfile>>();
const mockUpdateProfile =
  vi.fn<(id: string, ...args: unknown[]) => Promise<UserProfile | null>>();
const mockDeleteProfile = vi.fn<(id: string) => Promise<boolean>>();
const mockCreateFullProfile = vi.fn<(...args: unknown[]) => Promise<UserProfile>>();

const mockCreateAddress = vi.fn<(...args: unknown[]) => Promise<Address>>();
const mockGetAddressesByProfileId = vi.fn<(profileId: string) => Promise<Address[]>>();
const mockUpdateAddress = vi.fn<(...args: unknown[]) => Promise<Address | null>>();
const mockDeleteAddress = vi.fn<(...args: unknown[]) => Promise<boolean>>();

const mockCreateIdentityDocument =
  vi.fn<(...args: unknown[]) => Promise<IdentityDocument>>();
const mockGetIdentityDocumentsByProfileId =
  vi.fn<(profileId: string) => Promise<IdentityDocument[]>>();
const mockUpdateIdentityDocument =
  vi.fn<(...args: unknown[]) => Promise<IdentityDocument | null>>();
const mockDeleteIdentityDocument = vi.fn<(...args: unknown[]) => Promise<boolean>>();

const mockCreateProfessionalRegistration =
  vi.fn<(...args: unknown[]) => Promise<ProfessionalRegistration>>();
const mockGetProfessionalRegistrationsByProfileId =
  vi.fn<(profileId: string) => Promise<ProfessionalRegistration[]>>();
const mockUpdateProfessionalRegistration =
  vi.fn<(...args: unknown[]) => Promise<ProfessionalRegistration | null>>();
const mockDeleteProfessionalRegistration =
  vi.fn<(...args: unknown[]) => Promise<boolean>>();

const mockCreateEmergencyContact =
  vi.fn<(...args: unknown[]) => Promise<EmergencyContact>>();
const mockGetEmergencyContactsByProfileId =
  vi.fn<(profileId: string) => Promise<EmergencyContact[]>>();
const mockUpdateEmergencyContact =
  vi.fn<(...args: unknown[]) => Promise<EmergencyContact | null>>();
const mockDeleteEmergencyContact = vi.fn<(...args: unknown[]) => Promise<boolean>>();

vi.mock('../services/storage/profileCrud', () => ({
  listProfiles: (...args: unknown[]) => mockListProfiles(...args),
  getProfileById: (...args: unknown[]) => mockGetProfileById(args[0] as string),
  createProfile: (...args: unknown[]) => mockCreateProfile(...args),
  updateProfile: (...args: unknown[]) =>
    mockUpdateProfile(args[0] as string, ...args.slice(1)),
  deleteProfile: (...args: unknown[]) => mockDeleteProfile(args[0] as string),
  createFullProfile: (...args: unknown[]) => mockCreateFullProfile(...args),
  createAddress: (...args: unknown[]) => mockCreateAddress(...args),
  getAddressesByProfileId: (...args: unknown[]) =>
    mockGetAddressesByProfileId(args[0] as string),
  updateAddress: (...args: unknown[]) => mockUpdateAddress(...args),
  deleteAddress: (...args: unknown[]) => mockDeleteAddress(...args),
  createIdentityDocument: (...args: unknown[]) => mockCreateIdentityDocument(...args),
  getIdentityDocumentsByProfileId: (...args: unknown[]) =>
    mockGetIdentityDocumentsByProfileId(args[0] as string),
  updateIdentityDocument: (...args: unknown[]) => mockUpdateIdentityDocument(...args),
  deleteIdentityDocument: (...args: unknown[]) => mockDeleteIdentityDocument(...args),
  createProfessionalRegistration: (...args: unknown[]) =>
    mockCreateProfessionalRegistration(...args),
  getProfessionalRegistrationsByProfileId: (...args: unknown[]) =>
    mockGetProfessionalRegistrationsByProfileId(args[0] as string),
  updateProfessionalRegistration: (...args: unknown[]) =>
    mockUpdateProfessionalRegistration(...args),
  deleteProfessionalRegistration: (...args: unknown[]) =>
    mockDeleteProfessionalRegistration(...args),
  createEmergencyContact: (...args: unknown[]) => mockCreateEmergencyContact(...args),
  getEmergencyContactsByProfileId: (...args: unknown[]) =>
    mockGetEmergencyContactsByProfileId(args[0] as string),
  updateEmergencyContact: (...args: unknown[]) => mockUpdateEmergencyContact(...args),
  deleteEmergencyContact: (...args: unknown[]) => mockDeleteEmergencyContact(...args),
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import {
  useProfileStore,
  DEFAULT_PROFILE_STATE,
  selectProfiles,
  selectActiveProfileId,
  selectActiveProfile,
  selectPrimaryProfile,
  selectDependentProfiles,
  selectProfileCount,
  selectProfileById,
  selectActiveProfileAddresses,
  selectActiveProfileDocuments,
  selectActiveProfileRegistrations,
  selectActiveProfileEmergencyContacts,
  selectIsLoading,
  selectIsMutating,
  selectIsInitialized,
  selectError,
} from '../stores/profile-store';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeAddress(overrides: Partial<Address> = {}): Address {
  return {
    id: 'addr-1',
    label: 'Home',
    street1: '123 Main St',
    city: 'Cape Town',
    province: 'Western Cape',
    postalCode: '8001',
    country: 'South Africa',
    isDefault: true,
    ...overrides,
  };
}

function makeIdentityDocument(
  overrides: Partial<IdentityDocument> = {},
): IdentityDocument {
  return {
    id: 'doc-1',
    type: 'sa_smart_id',
    label: 'Smart ID',
    number: '9001015009088',
    additionalFields: {},
    ...overrides,
  };
}

function makeProfessionalRegistration(
  overrides: Partial<ProfessionalRegistration> = {},
): ProfessionalRegistration {
  return {
    id: 'reg-1',
    body: 'HPCSA',
    registrationNumber: 'MP12345',
    ...overrides,
  };
}

function makeEmergencyContact(
  overrides: Partial<EmergencyContact> = {},
): EmergencyContact {
  return {
    id: 'ec-1',
    firstName: 'Jane',
    lastName: 'Doe',
    relationship: 'spouse',
    phoneMobile: '0821234567',
    ...overrides,
  };
}

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'profile-1',
    isPrimary: true,
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1990-01-01',
    nationality: 'South African',
    email: 'john@example.com',
    phoneMobile: '0821234567',
    addresses: [makeAddress()],
    documents: [makeIdentityDocument()],
    professionalRegistrations: [makeProfessionalRegistration()],
    emergencyContacts: [makeEmergencyContact()],
    signatures: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeDependentProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return makeProfile({
    id: 'profile-2',
    isPrimary: false,
    relationship: 'child',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetStore(): void {
  useProfileStore.setState({ ...DEFAULT_PROFILE_STATE });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetStore();
  vi.clearAllMocks();
});

// ─── Default State ────────────────────────────────────────────────────────

describe('default state', () => {
  it('has correct initial values', () => {
    const state = useProfileStore.getState();
    expect(state.profiles).toEqual([]);
    expect(state.activeProfileId).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.isMutating).toBe(false);
    expect(state.isInitialized).toBe(false);
    expect(state.error).toBeNull();
  });
});

// ─── Initialization ───────────────────────────────────────────────────────

describe('initialize', () => {
  it('loads profiles from DB and sets active to primary', async () => {
    const primary = makeProfile();
    const dependent = makeDependentProfile();
    mockListProfiles.mockResolvedValue([primary, dependent]);

    await useProfileStore.getState().initialize();

    const state = useProfileStore.getState();
    expect(state.profiles).toEqual([primary, dependent]);
    expect(state.activeProfileId).toBe('profile-1');
    expect(state.isLoading).toBe(false);
    expect(state.isInitialized).toBe(true);
    expect(state.error).toBeNull();
  });

  it('does not re-initialize if already initialized', async () => {
    mockListProfiles.mockResolvedValue([makeProfile()]);
    await useProfileStore.getState().initialize();
    mockListProfiles.mockClear();

    await useProfileStore.getState().initialize();
    expect(mockListProfiles).not.toHaveBeenCalled();
  });

  it('does not re-initialize while loading', async () => {
    useProfileStore.setState({ isLoading: true });
    await useProfileStore.getState().initialize();
    expect(mockListProfiles).not.toHaveBeenCalled();
  });

  it('sets error on failure', async () => {
    mockListProfiles.mockRejectedValue(new Error('DB error'));

    await useProfileStore.getState().initialize();

    const state = useProfileStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.isInitialized).toBe(false);
    expect(state.error).toEqual({
      operation: 'load',
      message: 'DB error',
      cause: expect.any(Error),
    });
  });

  it('sets activeProfileId to first profile if no primary exists', async () => {
    const dep1 = makeDependentProfile({ id: 'dep-1' });
    const dep2 = makeDependentProfile({ id: 'dep-2' });
    mockListProfiles.mockResolvedValue([dep1, dep2]);

    await useProfileStore.getState().initialize();

    expect(useProfileStore.getState().activeProfileId).toBe('dep-1');
  });

  it('sets activeProfileId to null when no profiles exist', async () => {
    mockListProfiles.mockResolvedValue([]);

    await useProfileStore.getState().initialize();

    expect(useProfileStore.getState().activeProfileId).toBeNull();
  });
});

// ─── Active Profile ───────────────────────────────────────────────────────

describe('setActiveProfileId', () => {
  it('sets the active profile ID', () => {
    useProfileStore.getState().setActiveProfileId('profile-2');
    expect(useProfileStore.getState().activeProfileId).toBe('profile-2');
  });

  it('can set active profile to null', () => {
    useProfileStore.setState({ activeProfileId: 'profile-1' });
    useProfileStore.getState().setActiveProfileId(null);
    expect(useProfileStore.getState().activeProfileId).toBeNull();
  });
});

// ─── Profile CRUD ─────────────────────────────────────────────────────────

describe('createProfile', () => {
  it('creates a profile and adds it to the store', async () => {
    const profile = makeProfile();
    mockCreateProfile.mockResolvedValue(profile);

    const result = await useProfileStore.getState().createProfile({} as never);

    expect(result).toEqual(profile);
    expect(useProfileStore.getState().profiles).toEqual([profile]);
    expect(useProfileStore.getState().isMutating).toBe(false);
  });

  it('auto-selects primary profile as active', async () => {
    const profile = makeProfile({ isPrimary: true });
    mockCreateProfile.mockResolvedValue(profile);

    await useProfileStore.getState().createProfile({} as never);

    expect(useProfileStore.getState().activeProfileId).toBe(profile.id);
  });

  it('auto-selects first profile if no active profile', async () => {
    const profile = makeProfile({ isPrimary: false });
    mockCreateProfile.mockResolvedValue(profile);

    await useProfileStore.getState().createProfile({} as never);

    expect(useProfileStore.getState().activeProfileId).toBe(profile.id);
  });

  it('does not change active profile when adding a non-primary to existing', async () => {
    useProfileStore.setState({
      profiles: [makeProfile()],
      activeProfileId: 'profile-1',
    });

    const dependent = makeDependentProfile();
    mockCreateProfile.mockResolvedValue(dependent);

    await useProfileStore.getState().createProfile({} as never);

    expect(useProfileStore.getState().activeProfileId).toBe('profile-1');
  });

  it('sets error and rethrows on failure', async () => {
    mockCreateProfile.mockRejectedValue(new Error('insert failed'));

    await expect(useProfileStore.getState().createProfile({} as never)).rejects.toThrow(
      'insert failed',
    );
    expect(useProfileStore.getState().isMutating).toBe(false);
    expect(useProfileStore.getState().error?.operation).toBe('create');
  });
});

describe('createFullProfile', () => {
  it('creates profile with children and adds to store', async () => {
    const profile = makeProfile();
    mockCreateFullProfile.mockResolvedValue(profile);

    const result = await useProfileStore.getState().createFullProfile({} as never);

    expect(result).toEqual(profile);
    expect(useProfileStore.getState().profiles).toHaveLength(1);
  });
});

describe('updateProfile', () => {
  it('updates profile in the store', async () => {
    const profile = makeProfile();
    useProfileStore.setState({ profiles: [profile], activeProfileId: profile.id });

    const updated = { ...profile, firstName: 'Updated' };
    mockUpdateProfile.mockResolvedValue(updated);

    const result = await useProfileStore
      .getState()
      .updateProfile(profile.id, { firstName: 'Updated' });

    expect(result?.firstName).toBe('Updated');
    expect(useProfileStore.getState().profiles[0].firstName).toBe('Updated');
    expect(useProfileStore.getState().isMutating).toBe(false);
  });

  it('handles null return (profile not found)', async () => {
    mockUpdateProfile.mockResolvedValue(null);

    const result = await useProfileStore
      .getState()
      .updateProfile('nonexistent', { firstName: 'X' });

    expect(result).toBeNull();
    expect(useProfileStore.getState().isMutating).toBe(false);
  });

  it('sets error and rethrows on failure', async () => {
    mockUpdateProfile.mockRejectedValue(new Error('update failed'));

    await expect(
      useProfileStore.getState().updateProfile('id', { firstName: 'X' }),
    ).rejects.toThrow('update failed');
    expect(useProfileStore.getState().error?.operation).toBe('update');
  });
});

describe('deleteProfile', () => {
  it('removes profile from store', async () => {
    const primary = makeProfile();
    const dependent = makeDependentProfile();
    useProfileStore.setState({
      profiles: [primary, dependent],
      activeProfileId: primary.id,
    });
    mockDeleteProfile.mockResolvedValue(true);

    const result = await useProfileStore.getState().deleteProfile(dependent.id);

    expect(result).toBe(true);
    expect(useProfileStore.getState().profiles).toHaveLength(1);
    expect(useProfileStore.getState().activeProfileId).toBe(primary.id);
  });

  it('switches active profile when active is deleted', async () => {
    const primary = makeProfile();
    const dependent = makeDependentProfile();
    useProfileStore.setState({
      profiles: [primary, dependent],
      activeProfileId: primary.id,
    });
    mockDeleteProfile.mockResolvedValue(true);

    await useProfileStore.getState().deleteProfile(primary.id);

    // Falls back to next available
    expect(useProfileStore.getState().activeProfileId).toBe(dependent.id);
  });

  it('sets active to null when last profile is deleted', async () => {
    useProfileStore.setState({
      profiles: [makeProfile()],
      activeProfileId: 'profile-1',
    });
    mockDeleteProfile.mockResolvedValue(true);

    await useProfileStore.getState().deleteProfile('profile-1');

    expect(useProfileStore.getState().activeProfileId).toBeNull();
    expect(useProfileStore.getState().profiles).toEqual([]);
  });

  it('does not modify store on failed delete', async () => {
    useProfileStore.setState({
      profiles: [makeProfile()],
      activeProfileId: 'profile-1',
    });
    mockDeleteProfile.mockResolvedValue(false);

    await useProfileStore.getState().deleteProfile('profile-1');

    expect(useProfileStore.getState().profiles).toHaveLength(1);
  });

  it('sets error and rethrows on failure', async () => {
    mockDeleteProfile.mockRejectedValue(new Error('delete failed'));

    await expect(
      useProfileStore.getState().deleteProfile('id'),
    ).rejects.toThrow('delete failed');
    expect(useProfileStore.getState().error?.operation).toBe('delete');
  });
});

describe('refreshProfile', () => {
  it('refreshes a single profile from DB', async () => {
    const profile = makeProfile();
    useProfileStore.setState({ profiles: [profile] });

    const refreshed = { ...profile, firstName: 'Refreshed' };
    mockGetProfileById.mockResolvedValue(refreshed);

    await useProfileStore.getState().refreshProfile(profile.id);

    expect(useProfileStore.getState().profiles[0].firstName).toBe('Refreshed');
  });

  it('removes profile from store if deleted externally', async () => {
    useProfileStore.setState({ profiles: [makeProfile()] });
    mockGetProfileById.mockResolvedValue(null);

    await useProfileStore.getState().refreshProfile('profile-1');

    expect(useProfileStore.getState().profiles).toEqual([]);
  });

  it('sets error on failure without throwing', async () => {
    useProfileStore.setState({ profiles: [makeProfile()] });
    mockGetProfileById.mockRejectedValue(new Error('refresh failed'));

    await useProfileStore.getState().refreshProfile('profile-1');

    expect(useProfileStore.getState().error?.operation).toBe('load');
  });
});

// ─── Address CRUD ─────────────────────────────────────────────────────────

describe('address CRUD', () => {
  const profile = makeProfile({ addresses: [] });

  beforeEach(() => {
    useProfileStore.setState({ profiles: [profile], activeProfileId: profile.id });
  });

  it('creates an address and refreshes from DB', async () => {
    const newAddr = makeAddress();
    mockCreateAddress.mockResolvedValue(newAddr);
    mockGetAddressesByProfileId.mockResolvedValue([newAddr]);

    const result = await useProfileStore
      .getState()
      .createAddress(profile.id, {} as never);

    expect(result).toEqual(newAddr);
    expect(useProfileStore.getState().profiles[0].addresses).toEqual([newAddr]);
  });

  it('updates an address and refreshes from DB', async () => {
    const addr = makeAddress();
    useProfileStore.setState({
      profiles: [{ ...profile, addresses: [addr] }],
    });
    const updated = { ...addr, label: 'Work' };
    mockUpdateAddress.mockResolvedValue(updated);
    mockGetAddressesByProfileId.mockResolvedValue([updated]);

    const result = await useProfileStore
      .getState()
      .updateAddress(addr.id, profile.id, { label: 'Work' });

    expect(result?.label).toBe('Work');
    expect(useProfileStore.getState().profiles[0].addresses[0].label).toBe('Work');
  });

  it('handles null return on address update', async () => {
    mockUpdateAddress.mockResolvedValue(null);

    const result = await useProfileStore
      .getState()
      .updateAddress('x', profile.id, { label: 'Work' });

    expect(result).toBeNull();
  });

  it('deletes an address', async () => {
    const addr = makeAddress();
    useProfileStore.setState({
      profiles: [{ ...profile, addresses: [addr] }],
    });
    mockDeleteAddress.mockResolvedValue(true);

    const result = await useProfileStore
      .getState()
      .deleteAddress(addr.id, profile.id);

    expect(result).toBe(true);
    expect(useProfileStore.getState().profiles[0].addresses).toEqual([]);
  });

  it('sets error on address create failure', async () => {
    mockCreateAddress.mockRejectedValue(new Error('addr error'));

    await expect(
      useProfileStore.getState().createAddress(profile.id, {} as never),
    ).rejects.toThrow('addr error');
    expect(useProfileStore.getState().error?.operation).toBe('createAddress');
  });
});

// ─── Identity Document CRUD ───────────────────────────────────────────────

describe('identity document CRUD', () => {
  const profile = makeProfile({ documents: [] });

  beforeEach(() => {
    useProfileStore.setState({ profiles: [profile], activeProfileId: profile.id });
  });

  it('creates an identity document', async () => {
    const doc = makeIdentityDocument();
    mockCreateIdentityDocument.mockResolvedValue(doc);

    const result = await useProfileStore
      .getState()
      .createIdentityDocument(profile.id, {} as never);

    expect(result).toEqual(doc);
    expect(useProfileStore.getState().profiles[0].documents).toEqual([doc]);
  });

  it('updates an identity document and refreshes from DB', async () => {
    const doc = makeIdentityDocument();
    useProfileStore.setState({
      profiles: [{ ...profile, documents: [doc] }],
    });
    const updated = { ...doc, label: 'Updated ID' };
    mockUpdateIdentityDocument.mockResolvedValue(updated);
    mockGetIdentityDocumentsByProfileId.mockResolvedValue([updated]);

    const result = await useProfileStore
      .getState()
      .updateIdentityDocument(doc.id, profile.id, { label: 'Updated ID' });

    expect(result?.label).toBe('Updated ID');
  });

  it('deletes an identity document', async () => {
    const doc = makeIdentityDocument();
    useProfileStore.setState({
      profiles: [{ ...profile, documents: [doc] }],
    });
    mockDeleteIdentityDocument.mockResolvedValue(true);

    const result = await useProfileStore
      .getState()
      .deleteIdentityDocument(doc.id, profile.id);

    expect(result).toBe(true);
    expect(useProfileStore.getState().profiles[0].documents).toEqual([]);
  });

  it('sets error on identity document create failure', async () => {
    mockCreateIdentityDocument.mockRejectedValue(new Error('doc error'));

    await expect(
      useProfileStore.getState().createIdentityDocument(profile.id, {} as never),
    ).rejects.toThrow('doc error');
    expect(useProfileStore.getState().error?.operation).toBe('createIdentityDocument');
  });
});

// ─── Professional Registration CRUD ───────────────────────────────────────

describe('professional registration CRUD', () => {
  const profile = makeProfile({ professionalRegistrations: [] });

  beforeEach(() => {
    useProfileStore.setState({ profiles: [profile], activeProfileId: profile.id });
  });

  it('creates a professional registration', async () => {
    const reg = makeProfessionalRegistration();
    mockCreateProfessionalRegistration.mockResolvedValue(reg);

    const result = await useProfileStore
      .getState()
      .createProfessionalRegistration(profile.id, {} as never);

    expect(result).toEqual(reg);
    expect(useProfileStore.getState().profiles[0].professionalRegistrations).toEqual([
      reg,
    ]);
  });

  it('updates a professional registration and refreshes from DB', async () => {
    const reg = makeProfessionalRegistration();
    useProfileStore.setState({
      profiles: [{ ...profile, professionalRegistrations: [reg] }],
    });
    const updated = { ...reg, body: 'SACAP' };
    mockUpdateProfessionalRegistration.mockResolvedValue(updated);
    mockGetProfessionalRegistrationsByProfileId.mockResolvedValue([updated]);

    const result = await useProfileStore
      .getState()
      .updateProfessionalRegistration(reg.id, profile.id, { body: 'SACAP' });

    expect(result?.body).toBe('SACAP');
  });

  it('deletes a professional registration', async () => {
    const reg = makeProfessionalRegistration();
    useProfileStore.setState({
      profiles: [{ ...profile, professionalRegistrations: [reg] }],
    });
    mockDeleteProfessionalRegistration.mockResolvedValue(true);

    const result = await useProfileStore
      .getState()
      .deleteProfessionalRegistration(reg.id, profile.id);

    expect(result).toBe(true);
    expect(
      useProfileStore.getState().profiles[0].professionalRegistrations,
    ).toEqual([]);
  });
});

// ─── Emergency Contact CRUD ───────────────────────────────────────────────

describe('emergency contact CRUD', () => {
  const profile = makeProfile({ emergencyContacts: [] });

  beforeEach(() => {
    useProfileStore.setState({ profiles: [profile], activeProfileId: profile.id });
  });

  it('creates an emergency contact', async () => {
    const contact = makeEmergencyContact();
    mockCreateEmergencyContact.mockResolvedValue(contact);

    const result = await useProfileStore
      .getState()
      .createEmergencyContact(profile.id, {} as never);

    expect(result).toEqual(contact);
    expect(useProfileStore.getState().profiles[0].emergencyContacts).toEqual([contact]);
  });

  it('updates an emergency contact and refreshes from DB', async () => {
    const contact = makeEmergencyContact();
    useProfileStore.setState({
      profiles: [{ ...profile, emergencyContacts: [contact] }],
    });
    const updated = { ...contact, firstName: 'Updated' };
    mockUpdateEmergencyContact.mockResolvedValue(updated);
    mockGetEmergencyContactsByProfileId.mockResolvedValue([updated]);

    const result = await useProfileStore
      .getState()
      .updateEmergencyContact(contact.id, profile.id, { firstName: 'Updated' });

    expect(result?.firstName).toBe('Updated');
  });

  it('deletes an emergency contact', async () => {
    const contact = makeEmergencyContact();
    useProfileStore.setState({
      profiles: [{ ...profile, emergencyContacts: [contact] }],
    });
    mockDeleteEmergencyContact.mockResolvedValue(true);

    const result = await useProfileStore
      .getState()
      .deleteEmergencyContact(contact.id, profile.id);

    expect(result).toBe(true);
    expect(useProfileStore.getState().profiles[0].emergencyContacts).toEqual([]);
  });
});

// ─── Error & Reset ────────────────────────────────────────────────────────

describe('clearError', () => {
  it('clears the error state', () => {
    useProfileStore.setState({
      error: { operation: 'load', message: 'test' },
    });

    useProfileStore.getState().clearError();

    expect(useProfileStore.getState().error).toBeNull();
  });
});

describe('reset', () => {
  it('resets to default state', () => {
    useProfileStore.setState({
      profiles: [makeProfile()],
      activeProfileId: 'profile-1',
      isLoading: true,
      isMutating: true,
      isInitialized: true,
      error: { operation: 'load', message: 'test' },
    });

    useProfileStore.getState().reset();

    const state = useProfileStore.getState();
    expect(state.profiles).toEqual([]);
    expect(state.activeProfileId).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.isMutating).toBe(false);
    expect(state.isInitialized).toBe(false);
    expect(state.error).toBeNull();
  });
});

// ─── Selectors ────────────────────────────────────────────────────────────

describe('selectors', () => {
  const primary = makeProfile();
  const dependent = makeDependentProfile();

  beforeEach(() => {
    useProfileStore.setState({
      profiles: [primary, dependent],
      activeProfileId: primary.id,
      isLoading: false,
      isMutating: true,
      isInitialized: true,
      error: { operation: 'load', message: 'test' },
    });
  });

  it('selectProfiles returns all profiles', () => {
    expect(selectProfiles(useProfileStore.getState())).toEqual([primary, dependent]);
  });

  it('selectActiveProfileId returns active ID', () => {
    expect(selectActiveProfileId(useProfileStore.getState())).toBe('profile-1');
  });

  it('selectActiveProfile returns the active profile', () => {
    expect(selectActiveProfile(useProfileStore.getState())).toEqual(primary);
  });

  it('selectActiveProfile returns null when no active', () => {
    useProfileStore.setState({ activeProfileId: null });
    expect(selectActiveProfile(useProfileStore.getState())).toBeNull();
  });

  it('selectPrimaryProfile returns the primary profile', () => {
    expect(selectPrimaryProfile(useProfileStore.getState())).toEqual(primary);
  });

  it('selectPrimaryProfile returns null when no primary', () => {
    useProfileStore.setState({ profiles: [dependent] });
    expect(selectPrimaryProfile(useProfileStore.getState())).toBeNull();
  });

  it('selectDependentProfiles returns non-primary profiles', () => {
    expect(selectDependentProfiles(useProfileStore.getState())).toEqual([dependent]);
  });

  it('selectProfileCount returns total count', () => {
    expect(selectProfileCount(useProfileStore.getState())).toBe(2);
  });

  it('selectProfileById returns profile by ID', () => {
    expect(selectProfileById('profile-2')(useProfileStore.getState())).toEqual(
      dependent,
    );
  });

  it('selectProfileById returns null for unknown ID', () => {
    expect(selectProfileById('unknown')(useProfileStore.getState())).toBeNull();
  });

  it('selectActiveProfileAddresses returns addresses', () => {
    expect(selectActiveProfileAddresses(useProfileStore.getState())).toEqual(
      primary.addresses,
    );
  });

  it('selectActiveProfileDocuments returns documents', () => {
    expect(selectActiveProfileDocuments(useProfileStore.getState())).toEqual(
      primary.documents,
    );
  });

  it('selectActiveProfileRegistrations returns registrations', () => {
    expect(selectActiveProfileRegistrations(useProfileStore.getState())).toEqual(
      primary.professionalRegistrations,
    );
  });

  it('selectActiveProfileEmergencyContacts returns contacts', () => {
    expect(selectActiveProfileEmergencyContacts(useProfileStore.getState())).toEqual(
      primary.emergencyContacts,
    );
  });

  it('selectActiveProfileAddresses returns [] when no active', () => {
    useProfileStore.setState({ activeProfileId: null });
    expect(selectActiveProfileAddresses(useProfileStore.getState())).toEqual([]);
  });

  it('selectIsLoading returns loading state', () => {
    expect(selectIsLoading(useProfileStore.getState())).toBe(false);
  });

  it('selectIsMutating returns mutating state', () => {
    expect(selectIsMutating(useProfileStore.getState())).toBe(true);
  });

  it('selectIsInitialized returns initialized state', () => {
    expect(selectIsInitialized(useProfileStore.getState())).toBe(true);
  });

  it('selectError returns error state', () => {
    expect(selectError(useProfileStore.getState())).toEqual({
      operation: 'load',
      message: 'test',
    });
  });
});
