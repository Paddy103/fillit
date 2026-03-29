/**
 * Signature management screen.
 *
 * Lists all saved signatures for the active profile. Supports
 * adding new signatures, deleting existing ones, and setting a default.
 */

import { useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';

import { useTheme } from '../../../src/theme';
import { ScreenHeader } from '../../../src/components/profile/ScreenHeader';
import { SignatureList } from '../../../src/components/signature';
import {
  useProfileStore,
  selectActiveProfile,
  selectActiveProfileSignatures,
} from '../../../src/stores/profile-store';

export default function SignatureManagementScreen() {
  const { theme } = useTheme();
  const profile = useProfileStore(selectActiveProfile);
  const signatures = useProfileStore(selectActiveProfileSignatures);
  const deleteSignature = useProfileStore((s) => s.deleteSignature);
  const setDefaultSignature = useProfileStore((s) => s.setDefaultSignature);

  const handleAdd = useCallback(() => {
    router.push('/profile/signature/add' as never);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!profile) return;
      try {
        await deleteSignature(id, profile.id);
      } catch (err) {
        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete signature.');
      }
    },
    [profile, deleteSignature],
  );

  const handleSetDefault = useCallback(
    async (id: string) => {
      if (!profile) return;
      try {
        await setDefaultSignature(id, profile.id);
      } catch (err) {
        Alert.alert(
          'Error',
          err instanceof Error ? err.message : 'Failed to set default signature.',
        );
      }
    },
    [profile, setDefaultSignature],
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      testID="signature-management-screen"
    >
      <ScreenHeader title="Signatures" onBack={() => router.back()} />
      <SignatureList
        signatures={signatures}
        onAdd={handleAdd}
        onDelete={handleDelete}
        onSetDefault={handleSetDefault}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
