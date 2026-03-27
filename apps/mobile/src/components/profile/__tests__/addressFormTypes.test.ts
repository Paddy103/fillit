import { describe, it, expect, beforeAll } from 'vitest';

import type { Address } from '@fillit/shared';
import type { AddressFormData, AddressFormErrors } from '../addressFormTypes';

// ─── Test Data ──────────────────────────────────────────────────────

const MOCK_ADDRESS: Address = {
  id: 'addr-1',
  label: 'Home',
  street1: '123 Main Road',
  street2: 'Unit 4',
  suburb: 'Sandton',
  city: 'Johannesburg',
  province: 'Gauteng',
  postalCode: '2196',
  country: 'South Africa',
  isDefault: true,
};

const MOCK_CUSTOM_ADDRESS: Address = {
  id: 'addr-2',
  label: 'Holiday Home',
  street1: '456 Beach Road',
  city: 'Cape Town',
  province: 'Western Cape',
  postalCode: '8001',
  country: 'South Africa',
  isDefault: false,
};

describe('addressFormTypes', () => {
  let initAddressFormData: (address?: Address) => AddressFormData;
  let validateAddressForm: (form: AddressFormData) => AddressFormErrors;
  let resolveLabel: (form: AddressFormData) => string;
  let buildCreateInput: (form: AddressFormData) => unknown;
  let buildUpdateInput: (form: AddressFormData) => unknown;

  beforeAll(async () => {
    const m = await import('../addressFormTypes');
    initAddressFormData = m.initAddressFormData;
    validateAddressForm = m.validateAddressForm;
    resolveLabel = m.resolveLabel;
    buildCreateInput = m.buildCreateInput;
    buildUpdateInput = m.buildUpdateInput;
  });

  // ─── initAddressFormData ──────────────────────────────────────────

  describe('initAddressFormData', () => {
    it('returns empty form with defaults when no address', () => {
      const result = initAddressFormData();
      expect(result.label).toBe('Home');
      expect(result.customLabel).toBe('');
      expect(result.street1).toBe('');
      expect(result.country).toBe('South Africa');
      expect(result.isDefault).toBe(false);
    });

    it('populates from existing predefined address', () => {
      const result = initAddressFormData(MOCK_ADDRESS);
      expect(result.label).toBe('Home');
      expect(result.customLabel).toBe('');
      expect(result.street1).toBe('123 Main Road');
      expect(result.street2).toBe('Unit 4');
      expect(result.suburb).toBe('Sandton');
      expect(result.city).toBe('Johannesburg');
      expect(result.province).toBe('Gauteng');
      expect(result.postalCode).toBe('2196');
      expect(result.isDefault).toBe(true);
    });

    it('handles custom label addresses', () => {
      const result = initAddressFormData(MOCK_CUSTOM_ADDRESS);
      expect(result.label).toBe('Custom');
      expect(result.customLabel).toBe('Holiday Home');
    });

    it('defaults optional fields to empty string', () => {
      const minimal: Address = {
        id: 'addr-3',
        label: 'Work',
        street1: '789 Office Park',
        city: 'Pretoria',
        province: 'Gauteng',
        postalCode: '0001',
        country: 'South Africa',
        isDefault: false,
      };
      const result = initAddressFormData(minimal);
      expect(result.street2).toBe('');
      expect(result.suburb).toBe('');
    });
  });

  // ─── validateAddressForm ──────────────────────────────────────────

  describe('validateAddressForm', () => {
    const validForm: AddressFormData = {
      label: 'Home',
      customLabel: '',
      street1: '123 Main Road',
      street2: '',
      suburb: '',
      city: 'Johannesburg',
      province: 'Gauteng',
      postalCode: '2196',
      country: 'South Africa',
      isDefault: false,
    };

    it('passes with valid data', () => {
      const errors = validateAddressForm(validForm);
      expect(Object.keys(errors)).toHaveLength(0);
    });

    it('requires street1', () => {
      const errors = validateAddressForm({
        ...validForm,
        street1: '',
      });
      expect(errors.street1).toBeDefined();
    });

    it('requires city', () => {
      const errors = validateAddressForm({
        ...validForm,
        city: '  ',
      });
      expect(errors.city).toBeDefined();
    });

    it('requires province', () => {
      const errors = validateAddressForm({
        ...validForm,
        province: '',
      });
      expect(errors.province).toBeDefined();
    });

    it('requires postal code', () => {
      const errors = validateAddressForm({
        ...validForm,
        postalCode: '',
      });
      expect(errors.postalCode).toBeDefined();
    });

    it('validates postal code is 4 digits', () => {
      const errors = validateAddressForm({
        ...validForm,
        postalCode: '123',
      });
      expect(errors.postalCode).toBeDefined();
      expect(errors.postalCode).toContain('4 digits');
    });

    it('rejects non-numeric postal codes', () => {
      const errors = validateAddressForm({
        ...validForm,
        postalCode: 'ABCD',
      });
      expect(errors.postalCode).toBeDefined();
    });

    it('accepts valid 4-digit postal code', () => {
      const errors = validateAddressForm({
        ...validForm,
        postalCode: '0001',
      });
      expect(errors.postalCode).toBeUndefined();
    });

    it('requires label when custom is selected', () => {
      const errors = validateAddressForm({
        ...validForm,
        label: 'Custom',
        customLabel: '',
      });
      expect(errors.label).toBeDefined();
    });

    it('passes when custom label is provided', () => {
      const errors = validateAddressForm({
        ...validForm,
        label: 'Custom',
        customLabel: 'Holiday Home',
      });
      expect(errors.label).toBeUndefined();
    });

    it('does not require optional fields', () => {
      const errors = validateAddressForm(validForm);
      expect(errors.street2).toBeUndefined();
      expect(errors.suburb).toBeUndefined();
    });
  });

  // ─── resolveLabel ─────────────────────────────────────────────────

  describe('resolveLabel', () => {
    it('returns predefined label directly', () => {
      const form = initAddressFormData();
      expect(resolveLabel(form)).toBe('Home');
    });

    it('returns custom label when Custom selected', () => {
      const form = {
        ...initAddressFormData(),
        label: 'Custom',
        customLabel: 'Beach House',
      };
      expect(resolveLabel(form)).toBe('Beach House');
    });

    it('trims custom label whitespace', () => {
      const form = {
        ...initAddressFormData(),
        label: 'Custom',
        customLabel: '  Office  ',
      };
      expect(resolveLabel(form)).toBe('Office');
    });
  });

  // ─── buildCreateInput ─────────────────────────────────────────────

  describe('buildCreateInput', () => {
    const filledForm: AddressFormData = {
      label: 'Work',
      customLabel: '',
      street1: ' 456 Office Park ',
      street2: ' Suite 2 ',
      suburb: ' Rosebank ',
      city: ' Johannesburg ',
      province: 'Gauteng',
      postalCode: ' 2196 ',
      country: 'South Africa',
      isDefault: true,
    };

    it('trims string fields', () => {
      const result = buildCreateInput(filledForm);
      expect(result.street1).toBe('456 Office Park');
      expect(result.city).toBe('Johannesburg');
    });

    it('sets label from predefined type', () => {
      const result = buildCreateInput(filledForm);
      expect(result.label).toBe('Work');
    });

    it('excludes empty optional fields as undefined', () => {
      const result = buildCreateInput({
        ...filledForm,
        street2: '',
        suburb: '',
      });
      expect(result.street2).toBeUndefined();
      expect(result.suburb).toBeUndefined();
    });

    it('includes isDefault flag', () => {
      const result = buildCreateInput(filledForm);
      expect(result.isDefault).toBe(true);
    });

    it('defaults country to South Africa', () => {
      const result = buildCreateInput({
        ...filledForm,
        country: '',
      });
      expect(result.country).toBe('South Africa');
    });
  });

  // ─── buildUpdateInput ─────────────────────────────────────────────

  describe('buildUpdateInput', () => {
    it('returns all fields for update', () => {
      const form: AddressFormData = {
        label: 'Home',
        customLabel: '',
        street1: '123 Main',
        street2: '',
        suburb: '',
        city: 'Joburg',
        province: 'Gauteng',
        postalCode: '2000',
        country: 'South Africa',
        isDefault: false,
      };
      const result = buildUpdateInput(form);
      expect(result.label).toBe('Home');
      expect(result.street1).toBe('123 Main');
      expect(result.isDefault).toBe(false);
    });
  });
});
