/**
 * Identity Document CRUD Service (S-18)
 *
 * Provides create, read, update, and delete operations for identity documents
 * with transparent AES-256-GCM encryption of sensitive fields (document
 * numbers and additional fields).
 *
 * Sensitive columns:
 *   - `encrypted_number`             — the document number (ID number, passport, etc.)
 *   - `additional_fields_encrypted`  — JSON blob of type-specific key/value pairs
 *
 * SA ID numbers (types `sa_id_book` and `sa_smart_id`) are validated using the
 * shared `@fillit/shared` validation utilities before persistence.
 */

import {
  type DocumentType,
  type IdentityDocument,
  isValidDocumentType,
  isValidSAIdNumber,
  requiresSAIdValidation,
} from '@fillit/shared';

import { encrypt, decrypt } from '../../utils/encryption';

import { getAll, getFirst, runQuery, withTransaction } from './database';

// ─── Error types ────────────────────────────────────────────────────

export class IdentityDocumentError extends Error {
  public readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'IdentityDocumentError';
    this.cause = cause;
  }
}

export class IdentityDocumentNotFoundError extends IdentityDocumentError {
  constructor(id: string) {
    super(`Identity document not found: ${id}`);
    this.name = 'IdentityDocumentNotFoundError';
  }
}

export class IdentityDocumentValidationError extends IdentityDocumentError {
  public readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = 'IdentityDocumentValidationError';
    this.field = field;
  }
}

// ─── Internal types ─────────────────────────────────────────────────

/** Shape of a row in the `identity_documents` table. */
interface IdentityDocumentRow {
  id: string;
  profile_id: string;
  type: string;
  label: string;
  encrypted_number: string;
  issue_date: string | null;
  expiry_date: string | null;
  issuing_authority: string | null;
  additional_fields_encrypted: string | null;
}

/** Input for creating a new identity document. */
export interface CreateIdentityDocumentInput {
  id: string;
  profileId: string;
  type: DocumentType;
  label: string;
  number: string;
  issueDate?: string;
  expiryDate?: string;
  issuingAuthority?: string;
  additionalFields?: Record<string, string>;
}

/** Input for updating an existing identity document. */
export interface UpdateIdentityDocumentInput {
  type?: DocumentType;
  label?: string;
  number?: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  issuingAuthority?: string | null;
  additionalFields?: Record<string, string>;
}

// ─── Validation ─────────────────────────────────────────────────────

/**
 * Validate a create/update payload. Throws `IdentityDocumentValidationError`
 * when a field is invalid.
 */
function validateDocumentInput(
  input: CreateIdentityDocumentInput | (UpdateIdentityDocumentInput & { type?: DocumentType }),
  isCreate: boolean,
): void {
  const asCreate = input as CreateIdentityDocumentInput;

  if (isCreate) {
    if (!asCreate.id || asCreate.id.trim().length === 0) {
      throw new IdentityDocumentValidationError('id', 'Document ID is required');
    }

    if (!asCreate.profileId || asCreate.profileId.trim().length === 0) {
      throw new IdentityDocumentValidationError('profileId', 'Profile ID is required');
    }
  }

  // Validate type if provided
  const type = isCreate ? asCreate.type : (input as UpdateIdentityDocumentInput).type;
  if (type !== undefined) {
    if (!isValidDocumentType(type)) {
      throw new IdentityDocumentValidationError('type', `Invalid document type: ${type}`);
    }
  }

  // Validate label if required
  if (isCreate) {
    if (!asCreate.label || asCreate.label.trim().length === 0) {
      throw new IdentityDocumentValidationError('label', 'Document label is required');
    }
  } else {
    const updateLabel = (input as UpdateIdentityDocumentInput).label;
    if (updateLabel !== undefined && updateLabel.trim().length === 0) {
      throw new IdentityDocumentValidationError('label', 'Document label cannot be empty');
    }
  }

  // Validate number
  const number = isCreate ? asCreate.number : (input as UpdateIdentityDocumentInput).number;
  if (isCreate && (!number || number.trim().length === 0)) {
    throw new IdentityDocumentValidationError('number', 'Document number is required');
  }

  // SA ID validation for sa_id_book and sa_smart_id
  if (type !== undefined && number !== undefined && number.trim().length > 0) {
    if (requiresSAIdValidation(type) && !isValidSAIdNumber(number)) {
      throw new IdentityDocumentValidationError(
        'number',
        'Invalid SA ID number: must be 13 digits and pass Luhn checksum',
      );
    }
  }
}

// ─── Row ↔ Domain mapping ───────────────────────────────────────────

/** Decrypt a DB row into an `IdentityDocument`. */
async function rowToIdentityDocument(row: IdentityDocumentRow): Promise<IdentityDocument> {
  const decryptedNumber = await decrypt(row.encrypted_number);

  let additionalFields: Record<string, string> = {};
  if (row.additional_fields_encrypted) {
    const decryptedJson = await decrypt(row.additional_fields_encrypted);
    additionalFields = JSON.parse(decryptedJson) as Record<string, string>;
  }

  return {
    id: row.id,
    type: row.type as DocumentType,
    label: row.label,
    number: decryptedNumber,
    ...(row.issue_date !== null && { issueDate: row.issue_date }),
    ...(row.expiry_date !== null && { expiryDate: row.expiry_date }),
    ...(row.issuing_authority !== null && { issuingAuthority: row.issuing_authority }),
    additionalFields,
  };
}

// ─── CRUD operations ────────────────────────────────────────────────

/**
 * Create a new identity document with encrypted sensitive fields.
 *
 * @param input - The document data including plaintext number and additional fields.
 * @returns The created identity document (with plaintext fields).
 * @throws {IdentityDocumentValidationError} If validation fails.
 * @throws {IdentityDocumentError} If the database operation fails.
 */
export async function createIdentityDocument(
  input: CreateIdentityDocumentInput,
): Promise<IdentityDocument> {
  validateDocumentInput(input, true);

  try {
    const encryptedNumber = await encrypt(input.number);

    let additionalFieldsEncrypted: string | null = null;
    if (input.additionalFields && Object.keys(input.additionalFields).length > 0) {
      additionalFieldsEncrypted = await encrypt(JSON.stringify(input.additionalFields));
    }

    await runQuery(
      `INSERT INTO identity_documents (id, profile_id, type, label, encrypted_number, issue_date, expiry_date, issuing_authority, additional_fields_encrypted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id,
        input.profileId,
        input.type,
        input.label,
        encryptedNumber,
        input.issueDate ?? null,
        input.expiryDate ?? null,
        input.issuingAuthority ?? null,
        additionalFieldsEncrypted,
      ],
    );

    return {
      id: input.id,
      type: input.type,
      label: input.label,
      number: input.number,
      ...(input.issueDate !== undefined && { issueDate: input.issueDate }),
      ...(input.expiryDate !== undefined && { expiryDate: input.expiryDate }),
      ...(input.issuingAuthority !== undefined && { issuingAuthority: input.issuingAuthority }),
      additionalFields: input.additionalFields ?? {},
    };
  } catch (error) {
    if (error instanceof IdentityDocumentError) {
      throw error;
    }
    throw new IdentityDocumentError('Failed to create identity document', error);
  }
}

/**
 * Retrieve a single identity document by ID, decrypting sensitive fields.
 *
 * @param id - The document UUID.
 * @returns The decrypted identity document, or `null` if not found.
 * @throws {IdentityDocumentError} If the query or decryption fails.
 */
export async function getIdentityDocumentById(id: string): Promise<IdentityDocument | null> {
  try {
    const row = await getFirst<IdentityDocumentRow>(
      'SELECT * FROM identity_documents WHERE id = ?',
      [id],
    );

    if (!row) {
      return null;
    }

    return await rowToIdentityDocument(row);
  } catch (error) {
    if (error instanceof IdentityDocumentError) {
      throw error;
    }
    throw new IdentityDocumentError(`Failed to get identity document: ${id}`, error);
  }
}

/**
 * List all identity documents for a given profile, decrypting sensitive fields.
 *
 * @param profileId - The parent profile UUID.
 * @returns An array of decrypted identity documents.
 * @throws {IdentityDocumentError} If the query or decryption fails.
 */
export async function getIdentityDocumentsByProfile(
  profileId: string,
): Promise<IdentityDocument[]> {
  try {
    const rows = await getAll<IdentityDocumentRow>(
      'SELECT * FROM identity_documents WHERE profile_id = ? ORDER BY label ASC',
      [profileId],
    );

    return await Promise.all(rows.map(rowToIdentityDocument));
  } catch (error) {
    if (error instanceof IdentityDocumentError) {
      throw error;
    }
    throw new IdentityDocumentError(
      `Failed to list identity documents for profile: ${profileId}`,
      error,
    );
  }
}

/**
 * Update an existing identity document, re-encrypting sensitive fields.
 *
 * Only the fields present in `input` are updated; omitted fields are left
 * unchanged. Pass `null` to clear optional fields.
 *
 * @param id - The document UUID.
 * @param input - The partial update payload.
 * @returns The full updated identity document.
 * @throws {IdentityDocumentNotFoundError} If the document does not exist.
 * @throws {IdentityDocumentValidationError} If validation fails.
 * @throws {IdentityDocumentError} If the operation fails.
 */
export async function updateIdentityDocument(
  id: string,
  input: UpdateIdentityDocumentInput,
): Promise<IdentityDocument> {
  // Fetch the existing document to merge with
  const existing = await getIdentityDocumentById(id);
  if (!existing) {
    throw new IdentityDocumentNotFoundError(id);
  }

  // When updating number, we need the resolved type for SA ID validation
  const resolvedType = input.type ?? existing.type;
  const resolvedNumber = input.number ?? existing.number;

  // Validate the resolved values
  if (input.number !== undefined && requiresSAIdValidation(resolvedType)) {
    if (!isValidSAIdNumber(resolvedNumber)) {
      throw new IdentityDocumentValidationError(
        'number',
        'Invalid SA ID number: must be 13 digits and pass Luhn checksum',
      );
    }
  }

  // Also validate if type changes to SA ID type and existing number needs check
  if (
    input.type !== undefined &&
    requiresSAIdValidation(input.type) &&
    input.number === undefined
  ) {
    if (!isValidSAIdNumber(existing.number)) {
      throw new IdentityDocumentValidationError(
        'number',
        'Existing document number is not a valid SA ID number for the new document type',
      );
    }
  }

  validateDocumentInput(input, false);

  try {
    const setClauses: string[] = [];
    const params: (string | null)[] = [];

    if (input.type !== undefined) {
      setClauses.push('type = ?');
      params.push(input.type);
    }

    if (input.label !== undefined) {
      setClauses.push('label = ?');
      params.push(input.label);
    }

    if (input.number !== undefined) {
      const encryptedNumber = await encrypt(input.number);
      setClauses.push('encrypted_number = ?');
      params.push(encryptedNumber);
    }

    if (input.issueDate !== undefined) {
      setClauses.push('issue_date = ?');
      params.push(input.issueDate);
    }

    if (input.expiryDate !== undefined) {
      setClauses.push('expiry_date = ?');
      params.push(input.expiryDate);
    }

    if (input.issuingAuthority !== undefined) {
      setClauses.push('issuing_authority = ?');
      params.push(input.issuingAuthority);
    }

    if (input.additionalFields !== undefined) {
      if (Object.keys(input.additionalFields).length > 0) {
        const encryptedFields = await encrypt(JSON.stringify(input.additionalFields));
        setClauses.push('additional_fields_encrypted = ?');
        params.push(encryptedFields);
      } else {
        setClauses.push('additional_fields_encrypted = ?');
        params.push(null);
      }
    }

    if (setClauses.length === 0) {
      // Nothing to update — return existing
      return existing;
    }

    params.push(id);

    await runQuery(`UPDATE identity_documents SET ${setClauses.join(', ')} WHERE id = ?`, params);

    // Re-read the updated document to ensure consistency
    const updated = await getIdentityDocumentById(id);
    if (!updated) {
      throw new IdentityDocumentError('Document disappeared after update');
    }
    return updated;
  } catch (error) {
    if (error instanceof IdentityDocumentError) {
      throw error;
    }
    throw new IdentityDocumentError(`Failed to update identity document: ${id}`, error);
  }
}

/**
 * Delete an identity document by ID.
 *
 * @param id - The document UUID.
 * @returns `true` if the document was deleted, `false` if it did not exist.
 * @throws {IdentityDocumentError} If the operation fails.
 */
export async function deleteIdentityDocument(id: string): Promise<boolean> {
  try {
    const result = await runQuery('DELETE FROM identity_documents WHERE id = ?', [id]);
    return result.changes > 0;
  } catch (error) {
    if (error instanceof IdentityDocumentError) {
      throw error;
    }
    throw new IdentityDocumentError(`Failed to delete identity document: ${id}`, error);
  }
}

/**
 * Delete all identity documents for a given profile.
 *
 * @param profileId - The parent profile UUID.
 * @returns The number of documents deleted.
 * @throws {IdentityDocumentError} If the operation fails.
 */
export async function deleteIdentityDocumentsByProfile(profileId: string): Promise<number> {
  try {
    const result = await runQuery('DELETE FROM identity_documents WHERE profile_id = ?', [
      profileId,
    ]);
    return result.changes;
  } catch (error) {
    if (error instanceof IdentityDocumentError) {
      throw error;
    }
    throw new IdentityDocumentError(
      `Failed to delete identity documents for profile: ${profileId}`,
      error,
    );
  }
}

/**
 * Count identity documents for a given profile.
 *
 * @param profileId - The parent profile UUID.
 * @returns The number of documents.
 */
export async function countIdentityDocuments(profileId: string): Promise<number> {
  try {
    const row = await getFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM identity_documents WHERE profile_id = ?',
      [profileId],
    );
    return row?.count ?? 0;
  } catch (error) {
    throw new IdentityDocumentError(
      `Failed to count identity documents for profile: ${profileId}`,
      error,
    );
  }
}

/**
 * Batch-create multiple identity documents inside a single transaction.
 *
 * If any document fails validation or encryption, the entire batch is
 * rolled back.
 *
 * @param inputs - An array of document creation inputs.
 * @returns The created documents with plaintext fields.
 * @throws {IdentityDocumentValidationError} If any document fails validation.
 * @throws {IdentityDocumentError} If the operation fails.
 */
export async function createIdentityDocumentsBatch(
  inputs: CreateIdentityDocumentInput[],
): Promise<IdentityDocument[]> {
  // Validate all inputs before starting the transaction
  for (const input of inputs) {
    validateDocumentInput(input, true);
  }

  const results: IdentityDocument[] = [];

  try {
    await withTransaction(async () => {
      for (const input of inputs) {
        const encryptedNumber = await encrypt(input.number);

        let additionalFieldsEncrypted: string | null = null;
        if (input.additionalFields && Object.keys(input.additionalFields).length > 0) {
          additionalFieldsEncrypted = await encrypt(JSON.stringify(input.additionalFields));
        }

        await runQuery(
          `INSERT INTO identity_documents (id, profile_id, type, label, encrypted_number, issue_date, expiry_date, issuing_authority, additional_fields_encrypted)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            input.id,
            input.profileId,
            input.type,
            input.label,
            encryptedNumber,
            input.issueDate ?? null,
            input.expiryDate ?? null,
            input.issuingAuthority ?? null,
            additionalFieldsEncrypted,
          ],
        );

        results.push({
          id: input.id,
          type: input.type,
          label: input.label,
          number: input.number,
          ...(input.issueDate !== undefined && { issueDate: input.issueDate }),
          ...(input.expiryDate !== undefined && { expiryDate: input.expiryDate }),
          ...(input.issuingAuthority !== undefined && {
            issuingAuthority: input.issuingAuthority,
          }),
          additionalFields: input.additionalFields ?? {},
        });
      }
    });

    return results;
  } catch (error) {
    if (error instanceof IdentityDocumentError) {
      throw error;
    }
    throw new IdentityDocumentError('Failed to batch-create identity documents', error);
  }
}
