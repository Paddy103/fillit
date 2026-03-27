/**
 * Address list component.
 *
 * Displays all addresses for the active profile with an add button.
 * Shows an empty state when no addresses exist.
 */

import { View, Text, FlatList, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Address } from '@fillit/shared';

import { useTheme } from '../../theme';
import { Button } from '../ui';
import { AddressCard } from './AddressCard';

interface AddressListProps {
  readonly addresses: Address[];
  readonly onAdd: () => void;
  readonly onEdit: (id: string) => void;
  readonly onDelete: (id: string) => void;
}

export function AddressList({ addresses, onAdd, onEdit, onDelete }: AddressListProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container} testID="address-list">
      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AddressCard address={item} onEdit={onEdit} onDelete={onDelete} />
        )}
        ListEmptyComponent={<EmptyState />}
        ListHeaderComponent={<ListHeader count={addresses.length} onAdd={onAdd} />}
        contentContainerStyle={{
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing['5xl'],
        }}
      />
    </View>
  );
}

function ListHeader({ count, onAdd }: { count: number; onAdd: () => void }) {
  const { theme } = useTheme();

  return (
    <View style={[styles.header, { marginBottom: theme.spacing.lg }]}>
      <Text
        style={[theme.typography.bodyMedium, { color: theme.colors.onSurfaceVariant, flex: 1 }]}
      >
        {count === 0 ? 'No addresses yet' : `${count} address${count !== 1 ? 'es' : ''}`}
      </Text>
      <Button
        label="Add Address"
        size="sm"
        onPress={onAdd}
        iconLeft={<Ionicons name="add" size={16} color={theme.colors.onPrimary} />}
        testID="add-address-button"
      />
    </View>
  );
}

function EmptyState() {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.emptyState,
        {
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: theme.radii.lg,
          padding: theme.spacing['2xl'],
        },
      ]}
    >
      <Ionicons
        name="location-outline"
        size={48}
        color={theme.colors.onSurfaceVariant}
        style={{ marginBottom: theme.spacing.md }}
      />
      <Text
        style={[
          theme.typography.titleMedium,
          {
            color: theme.colors.onSurfaceVariant,
            textAlign: 'center',
          },
        ]}
      >
        No Addresses
      </Text>
      <Text
        style={[
          theme.typography.bodyMedium,
          {
            color: theme.colors.onSurfaceVariant,
            textAlign: 'center',
            marginTop: theme.spacing.xs,
          },
        ]}
      >
        Add your addresses so FillIt can auto-fill them on forms.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emptyState: {
    alignItems: 'center',
  },
});

AddressList.displayName = 'AddressList';
