/**
 * Address creation/edit form component.
 *
 * Orchestrates form state via useAddressForm hook and delegates
 * rendering to AddressFormFields sub-components. Includes a
 * province picker modal and default address toggle.
 */

import { useState, useCallback, useEffect } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import type { Address } from '@fillit/shared';

import { useTheme } from '../../theme';
import { Button } from '../ui';
import { useAddressForm } from './useAddressForm';
import {
  AddressTypeSelector,
  StreetFields,
  CityProvinceFields,
  DefaultToggle,
} from './AddressFormFields';
import { ProvincePicker } from './ProvincePicker';
import { buildCreateInput, buildUpdateInput } from './addressFormTypes';
import type { CreateAddressInput, UpdateAddressInput } from '../../services/storage/profileCrud';

export interface AddressFormProps {
  readonly initialData?: Address;
  readonly onSubmit: (data: CreateAddressInput | UpdateAddressInput) => Promise<void>;
  readonly onCancel?: () => void;
  readonly onDirtyChange?: (isDirty: boolean) => void;
  readonly isSaving?: boolean;
}

export function AddressForm({
  initialData,
  onSubmit,
  onCancel,
  onDirtyChange,
  isSaving = false,
}: AddressFormProps) {
  const { theme } = useTheme();
  const isEditing = Boolean(initialData);
  const { form, errors, isDirty, updateField, validate } = useAddressForm(initialData);
  const [provincePickerVisible, setProvincePickerVisible] = useState(false);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    const input = isEditing ? buildUpdateInput(form) : buildCreateInput(form);
    await onSubmit(input);
  }, [form, isEditing, onSubmit, validate]);

  const handleProvinceSelect = useCallback(
    (province: string) => {
      updateField('province', province);
      setProvincePickerVisible(false);
    },
    [updateField],
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        style={[styles.flex, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={{
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing['5xl'],
        }}
        keyboardShouldPersistTaps="handled"
        testID="address-form-scroll"
      >
        <AddressTypeSelector form={form} errors={errors} updateField={updateField} />
        <StreetFields form={form} errors={errors} updateField={updateField} />
        <CityProvinceFields
          form={form}
          errors={errors}
          updateField={updateField}
          onOpenProvincePicker={() => setProvincePickerVisible(true)}
        />
        <DefaultToggle isDefault={form.isDefault} onToggle={(v) => updateField('isDefault', v)} />
        <Button
          label={isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Address'}
          onPress={handleSubmit}
          loading={isSaving}
          fullWidth
          size="lg"
          testID="submit-address"
        />
        {onCancel ? (
          <Button
            label="Cancel"
            variant="ghost"
            onPress={onCancel}
            fullWidth
            size="md"
            style={{ marginTop: theme.spacing.sm }}
            testID="cancel-address"
          />
        ) : null}
      </ScrollView>
      <ProvincePicker
        visible={provincePickerVisible}
        selectedProvince={form.province}
        onSelect={handleProvinceSelect}
        onClose={() => setProvincePickerVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});

AddressForm.displayName = 'AddressForm';
