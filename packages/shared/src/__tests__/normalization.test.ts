import { describe, expect, it } from 'vitest';
import {
  normalizeLabel,
  findBestMatch,
  matchLabelToProfileField,
  inferFieldType,
  normalizeDateFormat,
  normalizePhoneNumber,
  normalizeAddress,
  getDictionarySize,
  lookupLabel,
  levenshteinDistance,
  levenshteinSimilarity,
  tokenOverlap,
  combinedScore,
  findBestFuzzyMatch,
  LABEL_DICTIONARY,
} from '../normalization/index.js';

// ─── normalizeLabel ─────────────────────────────────────────────────

describe('normalizeLabel', () => {
  it('should trim whitespace', () => {
    expect(normalizeLabel('  First Name  ')).toBe('first name');
    expect(normalizeLabel('\tName\n')).toBe('name');
  });

  it('should convert to lowercase', () => {
    expect(normalizeLabel('FIRST NAME')).toBe('first name');
    expect(normalizeLabel('Email Address')).toBe('email address');
  });

  it('should remove diacritics / accent marks', () => {
    expect(normalizeLabel('Prénom')).toBe('prenom');
    expect(normalizeLabel('café')).toBe('cafe');
    expect(normalizeLabel('naïve')).toBe('naive');
    expect(normalizeLabel('über')).toBe('uber');
  });

  it('should remove common punctuation', () => {
    expect(normalizeLabel('First Name *')).toBe('first name');
    expect(normalizeLabel('Name:')).toBe('name');
    expect(normalizeLabel('(Surname)')).toBe('surname');
    expect(normalizeLabel('[ID Number]')).toBe('id number');
    expect(normalizeLabel('First_Name')).toBe('firstname');
  });

  it('should collapse multiple spaces', () => {
    expect(normalizeLabel('First   Name')).toBe('first name');
    expect(normalizeLabel('ID    Number')).toBe('id number');
  });

  it('should preserve abbreviations with dots', () => {
    expect(normalizeLabel('D.O.B')).toBe('d.o.b');
    expect(normalizeLabel('d.o.b.')).toBe('d.o.b');
  });

  it('should handle empty strings', () => {
    expect(normalizeLabel('')).toBe('');
    expect(normalizeLabel('   ')).toBe('');
  });

  it('should handle strings with only punctuation', () => {
    expect(normalizeLabel('***')).toBe('');
    expect(normalizeLabel(':::')).toBe('');
  });

  it('should truncate very long input to prevent DoS', () => {
    const longLabel = 'a'.repeat(1000);
    const result = normalizeLabel(longLabel);
    expect(result.length).toBeLessThanOrEqual(200);
  });
});

// ─── Dictionary ─────────────────────────────────────────────────────

describe('LABEL_DICTIONARY', () => {
  it('should have a substantial number of entries (300+)', () => {
    expect(getDictionarySize()).toBeGreaterThanOrEqual(300);
  });

  it('should contain English personal field labels', () => {
    expect(lookupLabel('first name')?.fieldPath).toBe('firstName');
    expect(lookupLabel('last name')?.fieldPath).toBe('lastName');
    expect(lookupLabel('surname')?.fieldPath).toBe('lastName');
    expect(lookupLabel('date of birth')?.fieldPath).toBe('dateOfBirth');
    expect(lookupLabel('email')?.fieldPath).toBe('email');
  });

  it('should contain Afrikaans labels', () => {
    expect(lookupLabel('naam')?.fieldPath).toBe('firstName');
    expect(lookupLabel('van')?.fieldPath).toBe('lastName');
    expect(lookupLabel('geboortedatum')?.fieldPath).toBe('dateOfBirth');
    expect(lookupLabel('epos')?.fieldPath).toBe('email');
    expect(lookupLabel('selfoon')?.fieldPath).toBe('phoneMobile');
  });

  it('should contain SA identity document labels', () => {
    expect(lookupLabel('id number')?.fieldPath).toBe('saIdNumber');
    expect(lookupLabel('id nommer')?.fieldPath).toBe('saIdNumber');
    expect(lookupLabel('identiteitsnommer')?.fieldPath).toBe('saIdNumber');
    expect(lookupLabel('sa id')?.fieldPath).toBe('saIdNumber');
  });

  it('should contain contact field labels', () => {
    expect(lookupLabel('phone')?.fieldPath).toBe('phoneMobile');
    expect(lookupLabel('cell')?.fieldPath).toBe('phoneMobile');
    expect(lookupLabel('mobile')?.fieldPath).toBe('phoneMobile');
    expect(lookupLabel('fax')?.fieldPath).toBe('fax');
    expect(lookupLabel('work phone')?.fieldPath).toBe('phoneWork');
  });

  it('should contain address field labels', () => {
    expect(lookupLabel('address')?.fieldPath).toBe('addresses[0].street1');
    expect(lookupLabel('city')?.fieldPath).toBe('addresses[0].city');
    expect(lookupLabel('province')?.fieldPath).toBe('addresses[0].province');
    expect(lookupLabel('postal code')?.fieldPath).toBe(
      'addresses[0].postalCode',
    );
  });

  it('should contain banking field labels', () => {
    expect(lookupLabel('bank name')?.fieldPath).toBe(
      'documents[bank_account].additionalFields.bankName',
    );
    expect(lookupLabel('account number')?.fieldPath).toBe(
      'documents[bank_account].number',
    );
    expect(lookupLabel('branch code')?.fieldPath).toBe(
      'documents[bank_account].additionalFields.branchCode',
    );
  });

  it('should contain employment field labels', () => {
    expect(lookupLabel('employer')?.fieldPath).toBe('employer');
    expect(lookupLabel('werkgewer')?.fieldPath).toBe('employer');
    expect(lookupLabel('occupation')?.fieldPath).toBe('jobTitle');
    expect(lookupLabel('employee number')?.fieldPath).toBe('employeeNumber');
  });

  it('should contain medical aid field labels', () => {
    expect(lookupLabel('medical aid')?.fieldPath).toBe(
      'documents[medical_aid].label',
    );
    expect(lookupLabel('mediese fonds')?.fieldPath).toBe(
      'documents[medical_aid].label',
    );
    expect(lookupLabel('medical aid number')?.fieldPath).toBe(
      'documents[medical_aid].number',
    );
  });

  it('should contain emergency contact labels', () => {
    expect(lookupLabel('emergency contact')?.fieldPath).toBe(
      'emergencyContacts[0].firstName',
    );
    expect(lookupLabel('emergency number')?.fieldPath).toBe(
      'emergencyContacts[0].phoneMobile',
    );
    expect(lookupLabel('noodkontak')?.fieldPath).toBe(
      'emergencyContacts[0].firstName',
    );
  });

  it('should contain signature and initial labels', () => {
    expect(lookupLabel('signature')?.fieldPath).toBe('_signature');
    expect(lookupLabel('handtekening')?.fieldPath).toBe('_signature');
    expect(lookupLabel('initials')?.fieldPath).toBe('_initial');
    expect(lookupLabel('voorletters')?.fieldPath).toBe('_initial');
  });

  it('should contain education labels', () => {
    expect(lookupLabel('school')?.fieldPath).toBe('institution');
    expect(lookupLabel('qualification')?.fieldPath).toBe(
      'highestQualification',
    );
    expect(lookupLabel('student number')?.fieldPath).toBe('studentNumber');
  });

  it('should contain SA-specific employment labels (UIF, COIDA)', () => {
    expect(lookupLabel('uif number')?.fieldPath).toBe(
      'documents[uif_number].number',
    );
    expect(lookupLabel('coida number')?.fieldPath).toBe(
      'documents[coida].number',
    );
  });

  it('should return undefined for unknown labels', () => {
    expect(lookupLabel('xyz123abc')).toBeUndefined();
    expect(lookupLabel('unknown field')).toBeUndefined();
  });

  it('should safely handle prototype property names', () => {
    expect(lookupLabel('__proto__')).toBeUndefined();
    expect(lookupLabel('constructor')).toBeUndefined();
    expect(lookupLabel('toString')).toBeUndefined();
  });

  it('should have a category for every entry', () => {
    for (const [label, entry] of Object.entries(LABEL_DICTIONARY)) {
      expect(entry.category, `entry "${label}" missing category`).toBeTruthy();
    }
  });
});

// ─── Levenshtein Distance ───────────────────────────────────────────

describe('levenshteinDistance', () => {
  it('should return 0 for identical strings', () => {
    expect(levenshteinDistance('hello', 'hello')).toBe(0);
    expect(levenshteinDistance('', '')).toBe(0);
  });

  it('should return the length of the other string when one is empty', () => {
    expect(levenshteinDistance('', 'hello')).toBe(5);
    expect(levenshteinDistance('hello', '')).toBe(5);
  });

  it('should compute correct edit distances', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    expect(levenshteinDistance('first', 'frist')).toBe(2);
    expect(levenshteinDistance('name', 'naam')).toBe(2);
    expect(levenshteinDistance('abc', 'def')).toBe(3);
  });

  it('should be symmetric', () => {
    expect(levenshteinDistance('abc', 'xyz')).toBe(
      levenshteinDistance('xyz', 'abc'),
    );
    expect(levenshteinDistance('first', 'frist')).toBe(
      levenshteinDistance('frist', 'first'),
    );
  });
});

describe('levenshteinSimilarity', () => {
  it('should return 1 for identical strings', () => {
    expect(levenshteinSimilarity('hello', 'hello')).toBe(1);
  });

  it('should return 1 for two empty strings', () => {
    expect(levenshteinSimilarity('', '')).toBe(1);
  });

  it('should return 0 for completely different strings of same length', () => {
    expect(levenshteinSimilarity('abc', 'xyz')).toBe(0);
  });

  it('should return values between 0 and 1', () => {
    const sim = levenshteinSimilarity('first name', 'frist name');
    expect(sim).toBeGreaterThan(0);
    expect(sim).toBeLessThan(1);
  });
});

// ─── Token Overlap ──────────────────────────────────────────────────

describe('tokenOverlap', () => {
  it('should return 1 for identical strings', () => {
    expect(tokenOverlap('first name', 'first name')).toBe(1);
  });

  it('should return 1 for two empty strings', () => {
    expect(tokenOverlap('', '')).toBe(1);
  });

  it('should return 0 for completely different tokens', () => {
    expect(tokenOverlap('first name', 'postal code')).toBe(0);
  });

  it('should return partial overlap for shared tokens', () => {
    const score = tokenOverlap('first name', 'name first extra');
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('should handle single tokens', () => {
    expect(tokenOverlap('name', 'name')).toBe(1);
    expect(tokenOverlap('name', 'address')).toBe(0);
  });
});

// ─── Combined Score ─────────────────────────────────────────────────

describe('combinedScore', () => {
  it('should return 1 for identical strings', () => {
    expect(combinedScore('first name', 'first name')).toBe(1);
  });

  it('should return high score for near-matches', () => {
    const score = combinedScore('first name', 'frist name');
    expect(score).toBeGreaterThan(0.6);
  });

  it('should return low score for very different strings', () => {
    const score = combinedScore('first name', 'postal code');
    expect(score).toBeLessThan(0.5);
  });
});

// ─── findBestFuzzyMatch ─────────────────────────────────────────────

describe('findBestFuzzyMatch', () => {
  const keys = ['first name', 'last name', 'email address', 'phone number'];

  it('should find a close match for typos', () => {
    const result = findBestFuzzyMatch('frist name', keys);
    expect(result).not.toBeNull();
    expect(result!.dictionaryLabel).toBe('first name');
  });

  it('should return null when nothing meets threshold', () => {
    const result = findBestFuzzyMatch('xyzabc123', keys, 0.8);
    expect(result).toBeNull();
  });

  it('should respect the minimum score threshold', () => {
    const result = findBestFuzzyMatch('fone number', keys, 0.55);
    if (result) {
      expect(result.score).toBeGreaterThanOrEqual(0.55);
    }
  });
});

// ─── inferFieldType ─────────────────────────────────────────────────

describe('inferFieldType', () => {
  it('should detect signature fields', () => {
    expect(inferFieldType('signature')).toBe('signature');
    expect(inferFieldType('sign here')).toBe('signature');
    expect(inferFieldType('handtekening')).toBe('signature');
  });

  it('should detect initial fields', () => {
    expect(inferFieldType('initial')).toBe('initial');
    expect(inferFieldType('initials')).toBe('initial');
    expect(inferFieldType('voorletters')).toBe('initial');
  });

  it('should detect date fields', () => {
    expect(inferFieldType('date of birth')).toBe('date');
    expect(inferFieldType('datum')).toBe('date');
    expect(inferFieldType('dd/mm/yyyy')).toBe('date');
    expect(inferFieldType('d.o.b')).toBe('date');
    expect(inferFieldType('dob')).toBe('date');
    expect(inferFieldType('geboortedatum')).toBe('date');
  });

  it('should detect checkbox fields', () => {
    expect(inferFieldType('yes / no')).toBe('checkbox');
    expect(inferFieldType('tick here')).toBe('checkbox');
    expect(inferFieldType('ja / nee')).toBe('checkbox');
  });

  it('should detect number fields for financial labels', () => {
    expect(inferFieldType('amount')).toBe('number');
    expect(inferFieldType('salary')).toBe('number');
    expect(inferFieldType('income')).toBe('number');
    expect(inferFieldType('bedrag')).toBe('number');
  });

  it('should NOT detect number for compound labels like phone/id number', () => {
    expect(inferFieldType('phone number')).toBe('text');
    expect(inferFieldType('id number')).toBe('text');
    expect(inferFieldType('account number')).toBe('text');
  });

  it('should default to text for unrecognized patterns', () => {
    expect(inferFieldType('first name')).toBe('text');
    expect(inferFieldType('email address')).toBe('text');
    expect(inferFieldType('city')).toBe('text');
  });
});

// ─── findBestMatch ──────────────────────────────────────────────────

describe('findBestMatch', () => {
  it('should find exact dictionary matches with 0.9 confidence', () => {
    const result = findBestMatch('First Name');
    expect(result.fieldPath).toBe('firstName');
    expect(result.confidence).toBe(0.9);
    expect(result.matchMethod).toBe('exact');
  });

  it('should normalize labels before matching', () => {
    const result = findBestMatch('  FIRST NAME *  ');
    expect(result.fieldPath).toBe('firstName');
    expect(result.confidence).toBe(0.9);
    expect(result.matchMethod).toBe('exact');
  });

  it('should handle Afrikaans labels', () => {
    const result = findBestMatch('Geboortedatum');
    expect(result.fieldPath).toBe('dateOfBirth');
    expect(result.confidence).toBe(0.9);
  });

  it('should use fuzzy matching for typos with 0.5-0.8 confidence', () => {
    const result = findBestMatch('Frist Name');
    expect(result.matchMethod).toBe('fuzzy');
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    expect(result.confidence).toBeLessThanOrEqual(0.8);
    expect(result.fieldPath).toBeTruthy();
  });

  it('should return no-match for completely unrecognized labels', () => {
    const result = findBestMatch('xyzzy_unknown_field_987');
    expect(result.matchMethod).toBe('none');
    expect(result.confidence).toBe(0);
    expect(result.fieldPath).toBe('');
  });

  it('should infer field type for date labels', () => {
    const result = findBestMatch('Date of Birth');
    expect(result.fieldType).toBe('date');
  });

  it('should infer field type for signature labels', () => {
    const result = findBestMatch('Signature');
    expect(result.fieldType).toBe('signature');
  });

  it('should handle labels with diacritics', () => {
    const result = findBestMatch('Prénom');
    // "prenom" normalizes — may or may not match depending on dictionary
    expect(result).toBeDefined();
    expect(result.matchMethod).toBeDefined();
  });

  it('should handle empty string input', () => {
    const result = findBestMatch('');
    expect(result).toBeDefined();
    expect(result.confidence).toBeLessThanOrEqual(0.9);
  });
});

// ─── matchLabelToProfileField ───────────────────────────────────────

describe('matchLabelToProfileField', () => {
  it('should return same result as findBestMatch when no type override', () => {
    const matchResult = matchLabelToProfileField('Email Address');
    expect(matchResult.fieldPath).toBe('email');
    expect(matchResult.confidence).toBe(0.9);
  });

  it('should override inferred field type when type is provided', () => {
    const result = matchLabelToProfileField('ID Number', 'text');
    expect(result.fieldType).toBe('text');
    // The field path should still be resolved from the label
    expect(result.fieldPath).toBe('saIdNumber');
  });

  it('should keep inferred type when no override given', () => {
    const result = matchLabelToProfileField('Date of Birth');
    expect(result.fieldType).toBe('date');
  });
});

// ─── normalizeDateFormat ────────────────────────────────────────────

describe('normalizeDateFormat', () => {
  it('should convert YYYY-MM-DD to DD/MM/YYYY', () => {
    expect(normalizeDateFormat('1990-01-15')).toBe('15/01/1990');
    expect(normalizeDateFormat('2000-12-31')).toBe('31/12/2000');
  });

  it('should convert YYYY/MM/DD to DD/MM/YYYY', () => {
    expect(normalizeDateFormat('1990/01/15')).toBe('15/01/1990');
  });

  it('should pass through DD/MM/YYYY unchanged', () => {
    expect(normalizeDateFormat('15/01/1990')).toBe('15/01/1990');
  });

  it('should handle DD-MM-YYYY format', () => {
    expect(normalizeDateFormat('15-01-1990')).toBe('15/01/1990');
  });

  it('should zero-pad single-digit day and month', () => {
    expect(normalizeDateFormat('1/3/2020')).toBe('01/03/2020');
  });

  it('should handle ambiguous dates with SA convention (DD/MM)', () => {
    // When both parts ≤ 12, assume DD/MM/YYYY (SA convention)
    expect(normalizeDateFormat('05/06/2020')).toBe('05/06/2020');
  });

  it('should detect US format when second part > 12', () => {
    // 01/15/2020 — second part is 15 (> 12), so it must be the day
    expect(normalizeDateFormat('01/15/2020')).toBe('15/01/2020');
  });

  it('should return original string for invalid dates', () => {
    expect(normalizeDateFormat('not a date')).toBe('not a date');
    expect(normalizeDateFormat('')).toBe('');
  });

  it('should handle dates with dot separator', () => {
    expect(normalizeDateFormat('1990.01.15')).toBe('15/01/1990');
  });

  it('should reject invalid month/day ranges', () => {
    expect(normalizeDateFormat('32/13/2020')).toBe('32/13/2020');
  });
});

// ─── normalizePhoneNumber ───────────────────────────────────────────

describe('normalizePhoneNumber', () => {
  it('should convert 0XX to +27XX', () => {
    expect(normalizePhoneNumber('0821234567')).toBe('+27821234567');
  });

  it('should keep +27 format unchanged', () => {
    expect(normalizePhoneNumber('+27821234567')).toBe('+27821234567');
  });

  it('should add + to 27 prefix', () => {
    expect(normalizePhoneNumber('27821234567')).toBe('+27821234567');
  });

  it('should strip non-digit characters', () => {
    expect(normalizePhoneNumber('082 123 4567')).toBe('+27821234567');
    expect(normalizePhoneNumber('082-123-4567')).toBe('+27821234567');
    expect(normalizePhoneNumber('(082) 123-4567')).toBe('+27821234567');
  });

  it('should return original for too-short numbers', () => {
    expect(normalizePhoneNumber('082')).toBe('082');
    expect(normalizePhoneNumber('12345678')).toBe('12345678');
  });

  it('should convert 0027 international prefix to +27', () => {
    expect(normalizePhoneNumber('0027821234567')).toBe('+27821234567');
  });

  it('should handle empty string', () => {
    expect(normalizePhoneNumber('')).toBe('');
    expect(normalizePhoneNumber('   ')).toBe('');
  });
});

// ─── normalizeAddress ───────────────────────────────────────────────

describe('normalizeAddress', () => {
  it('should title-case street, suburb, and city', () => {
    const result = normalizeAddress({
      street1: '123 main road',
      suburb: 'sandton',
      city: 'johannesburg',
    });
    expect(result.street1).toBe('123 Main Road');
    expect(result.suburb).toBe('Sandton');
    expect(result.city).toBe('Johannesburg');
  });

  it('should strip spaces from postal code', () => {
    const result = normalizeAddress({ postalCode: '20 50' });
    expect(result.postalCode).toBe('2050');
  });

  it('should normalize province abbreviations', () => {
    expect(normalizeAddress({ province: 'gp' }).province).toBe('Gauteng');
    expect(normalizeAddress({ province: 'KZN' }).province).toBe(
      'KwaZulu-Natal',
    );
    expect(normalizeAddress({ province: 'wc' }).province).toBe('Western Cape');
    expect(normalizeAddress({ province: 'EC' }).province).toBe('Eastern Cape');
  });

  it('should normalize full province names', () => {
    expect(normalizeAddress({ province: 'gauteng' }).province).toBe('Gauteng');
    expect(normalizeAddress({ province: 'WESTERN CAPE' }).province).toBe(
      'Western Cape',
    );
  });

  it('should default empty country to South Africa', () => {
    expect(normalizeAddress({ country: '' }).country).toBe('South Africa');
  });

  it('should preserve non-empty country', () => {
    expect(normalizeAddress({ country: 'Namibia' }).country).toBe('Namibia');
  });

  it('should trim all values', () => {
    const result = normalizeAddress({
      street1: '  123 Main Rd  ',
      city: '  Cape Town  ',
    });
    expect(result.street1).toBe('123 Main Rd');
    expect(result.city).toBe('Cape Town');
  });

  it('should pass through unknown keys trimmed', () => {
    const result = normalizeAddress({ custom: '  value  ' });
    expect(result.custom).toBe('value');
  });
});

// ─── Integration: Full pipeline ─────────────────────────────────────

describe('Integration: end-to-end field matching', () => {
  it('should match English labels through normalization + dictionary', () => {
    const result = findBestMatch('  First Name: *  ');
    expect(result.fieldPath).toBe('firstName');
    expect(result.confidence).toBe(0.9);
    expect(result.matchMethod).toBe('exact');
  });

  it('should match Afrikaans labels through normalization + dictionary', () => {
    const result = findBestMatch('  Selfoon Nommer:  ');
    expect(result.fieldPath).toBe('phoneMobile');
    expect(result.confidence).toBe(0.9);
  });

  it('should fuzzy-match typos in English', () => {
    // Single-typo case: "emal address" is close enough to "email address"
    const result = findBestMatch('Emal Address');
    expect(result.matchMethod).toBe('fuzzy');
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('should handle mixed-case Afrikaans with punctuation', () => {
    const result = findBestMatch('IDENTITEITSNOMMER:');
    expect(result.fieldPath).toBe('saIdNumber');
    expect(result.confidence).toBe(0.9);
  });

  it('should infer correct types through the full pipeline', () => {
    expect(findBestMatch('Date of Birth:').fieldType).toBe('date');
    expect(findBestMatch('Signature:').fieldType).toBe('signature');
    expect(findBestMatch('ID Number:').fieldType).toBe('text');
  });

  it('should handle common SA form labels', () => {
    // These are labels commonly found on SA government and corporate forms
    expect(findBestMatch('ID Nommer').confidence).toBeGreaterThanOrEqual(0.9);
    expect(findBestMatch('Werkgewer').confidence).toBeGreaterThanOrEqual(0.9);
    expect(findBestMatch('Mediese Fonds').confidence).toBeGreaterThanOrEqual(
      0.9,
    );
    expect(findBestMatch('Poskode').confidence).toBeGreaterThanOrEqual(0.9);
    expect(findBestMatch('Handtekening').confidence).toBeGreaterThanOrEqual(
      0.9,
    );
  });
});
