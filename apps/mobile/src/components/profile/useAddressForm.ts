/**
 * Custom hook for address form state management.
 *
 * Handles field updates, validation, dirty tracking, and submission.
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import type { Address } from '@fillit/shared';

import {
  type AddressFormData,
  type AddressFormErrors,
  initAddressFormData,
  validateAddressForm,
} from './addressFormTypes';

export function useAddressForm(initialData?: Address) {
  const [form, setForm] = useState<AddressFormData>(() => initAddressFormData(initialData));
  const [errors, setErrors] = useState<AddressFormErrors>({});
  const initialSnapshot = useRef(JSON.stringify(initAddressFormData(initialData)));

  const isDirty = useMemo(() => JSON.stringify(form) !== initialSnapshot.current, [form]);

  const updateField = useCallback(
    <K extends keyof AddressFormData>(field: K, value: AddressFormData[K]) => {
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
    const validationErrors = validateAddressForm(form);
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  }, [form]);

  return { form, errors, isDirty, updateField, validate };
}
