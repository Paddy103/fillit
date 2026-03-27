/**
 * Form state hook for identity document add/edit.
 *
 * Manages form fields, validation, dirty tracking, and submission
 * for the DocumentForm component.
 */

import { useState, useCallback, useMemo } from 'react';
import type { DocumentType, IdentityDocument } from '@fillit/shared';
import type {
  CreateIdentityDocumentInput,
  UpdateIdentityDocumentInput,
} from '../../services/storage/profileCrud';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DocumentFormData {
  type: DocumentType;
  label: string;
  number: string;
  issueDate: string;
  expiryDate: string;
  issuingAuthority: string;
}

export interface DocumentFormErrors {
  type?: string;
  label?: string;
  number?: string;
  issueDate?: string;
  expiryDate?: string;
}

export interface DocumentFormHook {
  form: DocumentFormData;
  errors: DocumentFormErrors;
  isDirty: boolean;
  updateField: <K extends keyof DocumentFormData>(key: K, value: DocumentFormData[K]) => void;
  handleSubmit: () => void;
  resetForm: () => void;
}

// ---------------------------------------------------------------------------
// Default values
// ---------------------------------------------------------------------------

function buildInitialData(doc?: IdentityDocument): DocumentFormData {
  return {
    type: doc?.type ?? 'sa_id_book',
    label: doc?.label ?? '',
    number: doc?.number ?? '',
    issueDate: doc?.issueDate ?? '',
    expiryDate: doc?.expiryDate ?? '',
    issuingAuthority: doc?.issuingAuthority ?? '',
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validate(form: DocumentFormData): DocumentFormErrors {
  const errors: DocumentFormErrors = {};
  if (!form.label.trim()) {
    errors.label = 'Label is required';
  }
  if (!form.number.trim()) {
    errors.number = 'Document number is required';
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDocumentForm(
  initialData: IdentityDocument | undefined,
  onSubmitCreate: (data: CreateIdentityDocumentInput) => Promise<void>,
  onSubmitUpdate?: (data: UpdateIdentityDocumentInput) => Promise<void>,
): DocumentFormHook {
  const initial = useMemo(() => buildInitialData(initialData), [initialData]);
  const [form, setForm] = useState<DocumentFormData>(initial);
  const [errors, setErrors] = useState<DocumentFormErrors>({});

  const isDirty = useMemo(() => {
    return (
      form.type !== initial.type ||
      form.label !== initial.label ||
      form.number !== initial.number ||
      form.issueDate !== initial.issueDate ||
      form.expiryDate !== initial.expiryDate ||
      form.issuingAuthority !== initial.issuingAuthority
    );
  }, [form, initial]);

  const updateField = useCallback(
    <K extends keyof DocumentFormData>(key: K, value: DocumentFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const payload = {
      type: form.type,
      label: form.label.trim(),
      number: form.number.trim(),
      issueDate: form.issueDate || undefined,
      expiryDate: form.expiryDate || undefined,
      issuingAuthority: form.issuingAuthority.trim() || undefined,
      additionalFields: initialData?.additionalFields ?? {},
    };

    if (initialData && onSubmitUpdate) {
      onSubmitUpdate(payload);
    } else {
      onSubmitCreate(payload);
    }
  }, [form, initialData, onSubmitCreate, onSubmitUpdate]);

  const resetForm = useCallback(() => {
    setForm(initial);
    setErrors({});
  }, [initial]);

  return {
    form,
    errors,
    isDirty,
    updateField,
    handleSubmit,
    resetForm,
  };
}
