/**
 * Address CRUD operations for the FillIt SQLite database.
 *
 * Provides type-safe create, read, update, and delete operations for addresses
 * linked to user profiles. Handles SA-specific fields (province, postal code)
 * and enforces the single-default constraint per profile.
 */

import { randomUUID } from 'expo-crypto';
import type { Address } from '@fillit/shared';

import { getFirst, getAll, runQuery, withTransaction } from './database';
import { QueryError } from './databaseErrors';

// ─── Database Row Shape ──────────────────────────────────────────────

/** Raw row shape returned by SQLite for the addresses table. */
interface AddressRow {
  id: string;
  profile_id: string;
  label: string;
  street1: string;
  street2: string | null;
  suburb: string | null;
  city: string;
  province: string;
  postal_code: string;
  country: string | null;
  is_default: number;
}

// ─── Input Types ─────────────────────────────────────────────────────

/** Fields required to create a new address. */
export interface CreateAddressInput {
  profileId: string;
  label: string;
  street1: string;
  street2?: string;
  suburb?: string;
  city: string;
  province: string;
  postalCode: string;
  country?: string;
  isDefault?: boolean;
}

/** Fields that can be updated on an existing address. All are optional. */
export interface UpdateAddressInput {
  label?: string;
  street1?: string;
  street2?: string | null;
  suburb?: string | null;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  isDefault?: boolean;
}

// ─── Row ↔ Domain Mapping ────────────────────────────────────────────

/** Convert a database row to the shared Address interface. */
function rowToAddress(row: AddressRow): Address {
  return {
    id: row.id,
    label: row.label,
    street1: row.street1,
    street2: row.street2 ?? undefined,
    suburb: row.suburb ?? undefined,
    city: row.city,
    province: row.province,
    postalCode: row.postal_code,
    country: row.country ?? 'South Africa',
    isDefault: row.is_default === 1,
  };
}

// ─── CRUD Operations ─────────────────────────────────────────────────

/**
 * Create a new address linked to a profile.
 *
 * If `isDefault` is true, any existing default address for the same profile
 * is cleared first to enforce the single-default constraint.
 *
 * @param input - Address creation fields.
 * @returns The newly created Address with its generated ID.
 * @throws {QueryError} If the insert fails (e.g. invalid profile_id FK).
 */
export async function createAddress(input: CreateAddressInput): Promise<Address> {
  const id = randomUUID();
  const isDefault = input.isDefault ?? false;
  const country = input.country ?? 'South Africa';

  await withTransaction(async () => {
    // If marking as default, clear any existing default for this profile
    if (isDefault) {
      await runQuery(
        'UPDATE addresses SET is_default = 0 WHERE profile_id = ? AND is_default = 1',
        [input.profileId],
      );
    }

    await runQuery(
      `INSERT INTO addresses (id, profile_id, label, street1, street2, suburb, city, province, postal_code, country, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.profileId,
        input.label,
        input.street1,
        input.street2 ?? null,
        input.suburb ?? null,
        input.city,
        input.province,
        input.postalCode,
        country,
        isDefault ? 1 : 0,
      ],
    );
  });

  return {
    id,
    label: input.label,
    street1: input.street1,
    street2: input.street2,
    suburb: input.suburb,
    city: input.city,
    province: input.province,
    postalCode: input.postalCode,
    country,
    isDefault,
  };
}

/**
 * Retrieve a single address by its ID.
 *
 * @param id - The address UUID.
 * @returns The address, or `null` if not found.
 */
export async function getAddressById(id: string): Promise<Address | null> {
  const row = await getFirst<AddressRow>('SELECT * FROM addresses WHERE id = ?', [id]);
  return row ? rowToAddress(row) : null;
}

/**
 * List all addresses for a given profile, ordered by default status
 * (default first) then by label alphabetically.
 *
 * @param profileId - The profile UUID.
 * @returns An array of addresses (may be empty).
 */
export async function getAddressesByProfile(profileId: string): Promise<Address[]> {
  const rows = await getAll<AddressRow>(
    'SELECT * FROM addresses WHERE profile_id = ? ORDER BY is_default DESC, label ASC',
    [profileId],
  );
  return rows.map(rowToAddress);
}

/**
 * Update an existing address.
 *
 * Only the fields present in the input are updated. If `isDefault` is set
 * to true, any other default address for the same profile is cleared first.
 *
 * @param id - The address UUID to update.
 * @param input - The fields to update.
 * @returns The updated address, or `null` if the ID was not found.
 * @throws {QueryError} If the update query fails.
 */
export async function updateAddress(
  id: string,
  input: UpdateAddressInput,
): Promise<Address | null> {
  // Build dynamic SET clause from provided fields
  const setClauses: string[] = [];
  const params: (string | number | null)[] = [];

  if (input.label !== undefined) {
    setClauses.push('label = ?');
    params.push(input.label);
  }
  if (input.street1 !== undefined) {
    setClauses.push('street1 = ?');
    params.push(input.street1);
  }
  if (input.street2 !== undefined) {
    setClauses.push('street2 = ?');
    params.push(input.street2);
  }
  if (input.suburb !== undefined) {
    setClauses.push('suburb = ?');
    params.push(input.suburb);
  }
  if (input.city !== undefined) {
    setClauses.push('city = ?');
    params.push(input.city);
  }
  if (input.province !== undefined) {
    setClauses.push('province = ?');
    params.push(input.province);
  }
  if (input.postalCode !== undefined) {
    setClauses.push('postal_code = ?');
    params.push(input.postalCode);
  }
  if (input.country !== undefined) {
    setClauses.push('country = ?');
    params.push(input.country);
  }
  if (input.isDefault !== undefined) {
    setClauses.push('is_default = ?');
    params.push(input.isDefault ? 1 : 0);
  }

  // Nothing to update
  if (setClauses.length === 0) {
    return getAddressById(id);
  }

  await withTransaction(async () => {
    // If setting as default, clear existing default for this profile
    if (input.isDefault === true) {
      // Look up the profile_id for this address
      const existing = await getFirst<{ profile_id: string }>(
        'SELECT profile_id FROM addresses WHERE id = ?',
        [id],
      );
      if (existing) {
        await runQuery(
          'UPDATE addresses SET is_default = 0 WHERE profile_id = ? AND is_default = 1 AND id != ?',
          [existing.profile_id, id],
        );
      }
    }

    // Apply the update
    params.push(id);
    await runQuery(`UPDATE addresses SET ${setClauses.join(', ')} WHERE id = ?`, params);
  });

  return getAddressById(id);
}

/**
 * Delete an address by ID.
 *
 * @param id - The address UUID to delete.
 * @returns `true` if a row was deleted, `false` if the ID was not found.
 */
export async function deleteAddress(id: string): Promise<boolean> {
  const result = await runQuery('DELETE FROM addresses WHERE id = ?', [id]);
  return result.changes > 0;
}

/**
 * Count addresses for a given profile.
 *
 * @param profileId - The profile UUID.
 * @returns The number of addresses.
 */
export async function countAddressesByProfile(profileId: string): Promise<number> {
  const row = await getFirst<{ count: number }>(
    'SELECT COUNT(*) as count FROM addresses WHERE profile_id = ?',
    [profileId],
  );
  return row?.count ?? 0;
}

/**
 * Get the default address for a profile.
 *
 * @param profileId - The profile UUID.
 * @returns The default address, or `null` if none is set as default.
 */
export async function getDefaultAddress(profileId: string): Promise<Address | null> {
  const row = await getFirst<AddressRow>(
    'SELECT * FROM addresses WHERE profile_id = ? AND is_default = 1',
    [profileId],
  );
  return row ? rowToAddress(row) : null;
}

/**
 * Set an address as the default for its profile.
 *
 * Clears the default flag on all other addresses for the same profile,
 * then sets the specified address as the default.
 *
 * @param id - The address UUID to make default.
 * @returns The updated address, or `null` if the ID was not found.
 */
export async function setDefaultAddress(id: string): Promise<Address | null> {
  const existing = await getFirst<AddressRow>('SELECT * FROM addresses WHERE id = ?', [id]);
  if (!existing) {
    return null;
  }

  await withTransaction(async () => {
    // Clear all defaults for this profile
    await runQuery('UPDATE addresses SET is_default = 0 WHERE profile_id = ? AND is_default = 1', [
      existing.profile_id,
    ]);
    // Set the new default
    await runQuery('UPDATE addresses SET is_default = 1 WHERE id = ?', [id]);
  });

  return getAddressById(id);
}

/**
 * Delete all addresses for a profile.
 *
 * @param profileId - The profile UUID.
 * @returns The number of addresses deleted.
 */
export async function deleteAddressesByProfile(profileId: string): Promise<number> {
  const result = await runQuery('DELETE FROM addresses WHERE profile_id = ?', [profileId]);
  return result.changes;
}
