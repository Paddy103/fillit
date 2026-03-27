/**
 * Custom hook for profile form state management.
 *
 * Handles field updates, SA ID smart-fill, validation, and submission.
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import type { UserProfile } from '@fillit/shared';

import type { CreateProfileInput } from '../../services/storage/profileCrud';
import {
  type ProfileFormData,
  type FormErrors,
  initFormData,
  validateForm,
  buildProfileInput,
  extractSAIdSmartFillData,
} from './profileFormTypes';

export function useProfileForm(
  initialData: UserProfile | undefined,
  onSubmit: (data: CreateProfileInput) => Promise<void>,
) {
  const [form, setForm] = useState<ProfileFormData>(() => initFormData(initialData));
  const [errors, setErrors] = useState<FormErrors>({});
  const [smartFillApplied, setSmartFillApplied] = useState(false);
  const initialSnapshot = useRef(JSON.stringify(initFormData(initialData)));

  const isDirty = useMemo(() => JSON.stringify(form) !== initialSnapshot.current, [form]);

  const updateField = useCallback(
    <K extends keyof ProfileFormData>(field: K, value: ProfileFormData[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      if (errors[field as keyof FormErrors]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field as keyof FormErrors];
          return next;
        });
      }
    },
    [errors],
  );

  const handleSaIdChange = useCallback(
    (text: string) => {
      const digits = text.replace(/\D/g, '').slice(0, 13);
      updateField('saIdNumber', digits);

      if (digits.length === 13 && !smartFillApplied) {
        const smartData = extractSAIdSmartFillData(digits);
        if (smartData) {
          setForm((prev) => ({
            ...prev,
            saIdNumber: digits,
            dateOfBirth: smartData.dateOfBirth ?? prev.dateOfBirth,
            gender: smartData.gender ?? prev.gender,
            citizenship: smartData.citizenship ?? prev.citizenship,
          }));
          setSmartFillApplied(true);
          setErrors((prev) => {
            const next = { ...prev };
            delete next.saIdNumber;
            return next;
          });
        }
      } else if (digits.length < 13) {
        setSmartFillApplied(false);
      }
    },
    [smartFillApplied, updateField],
  );

  const handleSubmit = useCallback(async () => {
    const validationErrors = validateForm(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    await onSubmit(buildProfileInput(form, initialData));
  }, [form, initialData, onSubmit]);

  const saIdHelperText = useMemo(
    () =>
      smartFillApplied
        ? 'DOB, gender, and citizenship auto-filled from ID'
        : '13-digit SA ID number',
    [smartFillApplied],
  );

  return { form, errors, isDirty, updateField, handleSaIdChange, handleSubmit, saIdHelperText };
}
