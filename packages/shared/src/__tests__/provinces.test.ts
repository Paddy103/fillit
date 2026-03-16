import { describe, expect, it } from 'vitest';
import {
  SA_PROVINCES,
  SA_PROVINCE_DATA,
  SA_PROVINCE_ABBREVIATION_MAP,
  SA_PROVINCE_NAME_MAP,
  SA_POSTAL_CODE_RANGES,
  type SAProvince,
} from '../constants/index.js';
import {
  isValidSAProvince,
  isValidSAProvinceAbbreviation,
  getProvinceFromAbbreviation,
  getAbbreviationFromProvince,
  suggestProvinceFromPostalCode,
} from '../validation/index.js';

describe('SA Province Data', () => {
  it('should contain exactly 9 provinces', () => {
    expect(SA_PROVINCE_DATA).toHaveLength(9);
    expect(SA_PROVINCES).toHaveLength(9);
  });

  it('should have unique province names', () => {
    const names = SA_PROVINCE_DATA.map((p) => p.name);
    expect(new Set(names).size).toBe(9);
  });

  it('should have unique abbreviations', () => {
    const abbrs = SA_PROVINCE_DATA.map((p) => p.abbreviation);
    expect(new Set(abbrs).size).toBe(9);
  });

  it('SA_PROVINCE_DATA names should match SA_PROVINCES', () => {
    const dataNames = SA_PROVINCE_DATA.map((p) => p.name).sort();
    const constNames = [...SA_PROVINCES].sort();
    expect(dataNames).toEqual(constNames);
  });

  it('each ProvinceInfo should have a non-empty name and abbreviation', () => {
    for (const province of SA_PROVINCE_DATA) {
      expect(province.name).toBeTruthy();
      expect(province.abbreviation).toBeTruthy();
      expect(province.name.length).toBeGreaterThan(0);
      expect(province.abbreviation.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('abbreviations should be uppercase letters only', () => {
    for (const province of SA_PROVINCE_DATA) {
      expect(province.abbreviation).toMatch(/^[A-Z]{2,3}$/);
    }
  });
});

describe('Lookup Maps', () => {
  it('SA_PROVINCE_ABBREVIATION_MAP has 9 entries', () => {
    expect(SA_PROVINCE_ABBREVIATION_MAP.size).toBe(9);
  });

  it('SA_PROVINCE_NAME_MAP has 9 entries', () => {
    expect(SA_PROVINCE_NAME_MAP.size).toBe(9);
  });

  it('SA_POSTAL_CODE_RANGES has 9 entries', () => {
    expect(SA_POSTAL_CODE_RANGES.size).toBe(9);
  });
});

describe('isValidSAProvince', () => {
  it.each([
    'Eastern Cape',
    'Free State',
    'Gauteng',
    'KwaZulu-Natal',
    'Limpopo',
    'Mpumalanga',
    'North West',
    'Northern Cape',
    'Western Cape',
  ] satisfies SAProvince[])('should accept "%s"', (province) => {
    expect(isValidSAProvince(province)).toBe(true);
  });

  it('should reject invalid province names', () => {
    expect(isValidSAProvince('Cape Town')).toBe(false);
    expect(isValidSAProvince('Johannesburg')).toBe(false);
    expect(isValidSAProvince('')).toBe(false);
    expect(isValidSAProvince(' ')).toBe(false);
    expect(isValidSAProvince('Western cape')).toBe(false);
    expect(isValidSAProvince('GP')).toBe(false);
  });

  it('should be case-sensitive', () => {
    expect(isValidSAProvince('gauteng')).toBe(false);
    expect(isValidSAProvince('GAUTENG')).toBe(false);
    expect(isValidSAProvince('eastern cape')).toBe(false);
  });
});

describe('isValidSAProvinceAbbreviation', () => {
  it.each(['EC', 'FS', 'GP', 'KZN', 'LP', 'MP', 'NW', 'NC', 'WC'])('should accept "%s"', (abbr) => {
    expect(isValidSAProvinceAbbreviation(abbr)).toBe(true);
  });

  it('should reject invalid abbreviations', () => {
    expect(isValidSAProvinceAbbreviation('XX')).toBe(false);
    expect(isValidSAProvinceAbbreviation('ec')).toBe(false);
    expect(isValidSAProvinceAbbreviation('')).toBe(false);
    expect(isValidSAProvinceAbbreviation('Gauteng')).toBe(false);
    expect(isValidSAProvinceAbbreviation(' ')).toBe(false);
    expect(isValidSAProvinceAbbreviation('gp')).toBe(false);
    expect(isValidSAProvinceAbbreviation('Gp')).toBe(false);
  });
});

describe('getProvinceFromAbbreviation', () => {
  it.each([
    ['EC', 'Eastern Cape'],
    ['FS', 'Free State'],
    ['GP', 'Gauteng'],
    ['KZN', 'KwaZulu-Natal'],
    ['LP', 'Limpopo'],
    ['MP', 'Mpumalanga'],
    ['NW', 'North West'],
    ['NC', 'Northern Cape'],
    ['WC', 'Western Cape'],
  ] as const)('should map "%s" to "%s"', (abbr, expected) => {
    expect(getProvinceFromAbbreviation(abbr)).toBe(expected);
  });

  it('should return undefined for unknown abbreviation', () => {
    expect(getProvinceFromAbbreviation('XX')).toBeUndefined();
    expect(getProvinceFromAbbreviation('')).toBeUndefined();
    expect(getProvinceFromAbbreviation('gp')).toBeUndefined();
    expect(getProvinceFromAbbreviation(' ')).toBeUndefined();
  });
});

describe('getAbbreviationFromProvince', () => {
  it.each([
    ['Eastern Cape', 'EC'],
    ['Free State', 'FS'],
    ['Gauteng', 'GP'],
    ['KwaZulu-Natal', 'KZN'],
    ['Limpopo', 'LP'],
    ['Mpumalanga', 'MP'],
    ['North West', 'NW'],
    ['Northern Cape', 'NC'],
    ['Western Cape', 'WC'],
  ] as const)('should map "%s" to "%s"', (province, expected) => {
    expect(getAbbreviationFromProvince(province)).toBe(expected);
  });

  it('should return undefined for unknown province', () => {
    expect(getAbbreviationFromProvince('Durban')).toBeUndefined();
    expect(getAbbreviationFromProvince('')).toBeUndefined();
    expect(getAbbreviationFromProvince('gauteng')).toBeUndefined();
    expect(getAbbreviationFromProvince(' ')).toBeUndefined();
  });
});

describe('suggestProvinceFromPostalCode', () => {
  it.each<[string, SAProvince]>([
    ['5000', 'Eastern Cape'],
    ['6000', 'Eastern Cape'],
    ['6499', 'Eastern Cape'],
    ['9300', 'Free State'],
    ['9500', 'Free State'],
    ['0001', 'Gauteng'],
    ['2000', 'Gauteng'],
    ['3000', 'KwaZulu-Natal'],
    ['4500', 'KwaZulu-Natal'],
    ['0500', 'Limpopo'],
    ['0999', 'Limpopo'],
    ['1000', 'Mpumalanga'],
    ['1399', 'Mpumalanga'],
    ['2200', 'Mpumalanga'],
    ['2499', 'Mpumalanga'],
    ['2500', 'North West'],
    ['2999', 'North West'],
    ['7000', 'Northern Cape'],
    ['8500', 'Northern Cape'],
    ['6500', 'Western Cape'],
    ['6999', 'Western Cape'],
    ['7100', 'Western Cape'],
    ['7500', 'Western Cape'],
  ])('should suggest %s → %s', (postalCode, expected) => {
    expect(suggestProvinceFromPostalCode(postalCode)).toBe(expected);
  });

  it('should return undefined for invalid postal codes', () => {
    expect(suggestProvinceFromPostalCode('')).toBeUndefined();
    expect(suggestProvinceFromPostalCode('abcd')).toBeUndefined();
    expect(suggestProvinceFromPostalCode('00000')).toBeUndefined();
    expect(suggestProvinceFromPostalCode('-1')).toBeUndefined();
  });

  it('should return undefined for postal codes outside known ranges', () => {
    // 9900+ is outside all defined ranges
    expect(suggestProvinceFromPostalCode('9900')).toBeUndefined();
  });
});
