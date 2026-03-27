/**
 * Emergency contact form component.
 *
 * Collects first name, last name, relationship, mobile phone (SA format),
 * optional work phone, and optional email. Validates on submit.
 */

import { useCallback } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import type { EmergencyContact } from '@fillit/shared';

import { useTheme } from '../../theme';
import { Button, TextInput, Card } from '../ui';
import { SectionHeader } from './ProfileFormSections';
import { useEmergencyContactForm, type EmergencyContactFormData } from './useEmergencyContactForm';

// ─── Types ───────────────────────────────────────────────────────────

export interface EmergencyContactFormProps {
  readonly initialData?: EmergencyContact;
  readonly onSubmit: (data: EmergencyContactFormData) => Promise<void>;
  readonly onCancel?: () => void;
  readonly isSaving?: boolean;
}

// ─── Sub-components ──────────────────────────────────────────────────

function NameFields({
  form,
  errors,
  updateField,
}: {
  form: EmergencyContactFormData;
  errors: Record<string, string | undefined>;
  updateField: <K extends keyof EmergencyContactFormData>(
    field: K,
    value: EmergencyContactFormData[K],
  ) => void;
}) {
  return (
    <>
      <TextInput
        label="First Name"
        value={form.firstName}
        onChangeText={(v) => updateField('firstName', v)}
        error={errors.firstName}
        autoCapitalize="words"
        testID="emergency-first-name"
      />
      <TextInput
        label="Last Name"
        value={form.lastName}
        onChangeText={(v) => updateField('lastName', v)}
        error={errors.lastName}
        autoCapitalize="words"
        testID="emergency-last-name"
      />
      <TextInput
        label="Relationship"
        value={form.relationship}
        onChangeText={(v) => updateField('relationship', v)}
        error={errors.relationship}
        placeholder="e.g. Spouse, Parent, Sibling"
        autoCapitalize="words"
        testID="emergency-relationship"
      />
    </>
  );
}

function PhoneFields({
  form,
  errors,
  updateField,
}: {
  form: EmergencyContactFormData;
  errors: Record<string, string | undefined>;
  updateField: <K extends keyof EmergencyContactFormData>(
    field: K,
    value: EmergencyContactFormData[K],
  ) => void;
}) {
  return (
    <>
      <TextInput
        label="Mobile Phone"
        value={form.phoneMobile}
        onChangeText={(v) => updateField('phoneMobile', v)}
        error={errors.phoneMobile}
        helperText="SA format: 0XX XXX XXXX or +27XX XXX XXXX"
        keyboardType="phone-pad"
        testID="emergency-phone-mobile"
      />
      <TextInput
        label="Work Phone (Optional)"
        value={form.phoneWork}
        onChangeText={(v) => updateField('phoneWork', v)}
        error={errors.phoneWork}
        helperText="SA format: 0XX XXX XXXX or +27XX XXX XXXX"
        keyboardType="phone-pad"
        testID="emergency-phone-work"
      />
      <TextInput
        label="Email (Optional)"
        value={form.email}
        onChangeText={(v) => updateField('email', v)}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        testID="emergency-email"
      />
    </>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function EmergencyContactForm({
  initialData,
  onSubmit,
  onCancel,
  isSaving = false,
}: EmergencyContactFormProps) {
  const { theme } = useTheme();
  const isEditing = Boolean(initialData);
  const { form, errors, updateField, validate } = useEmergencyContactForm(initialData);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    await onSubmit(form);
  }, [form, validate, onSubmit]);

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
        testID="emergency-contact-form-scroll"
      >
        <Card elevation="sm" padding="lg" style={{ marginBottom: theme.spacing.lg }}>
          <SectionHeader icon="person-outline" title="Contact Details" />
          <NameFields form={form} errors={errors} updateField={updateField} />
        </Card>
        <Card elevation="sm" padding="lg" style={{ marginBottom: theme.spacing.xl }}>
          <SectionHeader icon="call-outline" title="Phone & Email" />
          <PhoneFields form={form} errors={errors} updateField={updateField} />
        </Card>
        <Button
          label={isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Contact'}
          onPress={handleSubmit}
          loading={isSaving}
          fullWidth
          size="lg"
          testID="submit-emergency-contact"
        />
        {onCancel ? (
          <Button
            label="Cancel"
            variant="ghost"
            onPress={onCancel}
            fullWidth
            size="md"
            style={{ marginTop: theme.spacing.sm }}
            testID="cancel-emergency-contact"
          />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});

EmergencyContactForm.displayName = 'EmergencyContactForm';
