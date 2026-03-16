import { describe, expect, it } from 'vitest';

import { extractSAIdSmartFillData, isValidSAIdNumber, parseSAId } from '../validation/index.js';

// ─── Helper: compute valid Luhn checksum digit for a 12-digit prefix ──

function luhnChecksumDigit(prefix: string): number {
  // Append 0 as placeholder, then compute what digit makes sum % 10 === 0
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = Number(prefix[i]);
    if (i % 2 === 0) {
      sum += digit;
    } else {
      const doubled = digit * 2;
      sum += doubled > 9 ? doubled - 9 : doubled;
    }
  }
  // The 13th digit (index 12) is at an even index → added directly
  // We need (sum + z) % 10 === 0
  return (10 - (sum % 10)) % 10;
}

function makeId(prefix: string): string {
  return prefix + String(luhnChecksumDigit(prefix));
}

// ─── Test IDs ──────────────────────────────────────────────────────

// 8001015009 0 8 Z → male, citizen, DOB 1980-01-01
const VALID_MALE_CITIZEN = makeId('800101500908');

// 8001014999 0 8 Z → female (4999), citizen, DOB 1980-01-01
const VALID_FEMALE_CITIZEN = makeId('800101499908');

// 8001015000 1 8 Z → male (5000), permanent resident, DOB 1980-01-01
const VALID_MALE_PR = makeId('800101500018');

// 0501019999 0 8 Z → male (9999), citizen, DOB 2005-01-01 (century = 2000s)
const VALID_2000S = makeId('050101999908');

// 9912310000 0 8 Z → female, citizen, DOB 1999-12-31
const VALID_DEC31 = makeId('991231000008');

// ─── Tests ─────────────────────────────────────────────────────────

describe('parseSAId', () => {
  describe('valid IDs', () => {
    it('parses a valid male citizen ID', () => {
      const result = parseSAId(VALID_MALE_CITIZEN);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.dateOfBirth).toBe('1980-01-01');
      expect(result.gender).toBe('male');
      expect(result.citizenship).toBe('citizen');
    });

    it('parses a valid female citizen ID (gender seq 4999)', () => {
      const result = parseSAId(VALID_FEMALE_CITIZEN);
      expect(result.valid).toBe(true);
      expect(result.gender).toBe('female');
      expect(result.citizenship).toBe('citizen');
    });

    it('parses a valid permanent resident ID', () => {
      const result = parseSAId(VALID_MALE_PR);
      expect(result.valid).toBe(true);
      expect(result.citizenship).toBe('permanent_resident');
    });

    it('resolves century correctly for 2000s birth year', () => {
      const result = parseSAId(VALID_2000S);
      expect(result.valid).toBe(true);
      expect(result.dateOfBirth).toBe('2005-01-01');
    });

    it('handles Dec 31 date correctly', () => {
      const result = parseSAId(VALID_DEC31);
      expect(result.valid).toBe(true);
      expect(result.dateOfBirth).toBe('1999-12-31');
    });
  });

  describe('gender boundary values', () => {
    it('treats gender sequence 0000 as female', () => {
      const id = makeId('800101000008');
      const result = parseSAId(id);
      expect(result.gender).toBe('female');
    });

    it('treats gender sequence 4999 as female', () => {
      const result = parseSAId(VALID_FEMALE_CITIZEN);
      expect(result.gender).toBe('female');
    });

    it('treats gender sequence 5000 as male', () => {
      const result = parseSAId(VALID_MALE_PR);
      expect(result.gender).toBe('male');
    });

    it('treats gender sequence 9999 as male', () => {
      const result = parseSAId(VALID_2000S);
      expect(result.gender).toBe('male');
    });
  });

  describe('format validation', () => {
    it('rejects empty string', () => {
      const result = parseSAId('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('ID number must be exactly 13 digits');
    });

    it('rejects string shorter than 13 digits', () => {
      const result = parseSAId('123456789012');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('ID number must be exactly 13 digits');
    });

    it('rejects string longer than 13 digits', () => {
      const result = parseSAId('12345678901234');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('ID number must be exactly 13 digits');
    });

    it('rejects non-digit characters', () => {
      const result = parseSAId('800101500a087');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('ID number must be exactly 13 digits');
    });

    it('rejects string with spaces', () => {
      const result = parseSAId('8001 0150090');
      expect(result.valid).toBe(false);
    });
  });

  describe('checksum validation', () => {
    it('rejects ID with invalid checksum', () => {
      // Take a valid ID and change the last digit
      const validDigit = Number(VALID_MALE_CITIZEN[12]);
      const badDigit = (validDigit + 1) % 10;
      const badId = VALID_MALE_CITIZEN.slice(0, 12) + String(badDigit);
      const result = parseSAId(badId);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid checksum digit');
    });
  });

  describe('date validation', () => {
    it('rejects month 13', () => {
      const id = makeId('801301500008');
      const result = parseSAId(id);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid date of birth');
    });

    it('rejects day 32', () => {
      const id = makeId('800132500008');
      const result = parseSAId(id);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid date of birth');
    });

    it('rejects Feb 30', () => {
      const id = makeId('800230500008');
      const result = parseSAId(id);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid date of birth');
    });

    it('rejects month 00', () => {
      const id = makeId('800001500008');
      const result = parseSAId(id);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid date of birth');
    });

    it('rejects day 00', () => {
      const id = makeId('800100500008');
      const result = parseSAId(id);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid date of birth');
    });

    it('accepts Feb 29 in a leap year', () => {
      // 2000 is a leap year (YY=00 resolves to 2000)
      const id = makeId('000229500008');
      const result = parseSAId(id);
      expect(result.dateOfBirth).toBe('2000-02-29');
    });

    it('rejects Feb 29 in a non-leap year', () => {
      // 2001 is not a leap year
      const id = makeId('010229500008');
      const result = parseSAId(id);
      expect(result.errors).toContain('Invalid date of birth');
    });
  });

  describe('citizenship validation', () => {
    it('accepts digit 0 as citizen', () => {
      const result = parseSAId(VALID_MALE_CITIZEN);
      expect(result.citizenship).toBe('citizen');
    });

    it('accepts digit 1 as permanent_resident', () => {
      const result = parseSAId(VALID_MALE_PR);
      expect(result.citizenship).toBe('permanent_resident');
    });

    it('rejects citizenship digit 2', () => {
      const id = makeId('800101500028');
      const result = parseSAId(id);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid citizenship digit');
    });

    it('rejects citizenship digit 9', () => {
      const id = makeId('800101500098');
      const result = parseSAId(id);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid citizenship digit');
    });
  });

  describe('multiple errors', () => {
    it('collects both checksum and date errors', () => {
      // Invalid date (month 13) AND bad checksum
      const prefix = '801301500008';
      const correctDigit = luhnChecksumDigit(prefix);
      const badDigit = (correctDigit + 1) % 10;
      const badId = prefix + String(badDigit);
      const result = parseSAId(badId);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      expect(result.errors).toContain('Invalid checksum digit');
      expect(result.errors).toContain('Invalid date of birth');
    });
  });
});

describe('extractSAIdSmartFillData', () => {
  it('returns profile-compatible fields for a valid ID', () => {
    const data = extractSAIdSmartFillData(VALID_MALE_CITIZEN);
    expect(data).not.toBeNull();
    expect(data).toEqual({
      dateOfBirth: '1980-01-01',
      gender: 'male',
      citizenship: 'citizen',
    });
  });

  it('returns null for an invalid ID', () => {
    expect(extractSAIdSmartFillData('')).toBeNull();
  });

  it('returns null for an ID with bad checksum', () => {
    const validDigit = Number(VALID_MALE_CITIZEN[12]);
    const badDigit = (validDigit + 1) % 10;
    const badId = VALID_MALE_CITIZEN.slice(0, 12) + String(badDigit);
    expect(extractSAIdSmartFillData(badId)).toBeNull();
  });

  it('returns correct data for a female permanent resident', () => {
    // female (seq < 5000), permanent resident (digit 10 = 1)
    const id = makeId('900615200018');
    const data = extractSAIdSmartFillData(id);
    expect(data).toEqual({
      dateOfBirth: '1990-06-15',
      gender: 'female',
      citizenship: 'permanent_resident',
    });
  });
});

describe('isValidSAIdNumber backward compatibility', () => {
  it('returns true for a valid ID', () => {
    expect(isValidSAIdNumber(VALID_MALE_CITIZEN)).toBe(true);
  });

  it('returns false for an empty string', () => {
    expect(isValidSAIdNumber('')).toBe(false);
  });

  it('returns false for a non-13-digit string', () => {
    expect(isValidSAIdNumber('12345')).toBe(false);
  });

  it('returns false for an invalid checksum', () => {
    const validDigit = Number(VALID_MALE_CITIZEN[12]);
    const badDigit = (validDigit + 1) % 10;
    const badId = VALID_MALE_CITIZEN.slice(0, 12) + String(badDigit);
    expect(isValidSAIdNumber(badId)).toBe(false);
  });
});
