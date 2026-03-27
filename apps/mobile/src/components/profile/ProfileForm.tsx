/**
 * Profile creation/edit form component.
 *
 * Orchestrates form state via useProfileForm hook and delegates
 * rendering to section components. SA ID smart-fill auto-populates
 * DOB, gender, and citizenship.
 */

import { ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import type { UserProfile } from '@fillit/shared';

import { useTheme } from '../../theme';
import { Button } from '../ui';
import type { CreateProfileInput } from '../../services/storage/profileCrud';
import { useProfileForm } from './useProfileForm';
import {
  SaIdSection,
  PersonalSection,
  ContactSection,
  EmploymentSection,
} from './ProfileFormSections';

export interface ProfileFormProps {
  readonly initialData?: UserProfile;
  readonly onSubmit: (data: CreateProfileInput) => Promise<void>;
  readonly isSaving?: boolean;
}

export function ProfileForm({ initialData, onSubmit, isSaving = false }: ProfileFormProps) {
  const { theme } = useTheme();
  const isEditing = Boolean(initialData);
  const { form, errors, updateField, handleSaIdChange, handleSubmit, saIdHelperText } =
    useProfileForm(initialData, onSubmit);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        style={[styles.flex, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing['5xl'] }}
        keyboardShouldPersistTaps="handled"
        testID="profile-form-scroll"
      >
        <SaIdSection
          form={form}
          errors={errors}
          updateField={updateField}
          onSaIdChange={handleSaIdChange}
          saIdHelperText={saIdHelperText}
        />
        <PersonalSection form={form} errors={errors} updateField={updateField} />
        <ContactSection form={form} errors={errors} updateField={updateField} />
        <EmploymentSection form={form} updateField={updateField} />
        <Button
          label={isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Profile'}
          onPress={handleSubmit}
          loading={isSaving}
          fullWidth
          size="lg"
          testID="submit-profile"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});

ProfileForm.displayName = 'ProfileForm';
