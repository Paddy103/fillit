/**
 * Field normalization utilities for the FillIt application.
 *
 * Provides offline heuristic fallback for field detection:
 * - Label normalization (trim, lowercase, strip punctuation, remove diacritics)
 * - Dictionary-based exact matching (~300 entries, EN/AF/SA)
 * - Fuzzy matching via Levenshtein distance + token overlap
 * - Field type inference from label patterns
 * - Date, phone, and address normalization for SA formats
 */

import type { DetectedFieldType } from '../types/document.js';
import { LABEL_DICTIONARY, lookupLabel } from './dictionary.js';
import { findBestFuzzyMatch } from './fuzzy.js';

// Re-export sub-modules for direct access
export { LABEL_DICTIONARY, getDictionarySize, lookupLabel } from './dictionary.js';
export type { DictionaryEntry } from './dictionary.js';
export {
  levenshteinDistance,
  levenshteinSimilarity,
  tokenOverlap,
  combinedScore,
  findBestFuzzyMatch,
} from './fuzzy.js';
export type { FuzzyMatchResult } from './fuzzy.js';

// ─── Types ──────────────────────────────────────────────────────────

/**
 * Result of matching a label to a profile field.
 */
export interface MatchResult {
  /** Profile field path (e.g., 'firstName', 'addresses[0].city'). */
  fieldPath: string;
  /** Confidence score from 0 to 1. */
  confidence: number;
  /** Inferred field type. */
  fieldType: DetectedFieldType;
  /** How the match was determined. */
  matchMethod: 'exact' | 'fuzzy' | 'none';
}

// ─── Label Normalization ────────────────────────────────────────────

/**
 * Normalize a raw OCR-detected label string.
 *
 * Steps:
 * 1. Trim whitespace
 * 2. Convert to lowercase
 * 3. Remove diacritics / accent marks
 * 4. Remove common punctuation (colons, asterisks, parentheses, brackets, periods at boundaries)
 * 5. Collapse multiple spaces to a single space
 * 6. Final trim
 *
 * @example
 * normalizeLabel("First Name *") // "first name"
 * normalizeLabel("Pr\u00e9nom:")     // "prenom"
 * normalizeLabel("  ID Number  ") // "id number"
 */
export function normalizeLabel(label: string): string {
  let result = label.trim().toLowerCase();

  // Remove diacritics (NFD decomposes, then strip combining marks)
  result = result.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Remove common punctuation: colons, asterisks, parentheses, brackets, underscores
  result = result.replace(/[:\*\(\)\[\]{}_]/g, '');

  // Remove periods that are not between letters (preserve abbreviations like d.o.b)
  // but remove trailing/leading periods and standalone periods
  result = result.replace(/\.(?!\w)|(?<!\w)\./g, '');

  // Collapse multiple spaces
  result = result.replace(/\s+/g, ' ');

  return result.trim();
}

// ─── Field Type Inference ───────────────────────────────────────────

/** Patterns for inferring field type from label text. */
const FIELD_TYPE_PATTERNS: Array<{
  type: DetectedFieldType;
  patterns: RegExp[];
}> = [
  {
    type: 'signature',
    patterns: [
      /\bsignature\b/,
      /\bsign\b/,
      /\bsigned\b/,
      /\bhandtekening\b/,
      /\bteken\b/,
    ],
  },
  {
    type: 'initial',
    patterns: [/\binitial\b/, /\binitials\b/, /\bvoorletters\b/],
  },
  {
    type: 'date',
    patterns: [
      /\bdate\b/,
      /\bdatum\b/,
      /\bdd\/mm\/yyyy\b/,
      /\bdd-mm-yyyy\b/,
      /\byyyy-mm-dd\b/,
      /\bgeboorte/,
      /\bbirth/,
      /\bd\.o\.b\b/,
      /\bdob\b/,
    ],
  },
  {
    type: 'checkbox',
    patterns: [
      /\byes\s*\/?\s*no\b/,
      /\btick\b/,
      /\bcheck\b/,
      /\bmark\b/,
      /\bja\s*\/?\s*nee\b/,
      /\bselect\b/,
    ],
  },
  {
    type: 'number',
    patterns: [
      /\bnumber\b/,
      /\bnommer\b/,
      /\bno\b/,
      /\bnr\b/,
      /\bamt\b/,
      /\bamount\b/,
      /\bbedrag\b/,
      /\b\d+\b/,
    ],
  },
];

/**
 * Infer the field type from a normalized label string.
 *
 * Checks patterns in priority order:
 * signature > initial > date > checkbox > number > text (default)
 */
export function inferFieldType(normalizedLabel: string): DetectedFieldType {
  for (const { type, patterns } of FIELD_TYPE_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(normalizedLabel)) {
        return type;
      }
    }
  }
  return 'text';
}

// ─── Matching ───────────────────────────────────────────────────────

/** Cached array of dictionary keys for fuzzy matching. */
let cachedDictionaryKeys: string[] | null = null;

function getDictionaryKeys(): string[] {
  if (!cachedDictionaryKeys) {
    cachedDictionaryKeys = Object.keys(LABEL_DICTIONARY);
  }
  return cachedDictionaryKeys;
}

/** Confidence for exact dictionary match. */
const EXACT_MATCH_CONFIDENCE = 0.9;

/** Minimum fuzzy score to count as a match. */
const FUZZY_MIN_THRESHOLD = 0.55;

/** Scale fuzzy scores to this range [min, max]. */
const FUZZY_CONFIDENCE_MIN = 0.5;
const FUZZY_CONFIDENCE_MAX = 0.8;

/**
 * Map a raw fuzzy score (0.55-1.0) to confidence range (0.5-0.8).
 */
function scaleFuzzyConfidence(score: number): number {
  const range = 1.0 - FUZZY_MIN_THRESHOLD;
  const normalized = (score - FUZZY_MIN_THRESHOLD) / range;
  return (
    FUZZY_CONFIDENCE_MIN +
    normalized * (FUZZY_CONFIDENCE_MAX - FUZZY_CONFIDENCE_MIN)
  );
}

/**
 * Find the best profile field match for a raw label string.
 *
 * 1. Normalizes the label
 * 2. Attempts exact dictionary lookup (confidence = 0.9)
 * 3. Falls back to fuzzy matching (confidence = 0.5-0.8)
 * 4. Returns no-match result if nothing found (confidence = 0.0)
 */
export function findBestMatch(label: string): MatchResult {
  const normalized = normalizeLabel(label);
  const fieldType = inferFieldType(normalized);

  // Exact dictionary match
  const entry = lookupLabel(normalized);
  if (entry) {
    return {
      fieldPath: entry.fieldPath,
      confidence: EXACT_MATCH_CONFIDENCE,
      fieldType,
      matchMethod: 'exact',
    };
  }

  // Fuzzy match
  const fuzzyResult = findBestFuzzyMatch(
    normalized,
    getDictionaryKeys(),
    FUZZY_MIN_THRESHOLD,
  );

  if (fuzzyResult) {
    const matchedEntry = LABEL_DICTIONARY[fuzzyResult.dictionaryLabel];
    if (matchedEntry) {
      return {
        fieldPath: matchedEntry.fieldPath,
        confidence: scaleFuzzyConfidence(fuzzyResult.score),
        fieldType,
        matchMethod: 'fuzzy',
      };
    }
  }

  // No match
  return {
    fieldPath: '',
    confidence: 0,
    fieldType,
    matchMethod: 'none',
  };
}

/**
 * Match a label to a profile field with optional type context.
 *
 * If a fieldType is provided, it overrides the inferred type.
 * Otherwise, the type is inferred from the label.
 */
export function matchLabelToProfileField(
  label: string,
  fieldType?: DetectedFieldType,
): MatchResult {
  const result = findBestMatch(label);
  if (fieldType) {
    return { ...result, fieldType };
  }
  return result;
}

// ─── Value Normalization ────────────────────────────────────────────

/**
 * Normalize a date string to SA format DD/MM/YYYY.
 *
 * Handles common input formats:
 * - YYYY-MM-DD → DD/MM/YYYY
 * - YYYY/MM/DD → DD/MM/YYYY
 * - MM-DD-YYYY → DD/MM/YYYY (US format, heuristic: month ≤ 12)
 * - DD-MM-YYYY → DD/MM/YYYY
 * - DD/MM/YYYY → DD/MM/YYYY (already correct)
 * - D/M/YYYY → DD/MM/YYYY (zero-pad)
 *
 * Returns the original string if it cannot be parsed.
 */
export function normalizeDateFormat(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  // Match patterns with separators (-, /, or .)
  const match = trimmed.match(
    /^(\d{1,4})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{1,4})$/,
  );
  if (!match) return trimmed;

  const p1 = match[1] ?? '';
  const p2 = match[2] ?? '';
  const p3 = match[3] ?? '';

  let day: number;
  let month: number;
  let year: number;

  if (p1.length === 4) {
    // YYYY-MM-DD or YYYY/MM/DD
    year = parseInt(p1, 10);
    month = parseInt(p2, 10);
    day = parseInt(p3, 10);
  } else if (p3.length === 4) {
    const n1 = parseInt(p1, 10);
    const n2 = parseInt(p2, 10);
    year = parseInt(p3, 10);

    if (n1 > 12) {
      // DD/MM/YYYY (day > 12, must be day first)
      day = n1;
      month = n2;
    } else if (n2 > 12) {
      // MM/DD/YYYY (second part > 12, must be day)
      month = n1;
      day = n2;
    } else {
      // Ambiguous — assume DD/MM/YYYY (SA convention)
      day = n1;
      month = n2;
    }
  } else {
    // Cannot determine format
    return trimmed;
  }

  // Validate ranges
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1) {
    return trimmed;
  }

  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  const yyyy = String(year).padStart(4, '0');

  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Normalize a phone number to SA format.
 *
 * Conversions:
 * - Strips all non-digit characters except leading +
 * - +27... stays as is
 * - 027... → +27...
 * - 0... → +27... (replace leading 0 with +27)
 * - 27... → +27... (add + prefix)
 *
 * Returns the original string if it cannot be normalized.
 */
export function normalizePhoneNumber(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  // Preserve leading + then strip all non-digits
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');

  if (digits.length < 9) return trimmed;

  if (hasPlus && digits.startsWith('27')) {
    // Already +27 format
    return `+${digits}`;
  }

  if (digits.startsWith('27') && digits.length >= 11) {
    return `+${digits}`;
  }

  if (digits.startsWith('0') && digits.length === 10) {
    return `+27${digits.slice(1)}`;
  }

  return trimmed;
}

/**
 * Normalize address components.
 *
 * - Trims all values
 * - Title-cases street, suburb, city
 * - Uppercases postal code
 * - Normalizes province names to standard SA province format
 */
export function normalizeAddress(
  address: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(address)) {
    const trimmed = value.trim();

    switch (key) {
      case 'street1':
      case 'street2':
      case 'suburb':
      case 'city':
        result[key] = titleCase(trimmed);
        break;
      case 'postalCode':
        result[key] = trimmed.replace(/\s/g, '');
        break;
      case 'province':
        result[key] = normalizeProvince(trimmed);
        break;
      case 'country':
        result[key] = trimmed || 'South Africa';
        break;
      default:
        result[key] = trimmed;
    }
  }

  return result;
}

/**
 * Convert a string to title case (each word capitalized).
 */
function titleCase(str: string): string {
  if (!str) return str;
  return str.replace(
    /\w\S*/g,
    (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
  );
}

/** Map of province abbreviations and variations to standard names. */
const PROVINCE_MAP: Record<string, string> = {
  ec: 'Eastern Cape',
  'eastern cape': 'Eastern Cape',
  fs: 'Free State',
  'free state': 'Free State',
  gp: 'Gauteng',
  gt: 'Gauteng',
  gauteng: 'Gauteng',
  kzn: 'KwaZulu-Natal',
  'kwazulu-natal': 'KwaZulu-Natal',
  'kwazulu natal': 'KwaZulu-Natal',
  lp: 'Limpopo',
  limpopo: 'Limpopo',
  mp: 'Mpumalanga',
  mpumalanga: 'Mpumalanga',
  nw: 'North West',
  'north west': 'North West',
  nc: 'Northern Cape',
  'northern cape': 'Northern Cape',
  wc: 'Western Cape',
  'western cape': 'Western Cape',
};

/**
 * Normalize a province string to the standard SA province name.
 * Falls back to title-casing if no match found.
 */
function normalizeProvince(province: string): string {
  const lower = province.toLowerCase().trim();
  return PROVINCE_MAP[lower] ?? titleCase(province);
}
