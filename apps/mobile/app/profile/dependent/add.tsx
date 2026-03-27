/**
 * Add dependent profile screen.
 *
 * Presents a relationship picker followed by the reusable ProfileForm.
 * Creates a new profile with isPrimary=false and the selected relationship.
 */

import { useState, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import type { ProfileRelationship } from '@fillit/shared';

import { useTheme } from '../../../src/theme';
import { ProfileForm } from '../../../src/components/profile';
import { ScreenHeader } from '../../../src/components/profile/ScreenHeader';
import { useProfileStore } from '../../../src/stores/profile-store';
import type { CreateProfileInput } from '../../../src/services/storage/profileCrud';
import { RelationshipSection } from './RelationshipSection';

export default function AddDependentScreen() {
  const { theme } = useTheme();
  const createProfile = useProfileStore((s) => s.createProfile);
  const isMutating = useProfileStore((s) => s.mutationCount > 0);
  const [relationship, setRelationship] = useState<ProfileRelationship | ''>('');
  const [relationshipError, setRelationshipError] = useState('');

  const handleSubmit = useCallback(
    async (data: CreateProfileInput) => {
      if (!relationship) {
        setRelationshipError('Please select a relationship');
        return;
      }
      try {
        const input: CreateProfileInput = {
          ...data,
          isPrimary: false,
          relationship,
        };
        await createProfile(input);
        Alert.alert('Dependent Added', 'The dependent profile has been created.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } catch (err) {
        Alert.alert(
          'Error',
          err instanceof Error ? err.message : 'Failed to add dependent. Please try again.',
        );
      }
    },
    [createProfile, relationship],
  );

  const handleRelationshipChange = useCallback((val: ProfileRelationship | '') => {
    setRelationship(val);
    if (val) setRelationshipError('');
  }, []);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      testID="add-dependent-screen"
    >
      <ScreenHeader title="Add Dependent" onBack={() => router.back()} />
      <ProfileForm
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        isSaving={isMutating}
        headerContent={
          <RelationshipSection
            value={relationship}
            onChange={handleRelationshipChange}
            error={relationshipError}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
