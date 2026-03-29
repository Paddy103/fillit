/**
 * Claude API service for document field detection.
 *
 * Uses the Anthropic SDK with vision + tool_use to analyze scanned
 * document images, detect fillable fields, and map them to profile
 * field paths. Structured output is enforced via a tool definition.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { DetectedFieldType } from '@fillit/shared';

// ─── Request / Response Types ──────────────────────────────────────

/** An OCR text block with its bounding box on the page. */
export interface OcrBlock {
  text: string;
  bounds: { x: number; y: number; width: number; height: number };
  confidence: number;
}

/** A single page sent for analysis. */
export interface AnalyzePage {
  pageNumber: number;
  /** Base64-encoded JPEG image data (no data URI prefix). */
  imageBase64: string;
  ocrBlocks: OcrBlock[];
}

/** Request payload for document analysis. */
export interface AnalyzeRequest {
  pages: AnalyzePage[];
  /** Profile field names available for matching. */
  availableFields: string[];
}

/** A detected field returned by Claude. */
export interface AnalyzedField {
  id: string;
  pageNumber: number;
  label: string;
  fieldType: DetectedFieldType;
  bounds: { x: number; y: number; width: number; height: number };
  matchedField: string | null;
  matchConfidence: number;
  notes?: string;
}

/** Response from Claude's field detection. */
export interface AnalyzeResponse {
  fields: AnalyzedField[];
  documentType?: string;
  documentLanguage?: string;
}

// ─── System Prompt ─────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a document field detection and matching assistant. You analyze scanned documents to identify fillable form fields and map them to a user's profile data structure.

Your task:
1. Examine each page image and the OCR text with bounding boxes
2. Identify all fillable fields (text inputs, date fields, checkboxes, signature lines, initial lines)
3. For each field, determine what information it expects
4. Map each field to the most appropriate profile field path from the provided schema

Rules:
- A "fillable field" is any blank space, line, box, or area where a person would write/enter information
- Use the OCR text and visual layout together — labels are usually adjacent to their fields
- Distinguish between pre-printed text (not fillable) and blank areas (fillable)
- For checkboxes, identify what each option represents
- For signature/initial fields, mark them as type "signature" or "initial"
- Return confidence scores (0.0-1.0) for each mapping
- If a field doesn't match any profile field, set matchedField to null
- Be aware of South African document conventions (SA ID numbers, provinces, etc.)
- Generate a unique id for each field (e.g. "field-1", "field-2")`;

// ─── Tool Definition ───────────────────────────────────────────────

const DETECT_FIELDS_TOOL: Anthropic.Tool = {
  name: 'report_detected_fields',
  description:
    'Report all detected fillable fields and their profile mappings for the analyzed document.',
  input_schema: {
    type: 'object' as const,
    properties: {
      fields: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Unique field identifier' },
            pageNumber: { type: 'number', description: 'Page number (1-based)' },
            label: { type: 'string', description: 'Field label text' },
            fieldType: {
              type: 'string',
              enum: ['text', 'date', 'checkbox', 'signature', 'initial', 'number'],
              description: 'Type of field',
            },
            bounds: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                width: { type: 'number' },
                height: { type: 'number' },
              },
              required: ['x', 'y', 'width', 'height'],
            },
            matchedField: {
              type: ['string', 'null'],
              description: 'Profile field path or null if no match',
            },
            matchConfidence: {
              type: 'number',
              description: 'Confidence score 0.0-1.0',
            },
            notes: {
              type: 'string',
              description: 'Optional reasoning notes',
            },
          },
          required: [
            'id',
            'pageNumber',
            'label',
            'fieldType',
            'bounds',
            'matchedField',
            'matchConfidence',
          ],
        },
      },
      documentType: {
        type: 'string',
        description: 'Detected document type (e.g. "medical form", "tax return")',
      },
      documentLanguage: {
        type: 'string',
        description: 'Document language (e.g. "English", "Afrikaans", "bilingual")',
      },
    },
    required: ['fields'],
  },
};

// ─── Helpers ───────────────────────────────────────────────────

/** Strip control characters and limit length of OCR text to prevent prompt injection. */
function sanitizeOcrText(text: string): string {
  return (
    text
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '') // strip control chars
      .slice(0, 500)
  ); // limit per-block length
}

// ─── Service ───────────────────────────────────────────────────────

export interface ClaudeServiceConfig {
  apiKey: string;
  /** Model to use. @default "claude-sonnet-4-20250514" */
  model?: string;
  /** Max tokens for the response. @default 4096 */
  maxTokens?: number;
  /** Max retry attempts on transient errors. @default 2 */
  maxRetries?: number;
}

export class ClaudeService {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;

  /** Running token usage counters. */
  private usage = { inputTokens: 0, outputTokens: 0, requests: 0 };

  constructor(config: ClaudeServiceConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
      maxRetries: config.maxRetries ?? 2,
    });
    this.model = config.model ?? 'claude-sonnet-4-20250514';
    this.maxTokens = config.maxTokens ?? 4096;
  }

  /**
   * Analyze document pages and detect fillable fields.
   *
   * Sends page images + OCR data to Claude with the field detection
   * tool, enforcing structured JSON output. Returns parsed fields
   * mapped to profile field paths.
   */
  async analyzeDocument(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    this.validateRequest(request);
    const userContent = this.buildUserMessage(request);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: SYSTEM_PROMPT,
      tools: [DETECT_FIELDS_TOOL],
      tool_choice: { type: 'tool', name: 'report_detected_fields' },
      messages: [{ role: 'user', content: userContent }],
    });

    // Track usage
    this.usage.inputTokens += response.usage.input_tokens;
    this.usage.outputTokens += response.usage.output_tokens;
    this.usage.requests += 1;

    return this.parseResponse(response);
  }

  /** Get cumulative token usage stats. */
  getUsage(): { inputTokens: number; outputTokens: number; requests: number } {
    return { ...this.usage };
  }

  /** Reset usage counters. */
  resetUsage(): void {
    this.usage = { inputTokens: 0, outputTokens: 0, requests: 0 };
  }

  // ─── Private ───────────────────────────────────────────────────

  private validateRequest(request: AnalyzeRequest): void {
    if (request.pages.length === 0) {
      throw new Error('At least one page is required');
    }
    if (request.pages.length > 20) {
      throw new Error('Maximum 20 pages per request');
    }
    for (const page of request.pages) {
      // ~10MB base64 limit per image
      if (page.imageBase64.length > 14_000_000) {
        throw new Error(`Page ${page.pageNumber}: image exceeds 10MB limit`);
      }
      if (page.ocrBlocks.length > 500) {
        throw new Error(`Page ${page.pageNumber}: maximum 500 OCR blocks per page`);
      }
    }
    // Validate field names — alphanumeric, dots, brackets, underscores only
    const fieldNamePattern = /^[\w.[\]]{1,100}$/;
    for (const field of request.availableFields) {
      if (!fieldNamePattern.test(field)) {
        throw new Error(`Invalid field name: ${field.slice(0, 50)}`);
      }
    }
  }

  private buildUserMessage(
    request: AnalyzeRequest,
  ): Array<Anthropic.ImageBlockParam | Anthropic.TextBlockParam> {
    const content: Array<Anthropic.ImageBlockParam | Anthropic.TextBlockParam> = [];

    // Add available fields context
    content.push({
      type: 'text',
      text: `<available_fields>\n${request.availableFields.join('\n')}\n</available_fields>\n\nAnalyze the following document pages:`,
    });

    // Add each page's image and OCR data
    for (const page of request.pages) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: page.imageBase64,
        },
      });

      if (page.ocrBlocks.length > 0) {
        const ocrText = page.ocrBlocks
          .map(
            (b) =>
              `"${sanitizeOcrText(b.text)}" at (${b.bounds.x.toFixed(3)}, ${b.bounds.y.toFixed(3)}, ${b.bounds.width.toFixed(3)}, ${b.bounds.height.toFixed(3)}) conf=${b.confidence.toFixed(2)}`,
          )
          .join('\n');

        content.push({
          type: 'text',
          text: `<ocr_blocks page="${page.pageNumber}">\n${ocrText}\n</ocr_blocks>`,
        });
      }
    }

    return content;
  }

  private parseResponse(response: Anthropic.Message): AnalyzeResponse {
    const toolBlock = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    );

    if (!toolBlock) {
      throw new Error('Claude did not return a tool_use response');
    }

    const input = toolBlock.input as Record<string, unknown>;
    const fields = (input.fields ?? []) as AnalyzedField[];

    return {
      fields,
      documentType: (input.documentType as string) ?? undefined,
      documentLanguage: (input.documentLanguage as string) ?? undefined,
    };
  }
}

// ─── Factory ───────────────────────────────────────────────────────

let instance: ClaudeService | null = null;

/**
 * Get or create the singleton ClaudeService instance.
 * Reads ANTHROPIC_API_KEY from environment.
 */
export function getClaudeService(): ClaudeService {
  if (!instance) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    instance = new ClaudeService({
      apiKey,
      model: process.env.CLAUDE_MODEL ?? undefined,
      maxTokens: process.env.CLAUDE_MAX_TOKENS
        ? parseInt(process.env.CLAUDE_MAX_TOKENS, 10)
        : undefined,
    });
  }
  return instance;
}

/** Reset the singleton (for testing). */
export function resetClaudeService(): void {
  instance = null;
}
