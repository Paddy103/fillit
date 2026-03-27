/**
 * Individual address card component for the address list.
 *
 * Displays a single address with label, formatted address lines,
 * default badge, and edit/delete actions.
 */

import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Address } from '@fillit/shared';

import { useTheme } from '../../theme';
import { Card, Badge } from '../ui';

interface AddressCardProps {
  readonly address: Address;
  readonly onEdit: (id: string) => void;
  readonly onDelete: (id: string) => void;
}

export function AddressCard({ address, onEdit, onDelete }: AddressCardProps) {
  const { theme } = useTheme();

  const handleDelete = () => {
    Alert.alert('Delete Address', `Are you sure you want to delete "${address.label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDelete(address.id),
      },
    ]);
  };

  return (
    <Card
      elevation="sm"
      bordered
      style={{ marginBottom: theme.spacing.md }}
      accessibilityLabel={`${address.label} address`}
    >
      <AddressCardHeader
        label={address.label}
        isDefault={address.isDefault}
        onEdit={() => onEdit(address.id)}
        onDelete={handleDelete}
      />
      <AddressCardBody address={address} />
    </Card>
  );
}

function AddressCardHeader({
  label,
  isDefault,
  onEdit,
  onDelete,
}: {
  label: string;
  isDefault: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { theme } = useTheme();

  return (
    <View style={styles.headerRow}>
      <View style={styles.labelRow}>
        <Ionicons name="location" size={20} color={theme.colors.primary} />
        <Text
          style={[
            theme.typography.titleMedium,
            {
              color: theme.colors.onSurface,
              marginLeft: theme.spacing.sm,
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {isDefault ? <Badge variant="success" style={{ marginLeft: theme.spacing.sm }} /> : null}
        {isDefault ? (
          <Text
            style={[
              theme.typography.labelSmall,
              {
                color: theme.colors.success,
                marginLeft: theme.spacing.xs,
              },
            ]}
          >
            Default
          </Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={onEdit}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Edit address"
          testID={`edit-address-${label}`}
        >
          <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
        </Pressable>
        <Pressable
          onPress={onDelete}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Delete address"
          testID={`delete-address-${label}`}
          style={{ marginLeft: theme.spacing.md }}
        >
          <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
        </Pressable>
      </View>
    </View>
  );
}

function AddressCardBody({ address }: { address: Address }) {
  const { theme } = useTheme();
  const lines = formatAddressLines(address);

  return (
    <View style={{ marginTop: theme.spacing.sm }}>
      {lines.map((line, idx) => (
        <Text
          key={idx}
          style={[theme.typography.bodyMedium, { color: theme.colors.onSurfaceVariant }]}
        >
          {line}
        </Text>
      ))}
    </View>
  );
}

/** Format an address into display lines. */
function formatAddressLines(address: Address): string[] {
  const lines: string[] = [address.street1];
  if (address.street2) lines.push(address.street2);
  const cityLine = [address.suburb, address.city].filter(Boolean).join(', ');
  if (cityLine) lines.push(cityLine);
  const provinceLine = [address.province, address.postalCode].filter(Boolean).join(' ');
  if (provinceLine) lines.push(provinceLine);
  if (address.country) lines.push(address.country);
  return lines;
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

AddressCard.displayName = 'AddressCard';
