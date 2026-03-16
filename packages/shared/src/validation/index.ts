/**
 * Shared validation utilities for the FillIt application.
 */

import { luhnCheck } from './sa-id.js';

export { parseSAId, extractSAIdSmartFillData, type SAIdParseResult } from './sa-id.js';

const SA_ID_REGEX = /^\d{13}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SA_PHONE_REGEX = /^(\+27|0)\d{9}$/;
const SA_POSTAL_CODE_REGEX = /^\d{4}$/;

export function isValidSAIdNumber(idNumber: string): boolean {
  if (!SA_ID_REGEX.test(idNumber)) return false;
  return luhnCheck(idNumber);
}

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function isValidSAPhoneNumber(phone: string): boolean {
  return SA_PHONE_REGEX.test(phone.replace(/\s/g, ''));
}

export function isValidSAPostalCode(postalCode: string): boolean {
  return SA_POSTAL_CODE_REGEX.test(postalCode);
}

export function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

// Province validation and lookup utilities (S-12)
export {
  isValidSAProvince,
  isValidSAProvinceAbbreviation,
  getProvinceFromAbbreviation,
  getAbbreviationFromProvince,
  suggestProvinceFromPostalCode,
} from './provinces.js';
