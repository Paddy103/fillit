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

/**
 * All supported identity document types (S-18).
 * Mirrors the `DocumentType` union in `types/profile.ts`.
 */
export const IDENTITY_DOCUMENT_TYPES = [
  'sa_id_book',
  'sa_smart_id',
  'passport',
  'drivers_license',
  'prdp',
  'tax_number',
  'bank_account',
  'medical_aid',
  'hospital_plan',
  'vehicle_registration',
  'license_disc',
  'work_permit',
  'refugee_permit',
  'asylum_seeker_permit',
  'matric_certificate',
  'degree_diploma',
  'student_card',
  'hpcsa',
  'sacap',
  'ecsa',
  'saica',
  'law_society',
  'sace',
  'birth_certificate',
  'marriage_certificate',
  'coida',
  'uif_number',
  'custom',
] as const;

/**
 * Document types that require SA ID number validation (S-18).
 */
export const SA_ID_DOCUMENT_TYPES = ['sa_id_book', 'sa_smart_id'] as const;

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
