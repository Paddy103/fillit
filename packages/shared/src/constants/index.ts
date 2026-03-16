/**
 * Shared constants for the FillIt application.
 */

export const APP_NAME = 'FillIt' as const;
export const APP_VERSION = '0.1.0' as const;

export const DEFAULT_COUNTRY = 'ZA' as const;
export const DEFAULT_LOCALE = 'en-ZA' as const;

export const API_VERSION = 'v1' as const;

export const DOCUMENT_STATUSES = [
  'draft',
  'scanned',
  'detected',
  'filled',
  'signed',
  'exported',
] as const;

export const FORM_FIELD_TYPES = [
  'text',
  'date',
  'number',
  'email',
  'phone',
  'signature',
  'checkbox',
] as const;

export const DETECTED_FIELD_TYPES = [
  'text',
  'date',
  'checkbox',
  'signature',
  'initial',
  'number',
] as const;

export const PROCESSING_STATUSES = [
  'scanned',
  'ocr_complete',
  'fields_detected',
  'matched',
  'reviewed',
  'exported',
] as const;

export const DOCUMENT_SOURCE_TYPES = ['camera', 'import'] as const;

export const SA_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  'Western Cape',
] as const;

// Province data, lookup maps, and postal code ranges (S-12)
export {
  type ProvinceInfo,
  type SAProvince,
  type SAProvinceAbbreviation,
  SA_PROVINCE_DATA,
  SA_PROVINCE_ABBREVIATION_MAP,
  SA_PROVINCE_NAME_MAP,
  SA_POSTAL_CODE_RANGES,
} from './provinces.js';
