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
  /** Number of in-flight mutations (derived: isMutating = mutationCount > 0) */
  mutationCount: number;
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
  mutationCount: 0,
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

export const useProfileStore = create<ProfileStore>()((set, get) => {
  // Helpers to atomically increment/decrement the mutation counter
  const startMutation = () => set((s) => ({ mutationCount: s.mutationCount + 1, error: null }));
  const endMutation = () => set((s) => ({ mutationCount: s.mutationCount - 1 }));
  const endMutationWithError = (op: ProfileOperation, err: unknown) =>
    set((s) => ({ mutationCount: s.mutationCount - 1, error: toStoreError(op, err) }));

  /**
   * Update the profiles array for a specific profile using the latest state.
   * Uses the set-updater pattern to avoid stale reads after awaits.
   */
  const updateProfileChildren = (
    profileId: string,
    updater: (profile: UserProfile) => Partial<UserProfile>,
  ) =>
    set((s) => ({
      profiles: s.profiles.map((p) => (p.id === profileId ? { ...p, ...updater(p) } : p)),
      mutationCount: s.mutationCount - 1,
    }));

  return {
    // State
    ...DEFAULT_PROFILE_STATE,

    // ── Initialization ────────────────────────────────────────────────

    initialize: async () => {
      const { isInitialized, isLoading } = get();
      if (isInitialized || isLoading) return;

      set({ isLoading: true, error: null });
      try {
        const profiles = await listProfiles();
        const activeId =
          profiles.find((p) => p.isPrimary)?.id ?? profiles[0]?.id ?? null;
        set({
          profiles,
          activeProfileId: activeId,
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
      startMutation();
      try {
        const profile = await createProfile(input);
        set((s) => ({
          profiles: [...s.profiles, profile],
          activeProfileId:
            profile.isPrimary || !s.activeProfileId ? profile.id : s.activeProfileId,
          mutationCount: s.mutationCount - 1,
        }));
        return profile;
      } catch (err) {
        endMutationWithError('create', err);
        throw err;
      }
    },

    createFullProfile: async (
      profile: Omit<UserProfile, 'createdAt' | 'updatedAt' | 'signatures'>,
    ) => {
      startMutation();
      try {
        const created = await createFullProfile(profile);
        set((s) => ({
          profiles: [...s.profiles, created],
          activeProfileId:
            created.isPrimary || !s.activeProfileId ? created.id : s.activeProfileId,
          mutationCount: s.mutationCount - 1,
        }));
        return created;
      } catch (err) {
        endMutationWithError('create', err);
        throw err;
      }
    },

    updateProfile: async (id: string, input: UpdateProfileInput) => {
      startMutation();
      try {
        const updated = await updateProfile(id, input);
        if (updated) {
          set((s) => ({
            profiles: replaceProfile(s.profiles, updated),
            mutationCount: s.mutationCount - 1,
          }));
        } else {
          endMutation();
        }
        return updated;
      } catch (err) {
        endMutationWithError('update', err);
        throw err;
      }
    },

    deleteProfile: async (id: string) => {
      startMutation();
      try {
        const success = await deleteProfile(id);
        if (success) {
          set((s) => {
            const remaining = s.profiles.filter((p) => p.id !== id);
            const newActiveId =
              s.activeProfileId === id
                ? (remaining.find((p) => p.isPrimary)?.id ?? remaining[0]?.id ?? null)
                : s.activeProfileId;
            return {
              profiles: remaining,
              activeProfileId: newActiveId,
              mutationCount: s.mutationCount - 1,
            };
          });
        } else {
          endMutation();
        }
        return success;
      } catch (err) {
        endMutationWithError('delete', err);
        throw err;
      }
    },

    refreshProfile: async (id: string) => {
      try {
        const refreshed = await getProfileById(id);
        if (refreshed) {
          set((s) => ({ profiles: replaceProfile(s.profiles, refreshed) }));
        } else {
          // Profile was deleted externally — remove and fix active ID
          set((s) => {
            const remaining = s.profiles.filter((p) => p.id !== id);
            const newActiveId =
              s.activeProfileId === id
                ? (remaining.find((p) => p.isPrimary)?.id ?? remaining[0]?.id ?? null)
                : s.activeProfileId;
            return { profiles: remaining, activeProfileId: newActiveId };
          });
        }
      } catch (err) {
        set({ error: toStoreError('load', err) });
      }
    },

    // ── Address CRUD ──────────────────────────────────────────────────

    createAddress: async (profileId: string, input: CreateAddressInput) => {
      startMutation();
      try {
        const address = await createProfileAddress(profileId, input);
        // Refresh addresses from DB to get correct default state
        const addresses = await getAddressesByProfileId(profileId);
        updateProfileChildren(profileId, () => ({ addresses }));
        return address;
      } catch (err) {
        endMutationWithError('createAddress', err);
        throw err;
      }
    },

    updateAddress: async (id: string, profileId: string, input: UpdateAddressInput) => {
      startMutation();
      try {
        const updated = await updateProfileAddress(id, profileId, input);
        if (updated) {
          const addresses = await getAddressesByProfileId(profileId);
          updateProfileChildren(profileId, () => ({ addresses }));
        } else {
          endMutation();
        }
        return updated;
      } catch (err) {
        endMutationWithError('updateAddress', err);
        throw err;
      }
    },

    deleteAddress: async (id: string, profileId: string) => {
      startMutation();
      try {
        const success = await deleteProfileAddress(id, profileId);
        if (success) {
          updateProfileChildren(profileId, (p) => ({
            addresses: p.addresses.filter((a: Address) => a.id !== id),
          }));
        } else {
          endMutation();
        }
        return success;
      } catch (err) {
        endMutationWithError('deleteAddress', err);
        throw err;
      }
    },

    // ── Identity Document CRUD ────────────────────────────────────────

    createIdentityDocument: async (
      profileId: string,
      input: CreateIdentityDocumentInput,
    ) => {
      startMutation();
      try {
        const doc = await createProfileIdentityDocument(profileId, input);
        updateProfileChildren(profileId, (p) => ({
          documents: [...p.documents, doc],
        }));
        return doc;
      } catch (err) {
        endMutationWithError('createIdentityDocument', err);
        throw err;
      }
    },

    updateIdentityDocument: async (
      id: string,
      profileId: string,
      input: UpdateIdentityDocumentInput,
    ) => {
      startMutation();
      try {
        const updated = await updateProfileIdentityDocument(id, profileId, input);
        if (updated) {
          // Refresh from DB to ensure decrypted fields are correct
          const documents = await getIdentityDocumentsByProfileId(profileId);
          updateProfileChildren(profileId, () => ({ documents }));
        } else {
          endMutation();
        }
        return updated;
      } catch (err) {
        endMutationWithError('updateIdentityDocument', err);
        throw err;
      }
    },

    deleteIdentityDocument: async (id: string, profileId: string) => {
      startMutation();
      try {
        const success = await deleteProfileIdentityDocument(id, profileId);
        if (success) {
          updateProfileChildren(profileId, (p) => ({
            documents: p.documents.filter((d: IdentityDocument) => d.id !== id),
          }));
        } else {
          endMutation();
        }
        return success;
      } catch (err) {
        endMutationWithError('deleteIdentityDocument', err);
        throw err;
      }
    },

    // ── Professional Registration CRUD ────────────────────────────────

    createProfessionalRegistration: async (
      profileId: string,
      input: CreateProfessionalRegistrationInput,
    ) => {
      startMutation();
      try {
        const reg = await createProfessionalRegistration(profileId, input);
        updateProfileChildren(profileId, (p) => ({
          professionalRegistrations: [...p.professionalRegistrations, reg],
        }));
        return reg;
      } catch (err) {
        endMutationWithError('createProfessionalRegistration', err);
        throw err;
      }
    },

    updateProfessionalRegistration: async (
      id: string,
      profileId: string,
      input: UpdateProfessionalRegistrationInput,
    ) => {
      startMutation();
      try {
        const updated = await updateProfessionalRegistration(id, profileId, input);
        if (updated) {
          const registrations = await getProfessionalRegistrationsByProfileId(profileId);
          updateProfileChildren(profileId, () => ({
            professionalRegistrations: registrations,
          }));
        } else {
          endMutation();
        }
        return updated;
      } catch (err) {
        endMutationWithError('updateProfessionalRegistration', err);
        throw err;
      }
    },

    deleteProfessionalRegistration: async (id: string, profileId: string) => {
      startMutation();
      try {
        const success = await deleteProfessionalRegistration(id, profileId);
        if (success) {
          updateProfileChildren(profileId, (p) => ({
            professionalRegistrations: p.professionalRegistrations.filter(
              (r: ProfessionalRegistration) => r.id !== id,
            ),
          }));
        } else {
          endMutation();
        }
        return success;
      } catch (err) {
        endMutationWithError('deleteProfessionalRegistration', err);
        throw err;
      }
    },

    // ── Emergency Contact CRUD ────────────────────────────────────────

    createEmergencyContact: async (
      profileId: string,
      input: CreateEmergencyContactInput,
    ) => {
      startMutation();
      try {
        const contact = await createEmergencyContact(profileId, input);
        updateProfileChildren(profileId, (p) => ({
          emergencyContacts: [...p.emergencyContacts, contact],
        }));
        return contact;
      } catch (err) {
        endMutationWithError('createEmergencyContact', err);
        throw err;
      }
    },

    updateEmergencyContact: async (
      id: string,
      profileId: string,
      input: UpdateEmergencyContactInput,
    ) => {
      startMutation();
      try {
        const updated = await updateEmergencyContact(id, profileId, input);
        if (updated) {
          const contacts = await getEmergencyContactsByProfileId(profileId);
          updateProfileChildren(profileId, () => ({ emergencyContacts: contacts }));
        } else {
          endMutation();
        }
        return updated;
      } catch (err) {
        endMutationWithError('updateEmergencyContact', err);
        throw err;
      }
    },

    deleteEmergencyContact: async (id: string, profileId: string) => {
      startMutation();
      try {
        const success = await deleteEmergencyContact(id, profileId);
        if (success) {
          updateProfileChildren(profileId, (p) => ({
            emergencyContacts: p.emergencyContacts.filter(
              (c: EmergencyContact) => c.id !== id,
            ),
          }));
        } else {
          endMutation();
        }
        return success;
      } catch (err) {
        endMutationWithError('deleteEmergencyContact', err);
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
  };
});

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

/** Select whether any mutation is in progress */
export const selectIsMutating = (state: ProfileStore): boolean => state.mutationCount > 0;

/** Select whether the store has been initialized */
export const selectIsInitialized = (state: ProfileStore): boolean => state.isInitialized;

/** Select the current error */
export const selectError = (state: ProfileStore): ProfileStoreError | null => state.error;
