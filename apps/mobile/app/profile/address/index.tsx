/**
 * Address list screen.
 *
 * Displays all addresses for the active profile with options to
 * add, edit, or delete addresses.
 */

import { useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';

import { useTheme } from '../../../src/theme';
import { ScreenHeader } from '../../../src/components/profile/ScreenHeader';
import { AddressList } from '../../../src/components/profile/AddressList';
import {
  useProfileStore,
  selectActiveProfile,
  selectActiveProfileAddresses,
} from '../../../src/stores/profile-store';

export default function AddressListScreen() {
  const { theme } = useTheme();
  const profile = useProfileStore(selectActiveProfile);
  const addresses = useProfileStore(selectActiveProfileAddresses);
  const deleteAddress = useProfileStore((s) => s.deleteAddress);

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  const handleAdd = useCallback(() => {
    router.push('/profile/address/add');
  }, []);

  const handleEdit = useCallback((id: string) => {
    router.push(`/profile/address/${id}`);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!profile) return;
      try {
        await deleteAddress(id, profile.id);
      } catch (err) {
        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete address.');
      }
    },
    [deleteAddress, profile],
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
      testID="address-list-screen"
    >
      <ScreenHeader title="Addresses" onBack={handleBack} />
      <AddressList
        addresses={addresses}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
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
