/**
 * Add address screen.
 *
 * Renders the AddressForm for creating a new address linked
 * to the active profile.
 */

import { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';

import { useTheme } from '../../../src/theme';
import { ScreenHeader } from '../../../src/components/profile/ScreenHeader';
import { AddressForm } from '../../../src/components/profile/AddressForm';
import { useProfileStore, selectActiveProfile } from '../../../src/stores/profile-store';
import type {
  CreateAddressInput,
  UpdateAddressInput,
} from '../../../src/services/storage/profileCrud';

function confirmDiscard(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert('Discard Changes?', 'You have unsaved changes. Are you sure you want to go back?', [
      {
        text: 'Keep Editing',
        style: 'cancel',
        onPress: () => resolve(false),
      },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => resolve(true),
      },
    ]);
  });
}

export default function AddAddressScreen() {
  const { theme } = useTheme();
  const profile = useProfileStore(selectActiveProfile);
  const createAddress = useProfileStore((s) => s.createAddress);
  const isMutating = useProfileStore((s) => s.mutationCount > 0);
  const isDirtyRef = useRef(false);

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
    async (data: CreateAddressInput | UpdateAddressInput) => {
      if (!profile) return;
      try {
        await createAddress(profile.id, data as CreateAddressInput);
        Alert.alert('Address Added', 'Your address has been saved.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } catch (err) {
        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add address.');
      }
    },
    [createAddress, profile],
  );

  if (!profile) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={[theme.typography.bodyLarge, { color: theme.colors.onSurfaceVariant }]}>
          No profile selected
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      testID="add-address-screen"
    >
      <ScreenHeader title="Add Address" onBack={handleBack} />
      <AddressForm
        onSubmit={handleSubmit}
        onCancel={handleBack}
        onDirtyChange={handleDirtyChange}
        isSaving={isMutating}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
