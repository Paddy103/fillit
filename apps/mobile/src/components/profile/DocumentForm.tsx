/**
 * Identity document add/edit form.
 *
 * Renders fields for document type (grouped picker), number (with
 * mask/reveal toggle), label, issue date, expiry date, and issuing
 * authority. Uses useDocumentForm hook for state management.
 */

import { useState, useCallback, useEffect } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { IdentityDocument } from '@fillit/shared';

import { useTheme } from '../../theme';
import { Button, TextInput } from '../ui';
import type {
  CreateIdentityDocumentInput,
  UpdateIdentityDocumentInput,
} from '../../services/storage/profileCrud';
import { useDocumentForm, type DocumentFormData, type DocumentFormErrors } from './useDocumentForm';
import { DocumentTypePicker } from './DocumentTypePicker';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DocumentFormProps {
  readonly initialData?: IdentityDocument;
  readonly onSubmitCreate: (data: CreateIdentityDocumentInput) => Promise<void>;
  readonly onSubmitUpdate?: (data: UpdateIdentityDocumentInput) => Promise<void>;
  readonly onCancel?: () => void;
  readonly onDirtyChange?: (dirty: boolean) => void;
  readonly isSaving?: boolean;
}

// ---------------------------------------------------------------------------
// Number field with reveal toggle
// ---------------------------------------------------------------------------

function NumberField({
  value,
  error,
  onChange,
}: {
  value: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  const { theme } = useTheme();
  const [revealed, setRevealed] = useState(false);

  const toggleReveal = useCallback(() => {
    setRevealed((prev) => !prev);
  }, []);

  return (
    <TextInput
      label="Document Number"
      value={value}
      onChangeText={onChange}
      error={error}
      secureTextEntry={!revealed}
      autoCapitalize="characters"
      autoCorrect={false}
      testID="doc-number-input"
      rightAdornment={
        <Pressable
          onPress={toggleReveal}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={revealed ? 'Hide number' : 'Show number'}
          testID="doc-number-toggle"
        >
          <Ionicons
            name={revealed ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={theme.colors.onSurfaceVariant}
          />
        </Pressable>
      }
    />
  );
}

// ---------------------------------------------------------------------------
// Date fields section
// ---------------------------------------------------------------------------

function DateFields({
  issueDate,
  expiryDate,
  issueDateError,
  expiryDateError,
  onIssueDateChange,
  onExpiryDateChange,
}: {
  issueDate: string;
  expiryDate: string;
  issueDateError?: string;
  expiryDateError?: string;
  onIssueDateChange: (v: string) => void;
  onExpiryDateChange: (v: string) => void;
}) {
  return (
    <>
      <TextInput
        label="Issue Date"
        value={issueDate}
        onChangeText={onIssueDateChange}
        error={issueDateError}
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
        testID="doc-issue-date-input"
      />
      <TextInput
        label="Expiry Date"
        value={expiryDate}
        onChangeText={onExpiryDateChange}
        error={expiryDateError}
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
        helperText="Leave empty if no expiry"
        testID="doc-expiry-date-input"
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Form action buttons
// ---------------------------------------------------------------------------

function FormActions({
  isEditing,
  isSaving,
  onSubmit,
  onCancel,
}: {
  isEditing: boolean;
  isSaving: boolean;
  onSubmit: () => void;
  onCancel?: () => void;
}) {
  const { theme } = useTheme();
  return (
    <>
      <Button
        label={isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Document'}
        onPress={onSubmit}
        loading={isSaving}
        fullWidth
        size="lg"
        testID="doc-submit-button"
      />
      {onCancel ? (
        <Button
          label="Cancel"
          variant="ghost"
          onPress={onCancel}
          fullWidth
          size="md"
          style={{ marginTop: theme.spacing.sm }}
          testID="doc-cancel-button"
        />
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

function FormFields({
  form,
  errors,
  updateField,
}: {
  form: DocumentFormData;
  errors: DocumentFormErrors;
  updateField: <K extends keyof DocumentFormData>(key: K, value: DocumentFormData[K]) => void;
}) {
  return (
    <>
      <DocumentTypePicker
        value={form.type}
        onChange={(v) => updateField('type', v)}
        error={errors.type}
      />
      <TextInput
        label="Label"
        value={form.label}
        onChangeText={(v) => updateField('label', v)}
        error={errors.label}
        placeholder="e.g. Personal Passport"
        testID="doc-label-input"
      />
      <NumberField
        value={form.number}
        error={errors.number}
        onChange={(v) => updateField('number', v)}
      />
      <DateFields
        issueDate={form.issueDate}
        expiryDate={form.expiryDate}
        issueDateError={errors.issueDate}
        expiryDateError={errors.expiryDate}
        onIssueDateChange={(v) => updateField('issueDate', v)}
        onExpiryDateChange={(v) => updateField('expiryDate', v)}
      />
      <TextInput
        label="Issuing Authority"
        value={form.issuingAuthority}
        onChangeText={(v) => updateField('issuingAuthority', v)}
        placeholder="e.g. Department of Home Affairs"
        testID="doc-authority-input"
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Main form
// ---------------------------------------------------------------------------

export function DocumentForm({
  initialData,
  onSubmitCreate,
  onSubmitUpdate,
  onCancel,
  onDirtyChange,
  isSaving = false,
}: DocumentFormProps) {
  const { theme } = useTheme();
  const isEditing = Boolean(initialData);

  const { form, errors, isDirty, updateField, handleSubmit } = useDocumentForm(
    initialData,
    onSubmitCreate,
    onSubmitUpdate,
  );

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

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
        testID="document-form-scroll"
      >
        <FormFields form={form} errors={errors} updateField={updateField} />
        <FormActions
          isEditing={isEditing}
          isSaving={isSaving}
          onSubmit={handleSubmit}
          onCancel={onCancel}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

DocumentForm.displayName = 'DocumentForm';

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
