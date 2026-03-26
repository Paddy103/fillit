/**
 * Signature CRUD Service
 *
 * Provides create, read, update, and delete operations for signatures
 * stored in the local SQLite database. Signatures can be drawn (PNG image +
 * optional SVG path) or typed (text + font family). Each signature is linked
 * to a user profile and at most one signature per profile can be the default.
 *
 * Image files are managed via the file storage service; deleting a signature
 * also removes its associated image file from disk.
 */

import type { SignatureType, StoredSignature } from '@fillit/shared';

import { runQuery, getFirst, getAll, withTransaction } from './database';
import { deleteFile, fileExists } from './fileStorage';

// ─── Database Row Shape ──────────────────────────────────────────────

/** Raw row shape returned by SQLite for the signatures table. */
interface SignatureRow {
  id: string;
  profile_id: string;
  type: string;
  label: string | null;
  image_uri: string | null;
  svg_path: string | null;
  text: string | null;
  font_family: string | null;
  created_at: string;
  is_default: number;
}

// ─── Input Types ─────────────────────────────────────────────────────

/** Fields required to create a new signature. */
export interface CreateSignatureInput {
  id: string;
  profileId: string;
  type: SignatureType;
  label: string;
  imageUri?: string;
  svgPath?: string;
  text?: string;
  fontFamily?: string;
  isDefault?: boolean;
}

/** Fields that can be updated on an existing signature. */
export interface UpdateSignatureInput {
  label?: string;
  imageUri?: string;
  svgPath?: string;
  text?: string;
  fontFamily?: string;
  isDefault?: boolean;
}

// ─── Row Mapping ─────────────────────────────────────────────────────

/**
 * Convert a raw database row into a `StoredSignature` domain object.
 */
function rowToSignature(row: SignatureRow): StoredSignature {
  return {
    id: row.id,
    profileId: row.profile_id,
    type: row.type as SignatureType,
    label: row.label ?? '',
    imageUri: row.image_uri ?? undefined,
    svgPath: row.svg_path ?? undefined,
    text: row.text ?? undefined,
    fontFamily: row.font_family ?? undefined,
    createdAt: row.created_at,
    isDefault: row.is_default === 1,
  };
}

// ─── Validation ──────────────────────────────────────────────────────

/**
 * Validate that the create input has the required fields for its type.
 * Throws if validation fails.
 */
function validateCreateInput(input: CreateSignatureInput): void {
  if (!input.id || typeof input.id !== 'string') {
    throw new SignatureValidationError('Signature id is required');
  }
  if (!input.profileId || typeof input.profileId !== 'string') {
    throw new SignatureValidationError('Profile id is required');
  }
  if (input.type !== 'drawn' && input.type !== 'typed') {
    throw new SignatureValidationError('Signature type must be "drawn" or "typed"');
  }
  if (!input.label || typeof input.label !== 'string') {
    throw new SignatureValidationError('Signature label is required');
  }

  if (input.type === 'typed') {
    if (!input.text || typeof input.text !== 'string') {
      throw new SignatureValidationError('Typed signature must include text');
    }
    if (!input.fontFamily || typeof input.fontFamily !== 'string') {
      throw new SignatureValidationError('Typed signature must include fontFamily');
    }
  }
}

// ─── Error Types ─────────────────────────────────────────────────────

export class SignatureServiceError extends Error {
  public readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'SignatureServiceError';
    this.cause = cause;
  }
}

export class SignatureNotFoundError extends SignatureServiceError {
  constructor(id: string) {
    super(`Signature not found: ${id}`);
    this.name = 'SignatureNotFoundError';
  }
}

export class SignatureValidationError extends SignatureServiceError {
  constructor(message: string) {
    super(message);
    this.name = 'SignatureValidationError';
  }
}

// ─── CRUD Operations ─────────────────────────────────────────────────

/**
 * Create a new signature linked to a profile.
 *
 * If `isDefault` is true, any existing default signature for the same
 * profile will be unset within a single transaction.
 *
 * @param input - The signature data to insert.
 * @returns The newly created signature.
 */
export async function createSignature(input: CreateSignatureInput): Promise<StoredSignature> {
  validateCreateInput(input);

  const now = new Date().toISOString();
  const isDefault = input.isDefault ? 1 : 0;

  await withTransaction(async () => {
    // If this is the new default, clear any existing default for this profile
    if (isDefault) {
      await runQuery(
        'UPDATE signatures SET is_default = 0 WHERE profile_id = ? AND is_default = 1',
        [input.profileId],
      );
    }

    await runQuery(
      `INSERT INTO signatures (id, profile_id, type, label, image_uri, svg_path, text, font_family, created_at, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id,
        input.profileId,
        input.type,
        input.label,
        input.imageUri ?? null,
        input.svgPath ?? null,
        input.text ?? null,
        input.fontFamily ?? null,
        now,
        isDefault,
      ],
    );
  });

  // Return the created record
  const created = await getSignatureById(input.id);
  if (!created) {
    throw new SignatureServiceError('Failed to retrieve signature after creation');
  }
  return created;
}

/**
 * Get a signature by its ID.
 *
 * @param id - The signature UUID.
 * @returns The signature, or `null` if not found.
 */
export async function getSignatureById(id: string): Promise<StoredSignature | null> {
  const row = await getFirst<SignatureRow>('SELECT * FROM signatures WHERE id = ?', [id]);
  return row ? rowToSignature(row) : null;
}

/**
 * Get all signatures for a specific profile.
 *
 * Results are ordered by `is_default DESC, created_at DESC` so the default
 * signature (if any) appears first, followed by most recently created.
 *
 * @param profileId - The profile UUID.
 * @returns An array of signatures for the profile.
 */
export async function getSignaturesByProfile(profileId: string): Promise<StoredSignature[]> {
  const rows = await getAll<SignatureRow>(
    'SELECT * FROM signatures WHERE profile_id = ? ORDER BY is_default DESC, created_at DESC',
    [profileId],
  );
  return rows.map(rowToSignature);
}

/**
 * Get the default signature for a profile.
 *
 * @param profileId - The profile UUID.
 * @returns The default signature, or `null` if none is set.
 */
export async function getDefaultSignature(profileId: string): Promise<StoredSignature | null> {
  const row = await getFirst<SignatureRow>(
    'SELECT * FROM signatures WHERE profile_id = ? AND is_default = 1',
    [profileId],
  );
  return row ? rowToSignature(row) : null;
}

/**
 * Count signatures for a profile.
 *
 * @param profileId - The profile UUID.
 * @returns The number of signatures stored for this profile.
 */
export async function countSignaturesByProfile(profileId: string): Promise<number> {
  const row = await getFirst<{ count: number }>(
    'SELECT COUNT(*) as count FROM signatures WHERE profile_id = ?',
    [profileId],
  );
  return row?.count ?? 0;
}

/**
 * Update an existing signature.
 *
 * If `isDefault` is set to `true`, any other default signature for the
 * same profile is unset within a transaction.
 *
 * @param id - The signature UUID to update.
 * @param updates - The fields to change.
 * @returns The updated signature.
 * @throws {SignatureNotFoundError} If the signature does not exist.
 */
export async function updateSignature(
  id: string,
  updates: UpdateSignatureInput,
): Promise<StoredSignature> {
  // Verify the signature exists before updating
  const existing = await getSignatureById(id);
  if (!existing) {
    throw new SignatureNotFoundError(id);
  }

  // Build SET clauses dynamically from provided fields
  const setClauses: string[] = [];
  const params: (string | number | null)[] = [];

  if (updates.label !== undefined) {
    setClauses.push('label = ?');
    params.push(updates.label);
  }
  if (updates.imageUri !== undefined) {
    setClauses.push('image_uri = ?');
    params.push(updates.imageUri);
  }
  if (updates.svgPath !== undefined) {
    setClauses.push('svg_path = ?');
    params.push(updates.svgPath);
  }
  if (updates.text !== undefined) {
    setClauses.push('text = ?');
    params.push(updates.text);
  }
  if (updates.fontFamily !== undefined) {
    setClauses.push('font_family = ?');
    params.push(updates.fontFamily);
  }
  if (updates.isDefault !== undefined) {
    setClauses.push('is_default = ?');
    params.push(updates.isDefault ? 1 : 0);
  }

  if (setClauses.length === 0) {
    // Nothing to update, return existing
    return existing;
  }

  // Add the WHERE param
  params.push(id);

  await withTransaction(async () => {
    // If setting as default, unset any existing default for this profile
    if (updates.isDefault === true) {
      await runQuery(
        'UPDATE signatures SET is_default = 0 WHERE profile_id = ? AND is_default = 1 AND id != ?',
        [existing.profileId, id],
      );
    }

    await runQuery(`UPDATE signatures SET ${setClauses.join(', ')} WHERE id = ?`, params);
  });

  const updated = await getSignatureById(id);
  if (!updated) {
    throw new SignatureServiceError('Failed to retrieve signature after update');
  }
  return updated;
}

/**
 * Set a signature as the default for its profile.
 *
 * Convenience wrapper around `updateSignature` that toggles the default flag.
 *
 * @param id - The signature UUID to set as default.
 * @returns The updated signature.
 * @throws {SignatureNotFoundError} If the signature does not exist.
 */
export async function setDefaultSignature(id: string): Promise<StoredSignature> {
  return updateSignature(id, { isDefault: true });
}

/**
 * Delete a signature by ID.
 *
 * Also removes the associated image file from disk if it exists.
 *
 * @param id - The signature UUID to delete.
 * @throws {SignatureNotFoundError} If the signature does not exist.
 */
export async function deleteSignature(id: string): Promise<void> {
  const existing = await getSignatureById(id);
  if (!existing) {
    throw new SignatureNotFoundError(id);
  }

  // Clean up the image file if it exists on disk
  if (existing.imageUri) {
    try {
      if (fileExists(existing.imageUri)) {
        deleteFile(existing.imageUri);
      }
    } catch {
      // Log but don't fail the delete if file cleanup fails
      // The DB record is the source of truth
    }
  }

  await runQuery('DELETE FROM signatures WHERE id = ?', [id]);
}

/**
 * Delete all signatures for a profile.
 *
 * Cleans up image files for each signature before removing the DB records.
 *
 * @param profileId - The profile UUID whose signatures should be deleted.
 * @returns The number of signatures deleted.
 */
export async function deleteSignaturesByProfile(profileId: string): Promise<number> {
  // Fetch all signatures first to clean up files
  const signatures = await getSignaturesByProfile(profileId);

  // Clean up image files
  for (const sig of signatures) {
    if (sig.imageUri) {
      try {
        if (fileExists(sig.imageUri)) {
          deleteFile(sig.imageUri);
        }
      } catch {
        // Continue cleanup even if individual file deletes fail
      }
    }
  }

  const result = await runQuery('DELETE FROM signatures WHERE profile_id = ?', [profileId]);
  return result.changes;
}
