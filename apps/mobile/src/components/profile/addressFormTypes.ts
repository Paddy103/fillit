/**
 * Address form data types, validation, and helpers.
 *
 * Provides the form state shape, validation logic, and conversion
 * between form data and the store's input types for address CRUD.
 */

import type { Address } from '@fillit/shared';
import type { CreateAddressInput, UpdateAddressInput } from '../../services/storage/profileCrud';

// ─── Constants ──────────────────────────────────────────────────────

/** Predefined address type labels. */
export const ADDRESS_TYPE_OPTIONS = ['Home', 'Work', 'Mailing', 'Postal'] as const;

// ─── Form Data ──────────────────────────────────────────────────────

/** Shape of the address form state. */
export interface AddressFormData {
  label: string;
  customLabel: string;
  street1: string;
  street2: string;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

/** Validation errors keyed by form field. */
export type AddressFormErrors = Partial<Record<keyof AddressFormData, string>>;

// ─── Initialization ─────────────────────────────────────────────────

/** Determine if a label is a predefined type or custom. */
function isPredefinedLabel(label: string): boolean {
  return ADDRESS_TYPE_OPTIONS.includes(label as (typeof ADDRESS_TYPE_OPTIONS)[number]);
}

/** Create initial form data, optionally from an existing address. */
export function initAddressFormData(address?: Address): AddressFormData {
  if (!address) {
    return {
      label: 'Home',
      customLabel: '',
      street1: '',
      street2: '',
      suburb: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'South Africa',
      isDefault: false,
    };
  }

  const isPredefined = isPredefinedLabel(address.label);

  return {
    label: isPredefined ? address.label : 'Custom',
    customLabel: isPredefined ? '' : address.label,
    street1: address.street1,
    street2: address.street2 ?? '',
    suburb: address.suburb ?? '',
    city: address.city,
    province: address.province,
    postalCode: address.postalCode,
    country: address.country,
    isDefault: address.isDefault,
  };
}

// ─── Validation ─────────────────────────────────────────────────────

/** Validate the address form and return any errors. */
export function validateAddressForm(form: AddressFormData): AddressFormErrors {
  const errors: AddressFormErrors = {};

  const resolvedLabel = resolveLabel(form);
  if (!resolvedLabel.trim()) {
    errors.label = 'Address type is required';
  }

  if (!form.street1.trim()) {
    errors.street1 = 'Street address is required';
  }

  if (!form.city.trim()) {
    errors.city = 'City is required';
  }

  if (!form.province.trim()) {
    errors.province = 'Province is required';
  }

  if (!form.postalCode.trim()) {
    errors.postalCode = 'Postal code is required';
  } else if (!/^\d{4}$/.test(form.postalCode.trim())) {
    errors.postalCode = 'Postal code must be 4 digits';
  }

  return errors;
}

// ─── Conversion ─────────────────────────────────────────────────────

/** Resolve the effective label from form state. */
export function resolveLabel(form: AddressFormData): string {
  if (form.label === 'Custom') {
    return form.customLabel.trim();
  }
  return form.label;
}

/** Convert form data to a CreateAddressInput for the store. */
export function buildCreateInput(form: AddressFormData): CreateAddressInput {
  return {
    label: resolveLabel(form),
    street1: form.street1.trim(),
    street2: form.street2.trim() || undefined,
    suburb: form.suburb.trim() || undefined,
    city: form.city.trim(),
    province: form.province,
    postalCode: form.postalCode.trim(),
    country: form.country || 'South Africa',
    isDefault: form.isDefault,
  };
}

/** Convert form data to an UpdateAddressInput for the store. */
export function buildUpdateInput(form: AddressFormData): UpdateAddressInput {
  return {
    label: resolveLabel(form),
    street1: form.street1.trim(),
    street2: form.street2.trim() || undefined,
    suburb: form.suburb.trim() || undefined,
    city: form.city.trim(),
    province: form.province,
    postalCode: form.postalCode.trim(),
    country: form.country || 'South Africa',
    isDefault: form.isDefault,
  };
}
