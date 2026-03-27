/**
 * Individual field sections for the address form.
 *
 * Broken out from AddressForm to respect the 80-line function limit.
 * Each section renders a group of related address fields.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../../theme';
import { TextInput } from '../ui';
import {
  ADDRESS_TYPE_OPTIONS,
  type AddressFormData,
  type AddressFormErrors,
} from './addressFormTypes';

type UpdateField = <K extends keyof AddressFormData>(field: K, value: AddressFormData[K]) => void;

interface FieldSectionProps {
  readonly form: AddressFormData;
  readonly errors: AddressFormErrors;
  readonly updateField: UpdateField;
}

// ─── Type Selector ──────────────────────────────────────────────────

const ALL_LABELS = [...ADDRESS_TYPE_OPTIONS, 'Custom'] as const;

export function AddressTypeSelector({ form, errors, updateField }: FieldSectionProps) {
  const { theme } = useTheme();
  const isCustom = form.label === 'Custom';

  return (
    <View style={{ marginBottom: theme.spacing.lg }}>
      <Text
        style={[
          theme.typography.labelMedium,
          {
            color: errors.label ? theme.colors.error : theme.colors.onSurfaceVariant,
            marginBottom: theme.spacing.xs,
          },
        ]}
      >
        Address Type
      </Text>
      <View style={styles.chipRow}>
        {ALL_LABELS.map((label) => (
          <TypeChip
            key={label}
            label={label}
            selected={form.label === label}
            onPress={() => updateField('label', label)}
          />
        ))}
      </View>
      {errors.label ? (
        <Text
          style={[
            theme.typography.caption,
            { color: theme.colors.error, marginTop: theme.spacing.xs },
          ]}
        >
          {errors.label}
        </Text>
      ) : null}
      {isCustom ? (
        <TextInput
          label="Custom Label"
          value={form.customLabel}
          onChangeText={(t) => updateField('customLabel', t)}
          error={errors.customLabel}
          placeholder="e.g. Holiday Home"
          testID="address-custom-label"
          containerStyle={{ marginTop: theme.spacing.sm }}
        />
      ) : null}
    </View>
  );
}

function TypeChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        {
          borderRadius: theme.radii.full,
          paddingVertical: theme.spacing.xs,
          paddingHorizontal: theme.spacing.md,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? theme.colors.primary : theme.colors.outline,
          backgroundColor: selected ? theme.colors.primaryLight : 'transparent',
        },
      ]}
    >
      <Text
        style={[
          theme.typography.labelMedium,
          {
            color: selected ? theme.colors.primary : theme.colors.onSurface,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Street Fields ──────────────────────────────────────────────────

export function StreetFields({ form, errors, updateField }: FieldSectionProps) {
  return (
    <>
      <TextInput
        label="Street Address"
        value={form.street1}
        onChangeText={(t) => updateField('street1', t)}
        error={errors.street1}
        placeholder="123 Main Road"
        autoCapitalize="words"
        testID="address-street1"
      />
      <TextInput
        label="Street Address 2 (Optional)"
        value={form.street2}
        onChangeText={(t) => updateField('street2', t)}
        placeholder="Apartment, unit, etc."
        autoCapitalize="words"
        testID="address-street2"
      />
      <TextInput
        label="Suburb (Optional)"
        value={form.suburb}
        onChangeText={(t) => updateField('suburb', t)}
        placeholder="Suburb"
        autoCapitalize="words"
        testID="address-suburb"
      />
    </>
  );
}

// ─── City / Province / Postal ───────────────────────────────────────

interface ProvinceSelectorProps extends FieldSectionProps {
  readonly onOpenProvincePicker: () => void;
}

export function CityProvinceFields({
  form,
  errors,
  updateField,
  onOpenProvincePicker,
}: ProvinceSelectorProps) {
  const { theme } = useTheme();

  return (
    <>
      <TextInput
        label="City"
        value={form.city}
        onChangeText={(t) => updateField('city', t)}
        error={errors.city}
        placeholder="City"
        autoCapitalize="words"
        testID="address-city"
      />
      <Pressable
        onPress={onOpenProvincePicker}
        accessibilityRole="button"
        accessibilityLabel="Select province"
        testID="address-province-selector"
      >
        <TextInput
          label="Province"
          value={form.province}
          error={errors.province}
          placeholder="Select a province"
          editable={false}
          pointerEvents="none"
          rightAdornment={
            <Ionicons name="chevron-down" size={20} color={theme.colors.onSurfaceVariant} />
          }
          testID="address-province"
        />
      </Pressable>
      <TextInput
        label="Postal Code"
        value={form.postalCode}
        onChangeText={(t) => updateField('postalCode', t)}
        error={errors.postalCode}
        placeholder="0001"
        keyboardType="number-pad"
        maxLength={4}
        testID="address-postal-code"
      />
    </>
  );
}

// ─── Default Toggle ─────────────────────────────────────────────────

interface DefaultToggleProps {
  readonly isDefault: boolean;
  readonly onToggle: (value: boolean) => void;
}

export function DefaultToggle({ isDefault, onToggle }: DefaultToggleProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={() => onToggle(!isDefault)}
      accessibilityRole="switch"
      accessibilityState={{ checked: isDefault }}
      accessibilityLabel="Set as default address"
      testID="address-default-toggle"
      style={[
        styles.toggleRow,
        {
          paddingVertical: theme.spacing.md,
          marginBottom: theme.spacing.lg,
        },
      ]}
    >
      <View style={styles.toggleLabel}>
        <Ionicons
          name={isDefault ? 'star' : 'star-outline'}
          size={20}
          color={isDefault ? theme.colors.warning : theme.colors.onSurfaceVariant}
        />
        <Text
          style={[
            theme.typography.bodyMedium,
            {
              color: theme.colors.onSurface,
              marginLeft: theme.spacing.sm,
            },
          ]}
        >
          Set as default address
        </Text>
      </View>
      <View
        style={[
          styles.toggle,
          {
            backgroundColor: isDefault ? theme.colors.primary : theme.colors.surfaceVariant,
            borderRadius: theme.radii.full,
          },
        ]}
      >
        <View
          style={[
            styles.toggleThumb,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radii.full,
              transform: [{ translateX: isDefault ? 20 : 2 }],
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggle: {
    width: 44,
    height: 24,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 20,
    height: 20,
  },
});

AddressTypeSelector.displayName = 'AddressTypeSelector';
StreetFields.displayName = 'StreetFields';
CityProvinceFields.displayName = 'CityProvinceFields';
DefaultToggle.displayName = 'DefaultToggle';
