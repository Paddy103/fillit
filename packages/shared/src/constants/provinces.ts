/**
 * South African province data, lookup maps, and postal code ranges.
 */

import { SA_PROVINCES } from './index.js';

// ─── Types ─────────────────────────────────────────────────────────

export interface ProvinceInfo {
  name: string;
  abbreviation: string;
  capital: string;
}

export type SAProvince = (typeof SA_PROVINCES)[number];

export type SAProvinceAbbreviation = 'EC' | 'FS' | 'GP' | 'KZN' | 'LP' | 'MP' | 'NW' | 'NC' | 'WC';

// ─── Province Data ─────────────────────────────────────────────────

export const SA_PROVINCE_DATA: readonly ProvinceInfo[] = [
  { name: 'Eastern Cape', abbreviation: 'EC', capital: 'Bhisho' },
  { name: 'Free State', abbreviation: 'FS', capital: 'Bloemfontein' },
  { name: 'Gauteng', abbreviation: 'GP', capital: 'Johannesburg' },
  { name: 'KwaZulu-Natal', abbreviation: 'KZN', capital: 'Pietermaritzburg' },
  { name: 'Limpopo', abbreviation: 'LP', capital: 'Polokwane' },
  { name: 'Mpumalanga', abbreviation: 'MP', capital: 'Mbombela' },
  { name: 'North West', abbreviation: 'NW', capital: 'Mahikeng' },
  { name: 'Northern Cape', abbreviation: 'NC', capital: 'Kimberley' },
  { name: 'Western Cape', abbreviation: 'WC', capital: 'Cape Town' },
] as const;

// ─── Lookup Maps ───────────────────────────────────────────────────

/** Map from abbreviation (e.g. 'EC') to province name (e.g. 'Eastern Cape'). */
export const SA_PROVINCE_ABBREVIATION_MAP: ReadonlyMap<string, SAProvince> = new Map(
  SA_PROVINCE_DATA.map((p) => [p.abbreviation, p.name as SAProvince]),
);

/** Map from province name (e.g. 'Eastern Cape') to its full info. */
export const SA_PROVINCE_NAME_MAP: ReadonlyMap<string, ProvinceInfo> = new Map(
  SA_PROVINCE_DATA.map((p) => [p.name, p]),
);

// ─── Postal Code Ranges ────────────────────────────────────────────

/**
 * Approximate SA postal code ranges by province.
 * Some provinces have multiple ranges; those are represented as
 * separate entries in the array.
 */
export const SA_POSTAL_CODE_RANGES: ReadonlyMap<
  SAProvince,
  readonly { min: number; max: number }[]
> = new Map<SAProvince, readonly { min: number; max: number }[]>([
  // Order matters: narrower ranges must appear before broader ones
  // that overlap (e.g. Limpopo before Gauteng, Western Cape before Northern Cape).
  ['Limpopo', [{ min: 500, max: 999 }]],
  [
    'Mpumalanga',
    [
      { min: 1000, max: 1399 },
      { min: 2200, max: 2499 },
    ],
  ],
  ['Gauteng', [{ min: 1, max: 2199 }]],
  ['North West', [{ min: 2500, max: 2999 }]],
  ['KwaZulu-Natal', [{ min: 3000, max: 4930 }]],
  ['Eastern Cape', [{ min: 5000, max: 6499 }]],
  [
    'Western Cape',
    [
      { min: 6500, max: 6999 },
      { min: 7100, max: 7999 },
    ],
  ],
  ['Northern Cape', [{ min: 7000, max: 8999 }]],
  ['Free State', [{ min: 9300, max: 9869 }]],
]);
