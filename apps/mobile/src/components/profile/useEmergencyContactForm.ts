/**
 * Custom hook for emergency contact form state management.
 *
 * Handles field updates, SA phone validation, email validation,
 * and dirty tracking.
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { isValidSAPhoneNumber, isValidEmail, type EmergencyContact } from '@fillit/shared';

// ─── Types ───────────────────────────────────────────────────────────

export interface EmergencyContactFormData {
  firstName: string;
  lastName: string;
  relationship: string;
  phoneMobile: string;
  phoneWork: string;
  email: string;
}

export interface EmergencyContactFormErrors {
  firstName?: string;
  lastName?: string;
  relationship?: string;
  phoneMobile?: string;
  phoneWork?: string;
  email?: string;
}

// ─── Validation ──────────────────────────────────────────────────────

export function validateEmergencyContactForm(
  form: EmergencyContactFormData,
): EmergencyContactFormErrors {
  const errors: EmergencyContactFormErrors = {};

  if (!form.firstName.trim()) {
    errors.firstName = 'First name is required';
  }
  if (!form.lastName.trim()) {
    errors.lastName = 'Last name is required';
  }
  if (!form.relationship.trim()) {
    errors.relationship = 'Relationship is required';
  }

  if (!form.phoneMobile.trim()) {
    errors.phoneMobile = 'Mobile phone is required';
  } else if (!isValidSAPhoneNumber(form.phoneMobile)) {
    errors.phoneMobile = 'Invalid SA phone number (0XX XXX XXXX or +27XX XXX XXXX)';
  }

  if (form.phoneWork.trim() && !isValidSAPhoneNumber(form.phoneWork)) {
    errors.phoneWork = 'Invalid SA phone number (0XX XXX XXXX or +27XX XXX XXXX)';
  }

  if (form.email.trim() && !isValidEmail(form.email)) {
    errors.email = 'Invalid email address';
  }

  return errors;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function initFormData(contact?: EmergencyContact): EmergencyContactFormData {
  return {
    firstName: contact?.firstName ?? '',
    lastName: contact?.lastName ?? '',
    relationship: contact?.relationship ?? '',
    phoneMobile: contact?.phoneMobile ?? '',
    phoneWork: contact?.phoneWork ?? '',
    email: contact?.email ?? '',
  };
}

// ─── Hook ────────────────────────────────────────────────────────────

export function useEmergencyContactForm(initialData?: EmergencyContact) {
  const [form, setForm] = useState<EmergencyContactFormData>(() => initFormData(initialData));
  const [errors, setErrors] = useState<EmergencyContactFormErrors>({});
  const initialSnapshot = useRef(JSON.stringify(initFormData(initialData)));

  const isDirty = useMemo(() => JSON.stringify(form) !== initialSnapshot.current, [form]);

  const updateField = useCallback(
    <K extends keyof EmergencyContactFormData>(field: K, value: EmergencyContactFormData[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [errors],
  );

  const validate = useCallback((): boolean => {
    const validationErrors = validateEmergencyContactForm(form);
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  }, [form]);

  return { form, errors, isDirty, updateField, validate };
}
