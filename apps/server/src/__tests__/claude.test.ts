import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClaudeService, type AnalyzeRequest } from '../services/claude.js';

// ─── Mock Anthropic SDK ────────────────────────────────────────────

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate };
    constructor() {}
  },
}));

// ─── Helpers ───────────────────────────────────────────────────────

function makeRequest(overrides?: Partial<AnalyzeRequest>): AnalyzeRequest {
  return {
    pages: [
      {
        pageNumber: 1,
        imageBase64: 'dGVzdA==', // "test" in base64
        ocrBlocks: [
          {
            text: 'First Name',
            bounds: { x: 0.1, y: 0.2, width: 0.3, height: 0.05 },
            confidence: 0.95,
          },
        ],
      },
    ],
    availableFields: ['firstName', 'lastName', 'email', 'saIdNumber'],
    ...overrides,
  };
}

function makeToolResponse(fields: unknown[], extras?: Record<string, unknown>) {
  return {
    content: [
      {
        type: 'tool_use',
        id: 'tool-1',
        name: 'report_detected_fields',
        input: { fields, ...extras },
      },
    ],
    usage: { input_tokens: 500, output_tokens: 200 },
  };
}

// ─── Tests ─────────────────────────────────────────────────────────

describe('ClaudeService', () => {
  let service: ClaudeService;

  beforeEach(() => {
    mockCreate.mockReset();
    service = new ClaudeService({ apiKey: 'test-key' });
  });

  describe('analyzeDocument', () => {
    it('should call Anthropic API with correct structure', async () => {
      mockCreate.mockResolvedValue(
        makeToolResponse([
          {
            id: 'field-1',
            pageNumber: 1,
            label: 'First Name',
            fieldType: 'text',
            bounds: { x: 0.1, y: 0.25, width: 0.3, height: 0.04 },
            matchedField: 'firstName',
            matchConfidence: 0.92,
          },
        ]),
      );

      await service.analyzeDocument(makeRequest());

      expect(mockCreate).toHaveBeenCalledOnce();
      const callArgs = mockCreate.mock.calls[0]![0];
      expect(callArgs.system).toContain('document field detection');
      expect(callArgs.tools).toHaveLength(1);
      expect(callArgs.tools[0].name).toBe('report_detected_fields');
      expect(callArgs.tool_choice).toEqual({
        type: 'tool',
        name: 'report_detected_fields',
      });
    });

    it('should return parsed fields from tool_use response', async () => {
      const fields = [
        {
          id: 'field-1',
          pageNumber: 1,
          label: 'First Name',
          fieldType: 'text',
          bounds: { x: 0.1, y: 0.25, width: 0.3, height: 0.04 },
          matchedField: 'firstName',
          matchConfidence: 0.92,
        },
        {
          id: 'field-2',
          pageNumber: 1,
          label: 'Signature',
          fieldType: 'signature',
          bounds: { x: 0.1, y: 0.8, width: 0.5, height: 0.1 },
          matchedField: null,
          matchConfidence: 0,
        },
      ];

      mockCreate.mockResolvedValue(
        makeToolResponse(fields, {
          documentType: 'employment form',
          documentLanguage: 'English',
        }),
      );

      const result = await service.analyzeDocument(makeRequest());

      expect(result.fields).toHaveLength(2);
      expect(result.fields[0]!.label).toBe('First Name');
      expect(result.fields[0]!.matchedField).toBe('firstName');
      expect(result.fields[0]!.matchConfidence).toBe(0.92);
      expect(result.fields[1]!.fieldType).toBe('signature');
      expect(result.fields[1]!.matchedField).toBeNull();
      expect(result.documentType).toBe('employment form');
      expect(result.documentLanguage).toBe('English');
    });

    it('should include image blocks for each page', async () => {
      mockCreate.mockResolvedValue(makeToolResponse([]));

      await service.analyzeDocument(
        makeRequest({
          pages: [
            { pageNumber: 1, imageBase64: 'aW1hZ2Ux', ocrBlocks: [] },
            { pageNumber: 2, imageBase64: 'aW1hZ2Uy', ocrBlocks: [] },
          ],
        }),
      );

      const content = mockCreate.mock.calls[0]![0].messages[0].content;
      const imageBlocks = content.filter((b: { type: string }) => b.type === 'image');
      expect(imageBlocks).toHaveLength(2);
      expect(imageBlocks[0].source.data).toBe('aW1hZ2Ux');
      expect(imageBlocks[1].source.data).toBe('aW1hZ2Uy');
    });

    it('should include OCR blocks as text context', async () => {
      mockCreate.mockResolvedValue(makeToolResponse([]));

      await service.analyzeDocument(makeRequest());

      const content = mockCreate.mock.calls[0]![0].messages[0].content;
      const textBlocks = content.filter((b: { type: string }) => b.type === 'text');
      const ocrBlock = textBlocks.find((b: { text: string }) => b.text.includes('First Name'));
      expect(ocrBlock).toBeDefined();
      expect(ocrBlock.text).toContain('conf=0.95');
    });

    it('should include available fields in the prompt', async () => {
      mockCreate.mockResolvedValue(makeToolResponse([]));

      await service.analyzeDocument(makeRequest());

      const content = mockCreate.mock.calls[0]![0].messages[0].content;
      const fieldsBlock = content.find(
        (b: { type: string; text?: string }) =>
          b.type === 'text' && b.text?.includes('Available profile fields'),
      );
      expect(fieldsBlock).toBeDefined();
      expect(fieldsBlock.text).toContain('firstName');
      expect(fieldsBlock.text).toContain('saIdNumber');
    });

    it('should throw when Claude returns no tool_use block', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'I cannot process this.' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      await expect(service.analyzeDocument(makeRequest())).rejects.toThrow(
        'Claude did not return a tool_use response',
      );
    });

    it('should handle empty fields array', async () => {
      mockCreate.mockResolvedValue(makeToolResponse([]));

      const result = await service.analyzeDocument(makeRequest());
      expect(result.fields).toEqual([]);
    });

    it('should propagate API errors', async () => {
      mockCreate.mockRejectedValue(new Error('Rate limited'));

      await expect(service.analyzeDocument(makeRequest())).rejects.toThrow('Rate limited');
    });
  });

  describe('usage tracking', () => {
    it('should track token usage across requests', async () => {
      mockCreate.mockResolvedValue(makeToolResponse([]));

      await service.analyzeDocument(makeRequest());
      await service.analyzeDocument(makeRequest());

      const usage = service.getUsage();
      expect(usage.inputTokens).toBe(1000); // 500 * 2
      expect(usage.outputTokens).toBe(400); // 200 * 2
      expect(usage.requests).toBe(2);
    });

    it('should reset usage counters', async () => {
      mockCreate.mockResolvedValue(makeToolResponse([]));

      await service.analyzeDocument(makeRequest());
      service.resetUsage();

      const usage = service.getUsage();
      expect(usage.inputTokens).toBe(0);
      expect(usage.outputTokens).toBe(0);
      expect(usage.requests).toBe(0);
    });
  });

  describe('configuration', () => {
    it('should use default model when not specified', async () => {
      mockCreate.mockResolvedValue(makeToolResponse([]));
      await service.analyzeDocument(makeRequest());

      expect(mockCreate.mock.calls[0]![0].model).toBe('claude-sonnet-4-20250514');
    });

    it('should use custom model when specified', async () => {
      const customService = new ClaudeService({
        apiKey: 'test-key',
        model: 'claude-haiku-4-5-20251001',
      });
      mockCreate.mockResolvedValue(makeToolResponse([]));
      await customService.analyzeDocument(makeRequest());

      expect(mockCreate.mock.calls[0]![0].model).toBe('claude-haiku-4-5-20251001');
    });

    it('should use custom max tokens when specified', async () => {
      const customService = new ClaudeService({
        apiKey: 'test-key',
        maxTokens: 8192,
      });
      mockCreate.mockResolvedValue(makeToolResponse([]));
      await customService.analyzeDocument(makeRequest());

      expect(mockCreate.mock.calls[0]![0].max_tokens).toBe(8192);
    });
  });
});

// ─── Factory ───────────────────────────────────────────────────────

describe('getClaudeService', () => {
  it('should throw when ANTHROPIC_API_KEY is not set', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { getClaudeService, resetClaudeService } = await import('../services/claude.js');
    resetClaudeService();

    expect(() => getClaudeService()).toThrow('ANTHROPIC_API_KEY');
  });

  it('should return a ClaudeService instance when API key is set', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
    const { getClaudeService, resetClaudeService } = await import('../services/claude.js');
    resetClaudeService();

    const service = getClaudeService();
    expect(service).toBeInstanceOf(ClaudeService);
  });
});
