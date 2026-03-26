/**
 * Shared validation utilities for the FillIt application.
 */

import { luhnCheck } from './sa-id.js';
import {
  DETECTED_FIELD_TYPES,
  DOCUMENT_SOURCE_TYPES,
  IDENTITY_DOCUMENT_TYPES,
  PROCESSING_STATUSES,
  SA_ID_DOCUMENT_TYPES,
} from '../constants/index.js';
import type { DetectedFieldType, DocumentSourceType, ProcessingStatus } from '../types/document.js';
import type { BoundingBox, DocumentType } from '../types/index.js';

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

// --- Document processing validators (S-09) ---

export function isValidDetectedFieldType(type: string): type is DetectedFieldType {
  return (DETECTED_FIELD_TYPES as readonly string[]).includes(type);
}

export function isValidProcessingStatus(status: string): status is ProcessingStatus {
  return (PROCESSING_STATUSES as readonly string[]).includes(status);
}

export function isValidDocumentSourceType(source: string): source is DocumentSourceType {
  return (DOCUMENT_SOURCE_TYPES as readonly string[]).includes(source);
}

export function isValidConfidence(value: number): boolean {
  return typeof value === 'number' && !Number.isNaN(value) && value >= 0 && value <= 1;
}

export function isValidBoundingBox(box: BoundingBox): boolean {
  return (
    typeof box.x === 'number' &&
    typeof box.y === 'number' &&
    typeof box.width === 'number' &&
    typeof box.height === 'number' &&
    box.x >= 0 &&
    box.x <= 1 &&
    box.y >= 0 &&
    box.y <= 1 &&
    box.width >= 0 &&
    box.width <= 1 &&
    box.height >= 0 &&
    box.height <= 1
  );
}

// --- Identity document validators (S-18) ---

export function isValidDocumentType(type: string): type is DocumentType {
  return (IDENTITY_DOCUMENT_TYPES as readonly string[]).includes(type);
}

/**
 * Returns `true` when the given document type requires SA ID number validation.
 */
export function requiresSAIdValidation(type: string): boolean {
  return (SA_ID_DOCUMENT_TYPES as readonly string[]).includes(type);
}
