/**
 * SA ID number parser and smart fill extraction.
 *
 * SA ID format: YYMMDD SSSS C A Z (13 digits)
 * - YYMMDD  = date of birth
 * - SSSS    = gender sequence (0000-4999 female, 5000-9999 male)
 * - C       = citizenship (0 = SA citizen, 1 = permanent resident)
 * - A       = unused (formerly race indicator)
 * - Z       = Luhn checksum digit
 */

import type { Citizenship, Gender, UserProfile } from '../types/profile.js';

// ─── Types ─────────────────────────────────────────────────────────

export interface SAIdParseResult {
  valid: boolean;
  dateOfBirth?: string; // ISO 8601 date string (YYYY-MM-DD)
  gender?: 'male' | 'female';
  citizenship?: 'citizen' | 'permanent_resident';
  errors: string[];
}

// ─── Internal helpers ──────────────────────────────────────────────

const SA_ID_REGEX = /^\d{13}$/;

/** Luhn check — returns true when the 13-digit string passes. */
export function luhnCheck(idNumber: string): boolean {
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const digit = Number(idNumber[i]);
    if (i % 2 === 0) {
      sum += digit;
    } else {
      const doubled = digit * 2;
      sum += doubled > 9 ? doubled - 9 : doubled;
    }
  }
  return sum % 10 === 0;
}

/** Returns true when the given year/month/day form a real calendar date. */
function isRealDate(year: number, month: number, day: number): boolean {
  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
}

/**
 * Resolve a two-digit year to a four-digit year.
 * YY 00 – currentTwoDigitYear  → 2000s
 * YY > currentTwoDigitYear     → 1900s
 */
function resolveCentury(yy: number): number {
  const currentYear = new Date().getFullYear();
  const currentTwoDigit = currentYear % 100;
  return yy <= currentTwoDigit ? 2000 + yy : 1900 + yy;
}

// ─── Public API ────────────────────────────────────────────────────

/**
 * Parse a South African ID number and extract embedded information.
 *
 * Returns a result object that always has `valid` (boolean) and `errors`
 * (string[]). When valid, `dateOfBirth`, `gender`, and `citizenship` are
 * also populated.
 */
export function parseSAId(idNumber: string): SAIdParseResult {
  const errors: string[] = [];

  // 1. Format check
  if (!SA_ID_REGEX.test(idNumber)) {
    errors.push('ID number must be exactly 13 digits');
    return { valid: false, errors };
  }

  // 2. Luhn checksum
  if (!luhnCheck(idNumber)) {
    errors.push('Invalid checksum digit');
  }

  // 3. Date of birth
  const yy = Number(idNumber.slice(0, 2));
  const mm = Number(idNumber.slice(2, 4));
  const dd = Number(idNumber.slice(4, 6));
  const fullYear = resolveCentury(yy);

  let dateOfBirth: string | undefined;
  if (!isRealDate(fullYear, mm, dd)) {
    errors.push('Invalid date of birth');
  } else {
    const pad = (n: number, len = 2) => String(n).padStart(len, '0');
    dateOfBirth = `${pad(fullYear, 4)}-${pad(mm)}-${pad(dd)}`;
  }

  // 4. Gender
  const genderSeq = Number(idNumber.slice(6, 10));
  const gender: Gender = genderSeq < 5000 ? 'female' : 'male';

  // 5. Citizenship
  const citizenDigit = Number(idNumber[10]);
  let citizenship: Citizenship | undefined;
  if (citizenDigit === 0) {
    citizenship = 'citizen';
  } else if (citizenDigit === 1) {
    citizenship = 'permanent_resident';
  } else {
    errors.push('Invalid citizenship digit');
  }

  const valid = errors.length === 0;

  return {
    valid,
    ...(dateOfBirth !== undefined && { dateOfBirth }),
    gender,
    ...(citizenship !== undefined && { citizenship }),
    errors,
  };
}

/**
 * Extract profile-compatible smart-fill fields from a valid SA ID number.
 *
 * Returns `null` when the ID is invalid.
 */
export function extractSAIdSmartFillData(
  idNumber: string,
): Partial<Pick<UserProfile, 'dateOfBirth' | 'gender' | 'citizenship'>> | null {
  const result = parseSAId(idNumber);
  if (!result.valid) return null;

  const data: Partial<
    Pick<UserProfile, 'dateOfBirth' | 'gender' | 'citizenship'>
  > = {};

  if (result.dateOfBirth !== undefined) data.dateOfBirth = result.dateOfBirth;
  if (result.gender !== undefined) data.gender = result.gender;
  if (result.citizenship !== undefined) data.citizenship = result.citizenship;

  return data;
}
