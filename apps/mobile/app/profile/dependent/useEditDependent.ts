/**
 * Custom hook for the edit dependent screen logic.
 *
 * Encapsulates state management, submit/delete handlers,
 * and relationship tracking for the edit dependent flow.
 */

import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import type { ProfileRelationship, UserProfile } from '@fillit/shared';

import { useProfileStore } from '../../../src/stores/profile-store';
import type { CreateProfileInput } from '../../../src/services/storage/profileCrud';

// ─── Confirmation dialogs ───────────────────────────────────────────

function confirmDiscard(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert('Discard Changes?', 'You have unsaved changes. Are you sure you want to go back?', [
      { text: 'Keep Editing', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Discard', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

function confirmDelete(name: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      'Delete Dependent?',
      `Are you sure you want to delete ${name}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
      ],
    );
  });
}

// ─── Hook ───────────────────────────────────────────────────────────

export function useEditDependent(profile: UserProfile | null) {
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const deleteProfile = useProfileStore((s) => s.deleteProfile);
  const isMutating = useProfileStore((s) => s.mutationCount > 0);
  const isDirtyRef = useRef(false);

  const [relationship, setRelationship] = useState<ProfileRelationship | ''>(
    profile?.relationship ?? '',
  );

  const handleDirtyChange = useCallback((dirty: boolean) => {
    isDirtyRef.current = dirty;
  }, []);

  const handleBack = useCallback(async () => {
    if (isDirtyRef.current) {
      const shouldDiscard = await confirmDiscard();
      if (!shouldDiscard) return;
    }
    router.back();
  }, []);

  const handleSubmit = useCallback(
    async (data: CreateProfileInput) => {
      if (!profile) return;
      if (!relationship) {
        Alert.alert('Error', 'Please select a relationship');
        return;
      }
      try {
        await updateProfile(profile.id, { ...data, isPrimary: false, relationship });
        Alert.alert('Dependent Updated', 'The dependent profile has been saved.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } catch (err) {
        Alert.alert(
          'Error',
          err instanceof Error ? err.message : 'Failed to update dependent. Please try again.',
        );
      }
    },
    [profile, updateProfile, relationship],
  );

  const handleDelete = useCallback(async () => {
    if (!profile) return;
    const fullName = `${profile.firstName} ${profile.lastName}`;
    const shouldDelete = await confirmDelete(fullName);
    if (!shouldDelete) return;
    try {
      await deleteProfile(profile.id);
      router.back();
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to delete dependent. Please try again.',
      );
    }
  }, [profile, deleteProfile]);

  const handleRelationshipChange = useCallback((val: ProfileRelationship | '') => {
    setRelationship(val);
    isDirtyRef.current = true;
  }, []);

  return {
    relationship,
    isMutating,
    handleDirtyChange,
    handleBack,
    handleSubmit,
    handleDelete,
    handleRelationshipChange,
  };
}
