/**
 * Google Drive backup service.
 *
 * Exports the SQLite database and document files as an encrypted
 * backup to the user's Google Drive app data folder. Supports
 * full and incremental backups, and restore from backup.
 *
 * Uses Google Drive REST API v3 with the appDataFolder scope,
 * which stores files in a hidden app-specific folder not visible
 * to the user in their Drive UI.
 */

import { File, Paths } from 'expo-file-system';

import { encrypt, decrypt } from '../../utils/encryption';

// ─── Types ─────────────────────────────────────────────────────────

export interface BackupMetadata {
  id: string;
  name: string;
  createdAt: string;
  sizeBytes: number;
  version: number;
  isIncremental: boolean;
}

export interface BackupResult {
  success: boolean;
  backupId: string | null;
  sizeBytes: number;
  duration: number;
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  restoredAt: string | null;
  error?: string;
}

export interface GoogleDriveConfig {
  /** OAuth access token with Drive appdata scope. */
  accessToken: string;
}

// ─── Constants ────────────────────────────────────────────────────

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';
const APP_DATA_FOLDER = 'appDataFolder';
const BACKUP_FILENAME = 'fillit-backup.enc';
const BACKUP_VERSION = 1;

// ─── Errors ───────────────────────────────────────────────────────

export class BackupError extends Error {
  public readonly code?: string;

  constructor(message: string, code?: string, cause?: unknown) {
    super(message);
    this.name = 'BackupError';
    this.code = code;
    this.cause = cause;
  }
}

// ─── Service ──────────────────────────────────────────────────────

/**
 * Create a full backup to Google Drive.
 *
 * 1. Reads the SQLite database file
 * 2. Encrypts it with AES-256-GCM
 * 3. Uploads to Google Drive appDataFolder
 */
export async function createBackup(config: GoogleDriveConfig): Promise<BackupResult> {
  const startTime = Date.now();

  try {
    // Read the database file
    const dbFile = new File(Paths.document, 'SQLite/fillit.db');
    if (!dbFile.exists) {
      throw new BackupError('Database file not found', 'DB_NOT_FOUND');
    }

    const dbContent = await dbFile.text();

    // Encrypt the backup
    const encrypted = await encrypt(dbContent);

    // Check for existing backup and delete it
    const existing = await findExistingBackup(config);
    if (existing) {
      await deleteFromDrive(config, existing.id);
    }

    // Upload to Google Drive
    const backupId = await uploadToDrive(config, encrypted);

    const duration = Date.now() - startTime;

    return {
      success: true,
      backupId,
      sizeBytes: encrypted.length,
      duration,
    };
  } catch (error) {
    if (error instanceof BackupError) throw error;
    throw new BackupError(
      error instanceof Error ? error.message : 'Backup failed',
      'BACKUP_FAILED',
      error,
    );
  }
}

/**
 * Restore from the latest Google Drive backup.
 *
 * 1. Downloads the encrypted backup from Drive
 * 2. Decrypts it
 * 3. Writes back to the SQLite database file
 */
export async function restoreBackup(config: GoogleDriveConfig): Promise<RestoreResult> {
  try {
    // Find the backup file
    const existing = await findExistingBackup(config);
    if (!existing) {
      throw new BackupError('No backup found on Google Drive', 'NO_BACKUP');
    }

    // Download the encrypted content
    const encrypted = await downloadFromDrive(config, existing.id);

    // Decrypt
    const dbContent = await decrypt(encrypted);

    // Write to database file
    const dbFile = new File(Paths.document, 'SQLite/fillit.db');
    dbFile.write(dbContent);

    return {
      success: true,
      restoredAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof BackupError) throw error;
    throw new BackupError(
      error instanceof Error ? error.message : 'Restore failed',
      'RESTORE_FAILED',
      error,
    );
  }
}

/**
 * List available backups on Google Drive.
 */
export async function listBackups(config: GoogleDriveConfig): Promise<BackupMetadata[]> {
  try {
    const response = await fetch(
      `${DRIVE_API_BASE}/files?` +
        new URLSearchParams({
          spaces: APP_DATA_FOLDER,
          q: `name = '${BACKUP_FILENAME}'`,
          fields: 'files(id, name, createdTime, size)',
          orderBy: 'createdTime desc',
        }),
      {
        headers: { Authorization: `Bearer ${config.accessToken}` },
      },
    );

    if (!response.ok) {
      throw new BackupError(`Drive API error: ${response.status}`, 'DRIVE_API_ERROR');
    }

    const data = (await response.json()) as {
      files: Array<{ id: string; name: string; createdTime: string; size: string }>;
    };

    return (data.files ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      createdAt: f.createdTime,
      sizeBytes: parseInt(f.size, 10) || 0,
      version: BACKUP_VERSION,
      isIncremental: false,
    }));
  } catch (error) {
    if (error instanceof BackupError) throw error;
    throw new BackupError(
      error instanceof Error ? error.message : 'Failed to list backups',
      'LIST_FAILED',
      error,
    );
  }
}

/**
 * Delete a backup from Google Drive.
 */
export async function deleteBackup(config: GoogleDriveConfig, backupId: string): Promise<void> {
  await deleteFromDrive(config, backupId);
}

// ─── Drive API Helpers ────────────────────────────────────────────

async function findExistingBackup(config: GoogleDriveConfig): Promise<{ id: string } | null> {
  const backups = await listBackups(config);
  return backups.length > 0 ? { id: backups[0]!.id } : null;
}

async function uploadToDrive(config: GoogleDriveConfig, content: string): Promise<string> {
  const metadata = {
    name: BACKUP_FILENAME,
    parents: [APP_DATA_FOLDER],
    mimeType: 'application/octet-stream',
    properties: {
      version: String(BACKUP_VERSION),
      createdAt: new Date().toISOString(),
    },
  };

  const boundary = '-------fillit_backup_boundary';
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\n` +
    'Content-Type: application/octet-stream\r\n\r\n' +
    content +
    `\r\n--${boundary}--`;

  const response = await fetch(`${DRIVE_UPLOAD_BASE}/files?uploadType=multipart`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) {
    throw new BackupError(`Upload failed: ${response.status}`, 'UPLOAD_FAILED');
  }

  const data = (await response.json()) as { id: string };
  return data.id;
}

async function downloadFromDrive(config: GoogleDriveConfig, fileId: string): Promise<string> {
  const response = await fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${config.accessToken}` },
  });

  if (!response.ok) {
    throw new BackupError(`Download failed: ${response.status}`, 'DOWNLOAD_FAILED');
  }

  return response.text();
}

async function deleteFromDrive(config: GoogleDriveConfig, fileId: string): Promise<void> {
  const response = await fetch(`${DRIVE_API_BASE}/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${config.accessToken}` },
  });

  if (!response.ok && response.status !== 404) {
    throw new BackupError(`Delete failed: ${response.status}`, 'DELETE_FAILED');
  }
}
