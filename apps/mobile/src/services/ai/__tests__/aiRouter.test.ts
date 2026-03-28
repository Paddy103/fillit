import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock network status
const mockIsOnline = vi.fn();
vi.mock('../networkStatus.js', () => ({
  isOnline: () => mockIsOnline(),
}));

// Mock API analyze
const mockAnalyzeDocument = vi.fn();
vi.mock('../../api/analyzeService.js', () => ({
  analyzeDocument: (...args: unknown[]) => mockAnalyzeDocument(...args),
}));

// Mock offline detection
const mockDetectFieldsOffline = vi.fn();
vi.mock('../offlineDetection.js', () => ({
  detectFieldsOffline: (...args: unknown[]) => mockDetectFieldsOffline(...args),
}));

import { detectFields, type AiRouterConfig } from '../aiRouter.js';
import { ApiClient } from '../../api/client.js';

describe('detectFields', () => {
  const mockClient = {} as ApiClient;
  const config: AiRouterConfig = {
    client: mockClient,
    availableFields: ['firstName', 'lastName'],
  };

  const pages = [
    {
      pageNumber: 1,
      imageBase64: 'dGVzdA==',
      ocrBlocks: [
        {
          text: 'First Name',
          bounds: { x: 0.1, y: 0.2, width: 0.3, height: 0.05 },
          confidence: 0.95,
        },
      ],
    },
  ];

  const cloudFields = [
    {
      id: 'field-1',
      pageNumber: 1,
      label: 'First Name',
      fieldType: 'text' as const,
      bounds: { x: 0.1, y: 0.25, width: 0.3, height: 0.04 },
      matchedField: 'firstName',
      matchConfidence: 0.92,
    },
  ];

  const offlineFields = [
    {
      id: 'offline-field-0',
      pageNumber: 1,
      label: 'First Name',
      fieldType: 'text' as const,
      bounds: { x: 0.1, y: 0.2, width: 0.3, height: 0.05 },
      matchedField: 'firstName',
      matchConfidence: 0.9,
      matchMethod: 'exact' as const,
    },
  ];

  beforeEach(() => {
    mockIsOnline.mockReset();
    mockAnalyzeDocument.mockReset();
    mockDetectFieldsOffline.mockReset();
  });

  it('should use cloud API when online', async () => {
    mockIsOnline.mockResolvedValue(true);
    mockAnalyzeDocument.mockResolvedValue({
      success: true,
      data: { fields: cloudFields, documentType: 'form' },
      meta: { cached: false, fingerprint: 'abc123', boxCount: 5 },
    });

    const result = await detectFields(config, pages);

    expect(result.method).toBe('cloud');
    expect(result.reducedAccuracy).toBe(false);
    expect(result.fields).toHaveLength(1);
    expect(result.fields[0]!.matchedField).toBe('firstName');
    expect(result.fingerprint).toBe('abc123');
    expect(mockAnalyzeDocument).toHaveBeenCalledOnce();
    expect(mockDetectFieldsOffline).not.toHaveBeenCalled();
  });

  it('should use offline detection when offline', async () => {
    mockIsOnline.mockResolvedValue(false);
    mockDetectFieldsOffline.mockReturnValue({
      fields: offlineFields,
      isOffline: true,
      reducedAccuracy: true,
    });

    const result = await detectFields(config, pages);

    expect(result.method).toBe('offline');
    expect(result.reducedAccuracy).toBe(true);
    expect(result.fields).toHaveLength(1);
    expect(mockAnalyzeDocument).not.toHaveBeenCalled();
    expect(mockDetectFieldsOffline).toHaveBeenCalledOnce();
  });

  it('should fall back to offline when cloud API fails', async () => {
    mockIsOnline.mockResolvedValue(true);
    mockAnalyzeDocument.mockRejectedValue(new Error('API timeout'));
    mockDetectFieldsOffline.mockReturnValue({
      fields: offlineFields,
      isOffline: true,
      reducedAccuracy: true,
    });

    const result = await detectFields(config, pages);

    expect(result.method).toBe('offline');
    expect(result.reducedAccuracy).toBe(true);
    expect(mockAnalyzeDocument).toHaveBeenCalledOnce();
    expect(mockDetectFieldsOffline).toHaveBeenCalledOnce();
  });

  it('should fall back to offline when network check fails', async () => {
    mockIsOnline.mockRejectedValue(new Error('NetInfo error'));
    mockDetectFieldsOffline.mockReturnValue({
      fields: [],
      isOffline: true,
      reducedAccuracy: true,
    });

    const result = await detectFields(config, pages);

    expect(result.method).toBe('offline');
    expect(result.reducedAccuracy).toBe(true);
  });

  it('should indicate cached result from cloud', async () => {
    mockIsOnline.mockResolvedValue(true);
    mockAnalyzeDocument.mockResolvedValue({
      success: true,
      data: { fields: cloudFields },
      meta: { cached: true, fingerprint: 'abc123', boxCount: 5 },
    });

    const result = await detectFields(config, pages);

    expect(result.cached).toBe(true);
    expect(result.method).toBe('cloud');
  });

  it('should respect forceMethod override', async () => {
    mockDetectFieldsOffline.mockReturnValue({
      fields: offlineFields,
      isOffline: true,
      reducedAccuracy: true,
    });

    const result = await detectFields({ ...config, forceMethod: 'offline' }, pages);

    expect(result.method).toBe('offline');
    expect(mockIsOnline).not.toHaveBeenCalled();
    expect(mockAnalyzeDocument).not.toHaveBeenCalled();
  });

  it('should force cloud method when specified', async () => {
    mockAnalyzeDocument.mockResolvedValue({
      success: true,
      data: { fields: cloudFields },
      meta: { cached: false, fingerprint: 'xyz', boxCount: 1 },
    });

    const result = await detectFields({ ...config, forceMethod: 'cloud' }, pages);

    expect(result.method).toBe('cloud');
    expect(mockIsOnline).not.toHaveBeenCalled();
  });
});
