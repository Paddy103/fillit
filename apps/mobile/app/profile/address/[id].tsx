/**
 * Edit address screen (dynamic route).
 *
 * Loads the address by ID from the active profile and renders
 * the AddressForm pre-filled with its data.
 */

import { useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useTheme } from '../../../src/theme';
import { ScreenHeader } from '../../../src/components/profile/ScreenHeader';
import { AddressForm } from '../../../src/components/profile/AddressForm';
import {
  useProfileStore,
  selectActiveProfile,
  selectActiveProfileAddresses,
} from '../../../src/stores/profile-store';
import type { UpdateAddressInput } from '../../../src/services/storage/profileCrud';

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

export default function EditAddressScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useProfileStore(selectActiveProfile);
  const addresses = useProfileStore(selectActiveProfileAddresses);
  const updateAddress = useProfileStore((s) => s.updateAddress);
  const isMutating = useProfileStore((s) => s.mutationCount > 0);
  const isDirtyRef = useRef(false);

  const address = useMemo(() => addresses.find((a) => a.id === id), [addresses, id]);

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
    async (data: UpdateAddressInput) => {
      if (!profile || !id) return;
      try {
        await updateAddress(id, profile.id, data);
        Alert.alert('Address Updated', 'Your address has been saved.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } catch (err) {
        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update address.');
      }
    },
    [id, profile, updateAddress],
  );

  if (!profile || !address) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={[theme.typography.bodyLarge, { color: theme.colors.onSurfaceVariant }]}>
          {!profile ? 'No profile selected' : 'Address not found'}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      testID="edit-address-screen"
    >
      <ScreenHeader title="Edit Address" onBack={handleBack} />
      <AddressForm
        initialData={address}
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
