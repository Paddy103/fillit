/**
 * Profile Zustand store backed by SQLite.
 *
 * Manages user profiles with addresses, identity documents, professional
 * registrations, and emergency contacts. All mutations sync to the SQLite
 * database via the profile CRUD layer — no AsyncStorage persistence needed.
 */

import type {
  Address,
  EmergencyContact,
  IdentityDocument,
  ProfessionalRegistration,
  UserProfile,
} from '@fillit/shared';
import { create } from 'zustand';

import {
  createProfile,
  getProfileById,
  listProfiles,
  updateProfile,
  deleteProfile,
  createAddress as createProfileAddress,
  getAddressesByProfileId,
  updateAddress as updateProfileAddress,
  deleteAddress as deleteProfileAddress,
  createIdentityDocument as createProfileIdentityDocument,
  getIdentityDocumentsByProfileId,
  updateIdentityDocument as updateProfileIdentityDocument,
  deleteIdentityDocument as deleteProfileIdentityDocument,
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
import type {
  CreateProfileInput,
  UpdateProfileInput,
  CreateAddressInput,
  UpdateAddressInput,
  CreateIdentityDocumentInput,
  UpdateIdentityDocumentInput,
  CreateProfessionalRegistrationInput,
  UpdateProfessionalRegistrationInput,
  CreateEmergencyContactInput,
  UpdateEmergencyContactInput,
} from '../services/storage/profileCrud';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** State managed by the profile store */
export interface ProfileState {
  /** All loaded profiles (primary + dependents) */
  profiles: UserProfile[];
  /** The currently active/selected profile ID */
  activeProfileId: string | null;
  /** Whether profiles are being loaded from the database */
  isLoading: boolean;
  /** Whether a mutation (create/update/delete) is in progress */
  isMutating: boolean;
  /** Whether the store has been initialized from the database */
  isInitialized: boolean;
  /** Last error that occurred, null if no error */
  error: ProfileStoreError | null;
}

/** Structured error for the profile store */
export interface ProfileStoreError {
  /** Which operation failed */
  operation: ProfileOperation;
  /** Human-readable message */
  message: string;
  /** Original error, if any */
  cause?: unknown;
}

/** Operations that can fail in the profile store */
export type ProfileOperation =
  | 'load'
  | 'create'
  | 'update'
  | 'delete'
  | 'createAddress'
  | 'updateAddress'
  | 'deleteAddress'
  | 'createIdentityDocument'
  | 'updateIdentityDocument'
  | 'deleteIdentityDocument'
  | 'createProfessionalRegistration'
  | 'updateProfessionalRegistration'
  | 'deleteProfessionalRegistration'
  | 'createEmergencyContact'
  | 'updateEmergencyContact'
  | 'deleteEmergencyContact';

/** Actions available on the profile store */
export interface ProfileActions {
  // ── Initialization ──────────────────────────────────────────────
  /** Load all profiles from the database. Call once at app start. */
  initialize: () => Promise<void>;

  // ── Active profile ──────────────────────────────────────────────
  /** Set the active profile by ID */
  setActiveProfileId: (id: string | null) => void;

  // ── Profile CRUD ────────────────────────────────────────────────
  /** Create a new profile and add it to the store */
  createProfile: (input: CreateProfileInput) => Promise<UserProfile>;
  /** Create a profile with all child entities in one call */
  createFullProfile: (
    profile: Omit<UserProfile, 'createdAt' | 'updatedAt' | 'signatures'>,
  ) => Promise<UserProfile>;
  /** Update an existing profile */
  updateProfile: (id: string, input: UpdateProfileInput) => Promise<UserProfile | null>;
  /** Delete a profile and remove it from the store */
  deleteProfile: (id: string) => Promise<boolean>;
  /** Reload a single profile from the database */
  refreshProfile: (id: string) => Promise<void>;

  // ── Address CRUD ────────────────────────────────────────────────
  createAddress: (profileId: string, input: CreateAddressInput) => Promise<Address>;
  updateAddress: (
    id: string,
    profileId: string,
    input: UpdateAddressInput,
  ) => Promise<Address | null>;
  deleteAddress: (id: string, profileId: string) => Promise<boolean>;

  // ── Identity Document CRUD ──────────────────────────────────────
  createIdentityDocument: (
    profileId: string,
    input: CreateIdentityDocumentInput,
  ) => Promise<IdentityDocument>;
  updateIdentityDocument: (
    id: string,
    profileId: string,
    input: UpdateIdentityDocumentInput,
  ) => Promise<IdentityDocument | null>;
  deleteIdentityDocument: (id: string, profileId: string) => Promise<boolean>;

  // ── Professional Registration CRUD ──────────────────────────────
  createProfessionalRegistration: (
    profileId: string,
    input: CreateProfessionalRegistrationInput,
  ) => Promise<ProfessionalRegistration>;
  updateProfessionalRegistration: (
    id: string,
    profileId: string,
    input: UpdateProfessionalRegistrationInput,
  ) => Promise<ProfessionalRegistration | null>;
  deleteProfessionalRegistration: (id: string, profileId: string) => Promise<boolean>;

  // ── Emergency Contact CRUD ──────────────────────────────────────
  createEmergencyContact: (
    profileId: string,
    input: CreateEmergencyContactInput,
  ) => Promise<EmergencyContact>;
  updateEmergencyContact: (
    id: string,
    profileId: string,
    input: UpdateEmergencyContactInput,
  ) => Promise<EmergencyContact | null>;
  deleteEmergencyContact: (id: string, profileId: string) => Promise<boolean>;

  // ── Error handling ──────────────────────────────────────────────
  /** Clear the current error */
  clearError: () => void;

  // ── Reset ───────────────────────────────────────────────────────
  /** Reset the store to its default state */
  reset: () => void;
}

export type ProfileStore = ProfileState & ProfileActions;

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_PROFILE_STATE: ProfileState = {
  profiles: [],
  activeProfileId: null,
  isLoading: false,
  isMutating: false,
  isInitialized: false,
  error: null,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a ProfileStoreError from a caught value */
function toStoreError(operation: ProfileOperation, err: unknown): ProfileStoreError {
  return {
    operation,
    message: err instanceof Error ? err.message : String(err),
    cause: err,
  };
}

/**
 * Replace a single profile in the profiles array.
 * Returns a new array with the matching profile replaced.
 */
function replaceProfile(profiles: UserProfile[], updated: UserProfile): UserProfile[] {
  return profiles.map((p) => (p.id === updated.id ? updated : p));
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useProfileStore = create<ProfileStore>()((set, get) => ({
  // State
  ...DEFAULT_PROFILE_STATE,

  // ── Initialization ────────────────────────────────────────────────

  initialize: async () => {
    const { isInitialized, isLoading } = get();
    if (isInitialized || isLoading) return;

    set({ isLoading: true, error: null });
    try {
      const profiles = await listProfiles();
      const primary = profiles.find((p) => p.isPrimary) ?? null;
      set({
        profiles,
        activeProfileId: primary?.id ?? null,
        isLoading: false,
        isInitialized: true,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: toStoreError('load', err),
      });
    }
  },

  // ── Active profile ────────────────────────────────────────────────

  setActiveProfileId: (id: string | null) => {
    set({ activeProfileId: id });
  },

  // ── Profile CRUD ──────────────────────────────────────────────────

  createProfile: async (input: CreateProfileInput) => {
    set({ isMutating: true, error: null });
    try {
      const profile = await createProfile(input);
      const { profiles, activeProfileId } = get();
      set({
        profiles: [...profiles, profile],
        // Auto-select if this is the first or primary profile
        activeProfileId: profile.isPrimary || !activeProfileId ? profile.id : activeProfileId,
        isMutating: false,
      });
      return profile;
    } catch (err) {
      set({ isMutating: false, error: toStoreError('create', err) });
      throw err;
    }
  },

  createFullProfile: async (
    profile: Omit<UserProfile, 'createdAt' | 'updatedAt' | 'signatures'>,
  ) => {
    set({ isMutating: true, error: null });
    try {
      const created = await createFullProfile(profile);
      const { profiles, activeProfileId } = get();
      set({
        profiles: [...profiles, created],
        activeProfileId: created.isPrimary || !activeProfileId ? created.id : activeProfileId,
        isMutating: false,
      });
      return created;
    } catch (err) {
      set({ isMutating: false, error: toStoreError('create', err) });
      throw err;
    }
  },

  updateProfile: async (id: string, input: UpdateProfileInput) => {
    set({ isMutating: true, error: null });
    try {
      const updated = await updateProfile(id, input);
      if (updated) {
        set({
          profiles: replaceProfile(get().profiles, updated),
          isMutating: false,
        });
      } else {
        set({ isMutating: false });
      }
      return updated;
    } catch (err) {
      set({ isMutating: false, error: toStoreError('update', err) });
      throw err;
    }
  },

  deleteProfile: async (id: string) => {
    set({ isMutating: true, error: null });
    try {
      const success = await deleteProfile(id);
      if (success) {
        const { profiles, activeProfileId } = get();
        const remaining = profiles.filter((p) => p.id !== id);
        const newActiveId =
          activeProfileId === id
            ? (remaining.find((p) => p.isPrimary)?.id ?? remaining[0]?.id ?? null)
            : activeProfileId;
        set({
          profiles: remaining,
          activeProfileId: newActiveId,
          isMutating: false,
        });
      } else {
        set({ isMutating: false });
      }
      return success;
    } catch (err) {
      set({ isMutating: false, error: toStoreError('delete', err) });
      throw err;
    }
  },

  refreshProfile: async (id: string) => {
    try {
      const refreshed = await getProfileById(id);
      if (refreshed) {
        set({ profiles: replaceProfile(get().profiles, refreshed) });
      } else {
        // Profile was deleted externally — remove from store
        set({ profiles: get().profiles.filter((p) => p.id !== id) });
      }
    } catch (err) {
      set({ error: toStoreError('load', err) });
    }
  },

  // ── Address CRUD ──────────────────────────────────────────────────

  createAddress: async (profileId: string, input: CreateAddressInput) => {
    set({ isMutating: true, error: null });
    try {
      const address = await createProfileAddress(profileId, input);
      // Refresh addresses for this profile from DB to get correct default state
      const addresses = await getAddressesByProfileId(profileId);
      const { profiles } = get();
      set({
        profiles: profiles.map((p) =>
          p.id === profileId ? { ...p, addresses } : p,
        ),
        isMutating: false,
      });
      return address;
    } catch (err) {
      set({ isMutating: false, error: toStoreError('createAddress', err) });
      throw err;
    }
  },

  updateAddress: async (id: string, profileId: string, input: UpdateAddressInput) => {
    set({ isMutating: true, error: null });
    try {
      const updated = await updateProfileAddress(id, profileId, input);
      if (updated) {
        // Refresh addresses to reflect default-flag changes
        const addresses = await getAddressesByProfileId(profileId);
        const { profiles } = get();
        set({
          profiles: profiles.map((p) =>
            p.id === profileId ? { ...p, addresses } : p,
          ),
          isMutating: false,
        });
      } else {
        set({ isMutating: false });
      }
      return updated;
    } catch (err) {
      set({ isMutating: false, error: toStoreError('updateAddress', err) });
      throw err;
    }
  },

  deleteAddress: async (id: string, profileId: string) => {
    set({ isMutating: true, error: null });
    try {
      const success = await deleteProfileAddress(id, profileId);
      if (success) {
        const { profiles } = get();
        set({
          profiles: profiles.map((p) =>
            p.id === profileId
              ? { ...p, addresses: p.addresses.filter((a: Address) => a.id !== id) }
              : p,
          ),
          isMutating: false,
        });
      } else {
        set({ isMutating: false });
      }
      return success;
    } catch (err) {
      set({ isMutating: false, error: toStoreError('deleteAddress', err) });
      throw err;
    }
  },

  // ── Identity Document CRUD ────────────────────────────────────────

  createIdentityDocument: async (
    profileId: string,
    input: CreateIdentityDocumentInput,
  ) => {
    set({ isMutating: true, error: null });
    try {
      const doc = await createProfileIdentityDocument(profileId, input);
      const { profiles } = get();
      set({
        profiles: profiles.map((p) =>
          p.id === profileId ? { ...p, documents: [...p.documents, doc] } : p,
        ),
        isMutating: false,
      });
      return doc;
    } catch (err) {
      set({ isMutating: false, error: toStoreError('createIdentityDocument', err) });
      throw err;
    }
  },

  updateIdentityDocument: async (
    id: string,
    profileId: string,
    input: UpdateIdentityDocumentInput,
  ) => {
    set({ isMutating: true, error: null });
    try {
      const updated = await updateProfileIdentityDocument(id, profileId, input);
      if (updated) {
        // Refresh from DB to ensure decrypted fields are correct
        const documents = await getIdentityDocumentsByProfileId(profileId);
        const { profiles } = get();
        set({
          profiles: profiles.map((p) =>
            p.id === profileId ? { ...p, documents } : p,
          ),
          isMutating: false,
        });
      } else {
        set({ isMutating: false });
      }
      return updated;
    } catch (err) {
      set({ isMutating: false, error: toStoreError('updateIdentityDocument', err) });
      throw err;
    }
  },

  deleteIdentityDocument: async (id: string, profileId: string) => {
    set({ isMutating: true, error: null });
    try {
      const success = await deleteProfileIdentityDocument(id, profileId);
      if (success) {
        const { profiles } = get();
        set({
          profiles: profiles.map((p) =>
            p.id === profileId
              ? { ...p, documents: p.documents.filter((d: IdentityDocument) => d.id !== id) }
              : p,
          ),
          isMutating: false,
        });
      } else {
        set({ isMutating: false });
      }
      return success;
    } catch (err) {
      set({ isMutating: false, error: toStoreError('deleteIdentityDocument', err) });
      throw err;
    }
  },

  // ── Professional Registration CRUD ────────────────────────────────

  createProfessionalRegistration: async (
    profileId: string,
    input: CreateProfessionalRegistrationInput,
  ) => {
    set({ isMutating: true, error: null });
    try {
      const reg = await createProfessionalRegistration(profileId, input);
      const { profiles } = get();
      set({
        profiles: profiles.map((p) =>
          p.id === profileId
            ? { ...p, professionalRegistrations: [...p.professionalRegistrations, reg] }
            : p,
        ),
        isMutating: false,
      });
      return reg;
    } catch (err) {
      set({
        isMutating: false,
        error: toStoreError('createProfessionalRegistration', err),
      });
      throw err;
    }
  },

  updateProfessionalRegistration: async (
    id: string,
    profileId: string,
    input: UpdateProfessionalRegistrationInput,
  ) => {
    set({ isMutating: true, error: null });
    try {
      const updated = await updateProfessionalRegistration(id, profileId, input);
      if (updated) {
        const registrations = await getProfessionalRegistrationsByProfileId(profileId);
        const { profiles } = get();
        set({
          profiles: profiles.map((p) =>
            p.id === profileId ? { ...p, professionalRegistrations: registrations } : p,
          ),
          isMutating: false,
        });
      } else {
        set({ isMutating: false });
      }
      return updated;
    } catch (err) {
      set({
        isMutating: false,
        error: toStoreError('updateProfessionalRegistration', err),
      });
      throw err;
    }
  },

  deleteProfessionalRegistration: async (id: string, profileId: string) => {
    set({ isMutating: true, error: null });
    try {
      const success = await deleteProfessionalRegistration(id, profileId);
      if (success) {
        const { profiles } = get();
        set({
          profiles: profiles.map((p) =>
            p.id === profileId
              ? {
                  ...p,
                  professionalRegistrations: p.professionalRegistrations.filter(
                    (r: ProfessionalRegistration) => r.id !== id,
                  ),
                }
              : p,
          ),
          isMutating: false,
        });
      } else {
        set({ isMutating: false });
      }
      return success;
    } catch (err) {
      set({
        isMutating: false,
        error: toStoreError('deleteProfessionalRegistration', err),
      });
      throw err;
    }
  },

  // ── Emergency Contact CRUD ────────────────────────────────────────

  createEmergencyContact: async (
    profileId: string,
    input: CreateEmergencyContactInput,
  ) => {
    set({ isMutating: true, error: null });
    try {
      const contact = await createEmergencyContact(profileId, input);
      const { profiles } = get();
      set({
        profiles: profiles.map((p) =>
          p.id === profileId
            ? { ...p, emergencyContacts: [...p.emergencyContacts, contact] }
            : p,
        ),
        isMutating: false,
      });
      return contact;
    } catch (err) {
      set({ isMutating: false, error: toStoreError('createEmergencyContact', err) });
      throw err;
    }
  },

  updateEmergencyContact: async (
    id: string,
    profileId: string,
    input: UpdateEmergencyContactInput,
  ) => {
    set({ isMutating: true, error: null });
    try {
      const updated = await updateEmergencyContact(id, profileId, input);
      if (updated) {
        const contacts = await getEmergencyContactsByProfileId(profileId);
        const { profiles } = get();
        set({
          profiles: profiles.map((p) =>
            p.id === profileId ? { ...p, emergencyContacts: contacts } : p,
          ),
          isMutating: false,
        });
      } else {
        set({ isMutating: false });
      }
      return updated;
    } catch (err) {
      set({ isMutating: false, error: toStoreError('updateEmergencyContact', err) });
      throw err;
    }
  },

  deleteEmergencyContact: async (id: string, profileId: string) => {
    set({ isMutating: true, error: null });
    try {
      const success = await deleteEmergencyContact(id, profileId);
      if (success) {
        const { profiles } = get();
        set({
          profiles: profiles.map((p) =>
            p.id === profileId
              ? { ...p, emergencyContacts: p.emergencyContacts.filter((c: EmergencyContact) => c.id !== id) }
              : p,
          ),
          isMutating: false,
        });
      } else {
        set({ isMutating: false });
      }
      return success;
    } catch (err) {
      set({ isMutating: false, error: toStoreError('deleteEmergencyContact', err) });
      throw err;
    }
  },

  // ── Error handling ────────────────────────────────────────────────

  clearError: () => {
    set({ error: null });
  },

  // ── Reset ─────────────────────────────────────────────────────────

  reset: () => {
    set({ ...DEFAULT_PROFILE_STATE });
  },
}));

// ---------------------------------------------------------------------------
// Typed selectors
// ---------------------------------------------------------------------------

/** Select all profiles */
export const selectProfiles = (state: ProfileStore): UserProfile[] => state.profiles;

/** Select the active profile ID */
export const selectActiveProfileId = (state: ProfileStore): string | null =>
  state.activeProfileId;

/** Select the currently active profile */
export const selectActiveProfile = (state: ProfileStore): UserProfile | null =>
  state.profiles.find((p) => p.id === state.activeProfileId) ?? null;

/** Select the primary profile */
export const selectPrimaryProfile = (state: ProfileStore): UserProfile | null =>
  state.profiles.find((p) => p.isPrimary) ?? null;

/** Select dependent profiles (non-primary) */
export const selectDependentProfiles = (state: ProfileStore): UserProfile[] =>
  state.profiles.filter((p) => !p.isPrimary);

/** Select the total number of profiles */
export const selectProfileCount = (state: ProfileStore): number => state.profiles.length;

/** Select a profile by ID */
export const selectProfileById =
  (id: string) =>
  (state: ProfileStore): UserProfile | null =>
    state.profiles.find((p) => p.id === id) ?? null;

/** Select addresses for the active profile */
export const selectActiveProfileAddresses = (state: ProfileStore): Address[] =>
  state.profiles.find((p) => p.id === state.activeProfileId)?.addresses ?? [];

/** Select identity documents for the active profile */
export const selectActiveProfileDocuments = (state: ProfileStore): IdentityDocument[] =>
  state.profiles.find((p) => p.id === state.activeProfileId)?.documents ?? [];

/** Select professional registrations for the active profile */
export const selectActiveProfileRegistrations = (
  state: ProfileStore,
): ProfessionalRegistration[] =>
  state.profiles.find((p) => p.id === state.activeProfileId)?.professionalRegistrations ?? [];

/** Select emergency contacts for the active profile */
export const selectActiveProfileEmergencyContacts = (
  state: ProfileStore,
): EmergencyContact[] =>
  state.profiles.find((p) => p.id === state.activeProfileId)?.emergencyContacts ?? [];

/** Select whether profiles are loading */
export const selectIsLoading = (state: ProfileStore): boolean => state.isLoading;

/** Select whether a mutation is in progress */
export const selectIsMutating = (state: ProfileStore): boolean => state.isMutating;

/** Select whether the store has been initialized */
export const selectIsInitialized = (state: ProfileStore): boolean => state.isInitialized;

/** Select the current error */
export const selectError = (state: ProfileStore): ProfileStoreError | null => state.error;
