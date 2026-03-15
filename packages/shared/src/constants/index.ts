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
