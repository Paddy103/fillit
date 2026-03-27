/**
 * Edit dependent profile screen.
 *
 * Pre-fills the ProfileForm with the dependent's existing data,
 * includes a relationship picker, and provides a delete option
 * with confirmation dialog.
 */

import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { useTheme } from '../../../src/theme';
import { Button } from '../../../src/components/ui';
import { ProfileForm } from '../../../src/components/profile';
import { ScreenHeader } from '../../../src/components/profile/ScreenHeader';
import { useProfileStore, selectProfileById } from '../../../src/stores/profile-store';
import { RelationshipSection } from './RelationshipSection';
import { useEditDependent } from './useEditDependent';

// ─── Screen ─────────────────────────────────────────────────────────

export default function EditDependentScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useProfileStore(selectProfileById(id ?? ''));
  const {
    relationship,
    isMutating,
    handleDirtyChange,
    handleBack,
    handleSubmit,
    handleDelete,
    handleRelationshipChange,
  } = useEditDependent(profile);

  if (!profile) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={[theme.typography.bodyLarge, { color: theme.colors.onSurfaceVariant }]}>
          Dependent not found
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      testID="edit-dependent-screen"
    >
      <ScreenHeader title="Edit Dependent" onBack={handleBack} />
      <ProfileForm
        initialData={profile}
        onSubmit={handleSubmit}
        onCancel={handleBack}
        onDirtyChange={handleDirtyChange}
        isSaving={isMutating}
        headerContent={
          <RelationshipSection value={relationship} onChange={handleRelationshipChange} />
        }
      />
      <DeleteButton onDelete={handleDelete} isDeleting={isMutating} />
    </View>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function DeleteButton({ onDelete, isDeleting }: { onDelete: () => void; isDeleting: boolean }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
      }}
    >
      <Button
        label={isDeleting ? 'Deleting...' : 'Delete Dependent'}
        variant="ghost"
        onPress={onDelete}
        fullWidth
        size="md"
        style={{ borderColor: theme.colors.error }}
        testID="delete-dependent-button"
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
