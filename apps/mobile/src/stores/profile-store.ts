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
  type CreateProfileInput,
  type UpdateProfileInput,
  type CreateAddressInput,
  type UpdateAddressInput,
  type CreateIdentityDocumentInput,
  type UpdateIdentityDocumentInput,
  type CreateProfessionalRegistrationInput,
  type UpdateProfessionalRegistrationInput,
  type CreateEmergencyContactInput,
  type UpdateEmergencyContactInput,
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
  initialize: () => Promise<void>;
  setActiveProfileId: (id: string | null) => void;
  createProfile: (input: CreateProfileInput) => Promise<UserProfile>;
  createFullProfile: (
    profile: Omit<UserProfile, 'createdAt' | 'updatedAt' | 'signatures'>,
  ) => Promise<UserProfile>;
  updateProfile: (id: string, input: UpdateProfileInput) => Promise<UserProfile | null>;
  deleteProfile: (id: string) => Promise<boolean>;
  refreshProfile: (id: string) => Promise<void>;
  createAddress: (profileId: string, input: CreateAddressInput) => Promise<Address>;
  updateAddress: (
    id: string,
    profileId: string,
    input: UpdateAddressInput,
  ) => Promise<Address | null>;
  deleteAddress: (id: string, profileId: string) => Promise<boolean>;
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
  clearError: () => void;
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

type SetFn = {
  (partial: Partial<ProfileStore> | ((state: ProfileStore) => Partial<ProfileStore>)): void;
};
type GetFn = () => ProfileStore;

function toStoreError(operation: ProfileOperation, err: unknown): ProfileStoreError {
  return {
    operation,
    message: err instanceof Error ? err.message : String(err),
    cause: err,
  };
}

function replaceProfile(profiles: UserProfile[], updated: UserProfile): UserProfile[] {
  return profiles.map((p) => (p.id === updated.id ? updated : p));
}

/**
 * Pick the best active profile ID after a profile is removed.
 * Prefers the primary profile, then falls back to the first remaining.
 */
function pickActiveAfterRemoval(
  removedId: string,
  currentActiveId: string | null,
  remaining: UserProfile[],
): string | null {
  if (currentActiveId !== removedId) return currentActiveId;
  return remaining.find((p) => p.isPrimary)?.id ?? remaining[0]?.id ?? null;
}

// ---------------------------------------------------------------------------
// Action factories — each returns a slice of the store actions
// ---------------------------------------------------------------------------

function createMutationHelpers(set: SetFn) {
  const startMutation = () => set((s) => ({ mutationCount: s.mutationCount + 1, error: null }));
  const endMutation = () => set((s) => ({ mutationCount: s.mutationCount - 1 }));
  const endMutationWithError = (op: ProfileOperation, err: unknown) =>
    set((s) => ({ mutationCount: s.mutationCount - 1, error: toStoreError(op, err) }));
  const updateProfileChildren = (
    profileId: string,
    updater: (profile: UserProfile) => Partial<UserProfile>,
  ) =>
    set((s) => ({
      profiles: s.profiles.map((p) => (p.id === profileId ? { ...p, ...updater(p) } : p)),
      mutationCount: s.mutationCount - 1,
    }));

  return { startMutation, endMutation, endMutationWithError, updateProfileChildren };
}

function createInitActions(set: SetFn, get: GetFn) {
  return {
    initialize: async () => {
      const { isInitialized, isLoading } = get();
      if (isInitialized || isLoading) return;

      set({ isLoading: true, error: null });
      try {
        const profiles = await listProfiles();
        const activeId = profiles.find((p) => p.isPrimary)?.id ?? profiles[0]?.id ?? null;
        set({ profiles, activeProfileId: activeId, isLoading: false, isInitialized: true });
      } catch (err) {
        set({ isLoading: false, error: toStoreError('load', err) });
      }
    },

    setActiveProfileId: (id: string | null) => {
      set({ activeProfileId: id });
    },
  };
}

function createProfileActions(
  set: SetFn,
  get: GetFn,
  { startMutation, endMutation, endMutationWithError }: ReturnType<typeof createMutationHelpers>,
) {
  return {
    createProfile: async (input: CreateProfileInput) => {
      startMutation();
      try {
        const profile = await createProfile(input);
        set((s) => ({
          profiles: [...s.profiles, profile],
          activeProfileId: profile.isPrimary || !s.activeProfileId ? profile.id : s.activeProfileId,
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
          activeProfileId: created.isPrimary || !s.activeProfileId ? created.id : s.activeProfileId,
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
            return {
              profiles: remaining,
              activeProfileId: pickActiveAfterRemoval(id, s.activeProfileId, remaining),
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
          set((s) => {
            const remaining = s.profiles.filter((p) => p.id !== id);
            return {
              profiles: remaining,
              activeProfileId: pickActiveAfterRemoval(id, s.activeProfileId, remaining),
            };
          });
        }
      } catch (err) {
        set({ error: toStoreError('load', err) });
      }
    },
  };
}

function createAddressActions({
  startMutation,
  endMutation,
  endMutationWithError,
  updateProfileChildren,
}: ReturnType<typeof createMutationHelpers>) {
  return {
    createAddress: async (profileId: string, input: CreateAddressInput) => {
      startMutation();
      try {
        const address = await createProfileAddress(profileId, input);
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
  };
}

function createIdentityDocumentActions({
  startMutation,
  endMutation,
  endMutationWithError,
  updateProfileChildren,
}: ReturnType<typeof createMutationHelpers>) {
  return {
    createIdentityDocument: async (profileId: string, input: CreateIdentityDocumentInput) => {
      startMutation();
      try {
        const doc = await createProfileIdentityDocument(profileId, input);
        updateProfileChildren(profileId, (p) => ({ documents: [...p.documents, doc] }));
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
  };
}

function createProfessionalRegistrationActions({
  startMutation,
  endMutation,
  endMutationWithError,
  updateProfileChildren,
}: ReturnType<typeof createMutationHelpers>) {
  return {
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
          updateProfileChildren(profileId, () => ({ professionalRegistrations: registrations }));
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
  };
}

function createEmergencyContactActions({
  startMutation,
  endMutation,
  endMutationWithError,
  updateProfileChildren,
}: ReturnType<typeof createMutationHelpers>) {
  return {
    createEmergencyContact: async (profileId: string, input: CreateEmergencyContactInput) => {
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
            emergencyContacts: p.emergencyContacts.filter((c: EmergencyContact) => c.id !== id),
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
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useProfileStore = create<ProfileStore>()(createProfileStore);

function createProfileStore(set: SetFn, get: GetFn): ProfileStore {
  const mutationHelpers = createMutationHelpers(set);

  return {
    ...DEFAULT_PROFILE_STATE,
    ...createInitActions(set, get),
    ...createProfileActions(set, get, mutationHelpers),
    ...createAddressActions(mutationHelpers),
    ...createIdentityDocumentActions(mutationHelpers),
    ...createProfessionalRegistrationActions(mutationHelpers),
    ...createEmergencyContactActions(mutationHelpers),
    clearError: () => set({ error: null }),
    reset: () => set({ ...DEFAULT_PROFILE_STATE }),
  };
}

// ---------------------------------------------------------------------------
// Typed selectors
// ---------------------------------------------------------------------------

/** Select all profiles */
export const selectProfiles = (state: ProfileStore): UserProfile[] => state.profiles;

/** Select the active profile ID */
export const selectActiveProfileId = (state: ProfileStore): string | null => state.activeProfileId;

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
export const selectActiveProfileRegistrations = (state: ProfileStore): ProfessionalRegistration[] =>
  state.profiles.find((p) => p.id === state.activeProfileId)?.professionalRegistrations ?? [];

/** Select emergency contacts for the active profile */
export const selectActiveProfileEmergencyContacts = (state: ProfileStore): EmergencyContact[] =>
  state.profiles.find((p) => p.id === state.activeProfileId)?.emergencyContacts ?? [];

/** Select whether profiles are loading */
export const selectIsLoading = (state: ProfileStore): boolean => state.isLoading;

/** Select whether any mutation is in progress */
export const selectIsMutating = (state: ProfileStore): boolean => state.mutationCount > 0;

/** Select whether the store has been initialized */
export const selectIsInitialized = (state: ProfileStore): boolean => state.isInitialized;

/** Select the current error */
export const selectError = (state: ProfileStore): ProfileStoreError | null => state.error;
