import { describe, expect, it } from 'vitest';
import {
  isValidSAIdNumber,
  isValidEmail,
  isValidSAPhoneNumber,
  isValidSAPostalCode,
  isNonEmpty,
} from '../validation/index.js';

describe('isValidSAIdNumber', () => {
  it('should accept a valid SA ID number', () => {
    expect(isValidSAIdNumber('8801015009080')).toBe(true);
  });

  it('should reject an ID with wrong length', () => {
    expect(isValidSAIdNumber('880101500908')).toBe(false);
    expect(isValidSAIdNumber('88010150090871')).toBe(false);
  });

  it('should reject non-numeric strings', () => {
    expect(isValidSAIdNumber('880101500908a')).toBe(false);
    expect(isValidSAIdNumber('abcdefghijklm')).toBe(false);
  });

  it('should reject an empty string', () => {
    expect(isValidSAIdNumber('')).toBe(false);
  });

  it('should reject an ID that fails Luhn check', () => {
    expect(isValidSAIdNumber('8801015009088')).toBe(false);
  });

  it('should accept another known valid ID', () => {
    expect(isValidSAIdNumber('9202204720083')).toBe(true);
  });
});

describe('isValidEmail', () => {
  it('should accept a valid email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it('should accept an email with subdomain', () => {
    expect(isValidEmail('user@mail.example.co.za')).toBe(true);
  });

  it('should reject email without @', () => {
    expect(isValidEmail('userexample.com')).toBe(false);
  });

  it('should reject email without domain', () => {
    expect(isValidEmail('user@')).toBe(false);
  });

  it('should reject email without TLD', () => {
    expect(isValidEmail('user@example')).toBe(false);
  });

  it('should reject empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('should reject email with spaces', () => {
    expect(isValidEmail('user @example.com')).toBe(false);
  });
});

describe('isValidSAPhoneNumber', () => {
  it('should accept +27 format', () => {
    expect(isValidSAPhoneNumber('+27821234567')).toBe(true);
  });

  it('should accept 0 format', () => {
    expect(isValidSAPhoneNumber('0821234567')).toBe(true);
  });

  it('should accept number with spaces', () => {
    expect(isValidSAPhoneNumber('+27 82 123 4567')).toBe(true);
    expect(isValidSAPhoneNumber('082 123 4567')).toBe(true);
  });

  it('should reject too-short number', () => {
    expect(isValidSAPhoneNumber('+2782123456')).toBe(false);
  });

  it('should reject too-long number', () => {
    expect(isValidSAPhoneNumber('+278212345678')).toBe(false);
  });

  it('should reject number without country code or leading 0', () => {
    expect(isValidSAPhoneNumber('821234567')).toBe(false);
  });

  it('should reject empty string', () => {
    expect(isValidSAPhoneNumber('')).toBe(false);
  });
});

describe('isValidSAPostalCode', () => {
  it('should accept a valid 4-digit postal code', () => {
    expect(isValidSAPostalCode('0001')).toBe(true);
    expect(isValidSAPostalCode('8000')).toBe(true);
  });

  it('should reject code with fewer than 4 digits', () => {
    expect(isValidSAPostalCode('123')).toBe(false);
  });

  it('should reject code with more than 4 digits', () => {
    expect(isValidSAPostalCode('12345')).toBe(false);
  });

  it('should reject non-numeric code', () => {
    expect(isValidSAPostalCode('abcd')).toBe(false);
  });

  it('should reject empty string', () => {
    expect(isValidSAPostalCode('')).toBe(false);
  });
});

describe('isNonEmpty', () => {
  it('should return true for non-empty string', () => {
    expect(isNonEmpty('hello')).toBe(true);
  });

  it('should return false for empty string', () => {
    expect(isNonEmpty('')).toBe(false);
  });

  it('should return false for whitespace-only string', () => {
    expect(isNonEmpty('   ')).toBe(false);
    expect(isNonEmpty('\t\n')).toBe(false);
  });

  it('should return true for string with leading/trailing spaces', () => {
    expect(isNonEmpty('  hello  ')).toBe(true);
  });
});
