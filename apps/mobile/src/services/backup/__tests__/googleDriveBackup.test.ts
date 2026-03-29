/**
 * Tests for Google Drive backup service.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────

vi.mock('expo-file-system', () => {
  class MockFile {
    uri: string;
    exists = true;
    constructor(base: string | MockFile, name?: string) {
      const baseUri = typeof base === 'string' ? base : base.uri;
      this.uri = name ? `${baseUri}/${name}` : baseUri;
    }
    text() {
      return '{"mock":"database"}';
    }
    write = vi.fn();
  }
  return {
    File: MockFile,
    Paths: { document: 'file:///documents', cache: 'file:///cache' },
  };
});

vi.mock('../../../utils/encryption', () => ({
  encrypt: vi.fn().mockResolvedValue('encrypted-data'),
  decrypt: vi.fn().mockResolvedValue('{"mock":"database"}'),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import {
  createBackup,
  restoreBackup,
  listBackups,
  deleteBackup,
  BackupError,
  type GoogleDriveConfig,
} from '../googleDriveBackup';

// ─── Helpers ──────────────────────────────────────────────────────

const config: GoogleDriveConfig = { accessToken: 'test-token' };

// ─── Tests ────────────────────────────────────────────────────────

describe('googleDriveBackup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listBackups', () => {
    it('should list backups from Drive', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            files: [
              {
                id: 'file-1',
                name: 'fillit-backup.enc',
                createdTime: '2026-03-29T00:00:00Z',
                size: '1024',
              },
            ],
          }),
      });

      const backups = await listBackups(config);

      expect(backups).toHaveLength(1);
      expect(backups[0]!.id).toBe('file-1');
      expect(backups[0]!.sizeBytes).toBe(1024);
    });

    it('should return empty array when no backups', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [] }),
      });

      const backups = await listBackups(config);
      expect(backups).toHaveLength(0);
    });

    it('should throw on API error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

      await expect(listBackups(config)).rejects.toThrow('Drive API error');
    });
  });

  describe('createBackup', () => {
    it('should create and upload an encrypted backup', async () => {
      // listBackups (no existing)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [] }),
      });
      // upload
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'new-backup-id' }),
      });

      const result = await createBackup(config);

      expect(result.success).toBe(true);
      expect(result.backupId).toBe('new-backup-id');
      expect(result.sizeBytes).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should delete existing backup before uploading', async () => {
      // listBackups (existing found)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            files: [
              {
                id: 'old-backup',
                name: 'fillit-backup.enc',
                createdTime: '2026-01-01',
                size: '500',
              },
            ],
          }),
      });
      // delete old
      mockFetch.mockResolvedValueOnce({ ok: true });
      // upload new
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'new-backup-id' }),
      });

      const result = await createBackup(config);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3); // list + delete + upload
    });
  });

  describe('restoreBackup', () => {
    it('should download and decrypt backup', async () => {
      // listBackups
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            files: [
              {
                id: 'backup-1',
                name: 'fillit-backup.enc',
                createdTime: '2026-03-29',
                size: '1024',
              },
            ],
          }),
      });
      // download
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('encrypted-data'),
      });

      const result = await restoreBackup(config);

      expect(result.success).toBe(true);
      expect(result.restoredAt).toBeDefined();
    });

    it('should throw when no backup exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [] }),
      });

      await expect(restoreBackup(config)).rejects.toThrow('No backup found');
    });
  });

  describe('deleteBackup', () => {
    it('should delete a backup by ID', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await deleteBackup(config, 'backup-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('backup-123'),
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  describe('BackupError', () => {
    it('should have correct name and code', () => {
      const error = new BackupError('test', 'TEST_CODE');
      expect(error.name).toBe('BackupError');
      expect(error.code).toBe('TEST_CODE');
    });
  });
});
