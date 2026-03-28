import { describe, it, expect } from 'vitest';
import {
  quantize,
  boxToToken,
  generateFingerprint,
  fingerprintFromOcrBlocks,
  type FingerprintInput,
  type LayoutBox,
} from '../services/fingerprint.js';

// ─── quantize ──────────────────────────────────────────────────────

describe('quantize', () => {
  it('should map 0 to 0', () => {
    expect(quantize(0)).toBe(0);
  });

  it('should map 1 to GRID_SIZE (50)', () => {
    expect(quantize(1)).toBe(50);
  });

  it('should map 0.5 to 25', () => {
    expect(quantize(0.5)).toBe(25);
  });

  it('should round to nearest grid cell', () => {
    expect(quantize(0.01)).toBe(1); // 0.5 rounds to 1
    expect(quantize(0.02)).toBe(1);
    expect(quantize(0.03)).toBe(2); // 1.5 rounds to 2
  });

  it('should clamp values below 0', () => {
    expect(quantize(-0.1)).toBe(0);
    expect(quantize(-1)).toBe(0);
  });

  it('should clamp values above 1', () => {
    expect(quantize(1.1)).toBe(50);
    expect(quantize(2)).toBe(50);
  });
});

// ─── boxToToken ────────────────────────────────────────────────────

describe('boxToToken', () => {
  it('should produce quantized comma-separated token', () => {
    const box: LayoutBox = { x: 0.1, y: 0.2, width: 0.3, height: 0.05 };
    const token = boxToToken(box);
    // 0.1*50=5, 0.2*50=10, 0.3*50=15, 0.05*50=2.5→3
    expect(token).toBe('5,10,15,3');
  });

  it('should produce same token for slightly different positions within same grid cell', () => {
    const box1: LayoutBox = { x: 0.1, y: 0.2, width: 0.3, height: 0.06 };
    const box2: LayoutBox = { x: 0.104, y: 0.198, width: 0.302, height: 0.058 };
    expect(boxToToken(box1)).toBe(boxToToken(box2));
  });

  it('should produce different tokens for significantly different positions', () => {
    const box1: LayoutBox = { x: 0.1, y: 0.2, width: 0.3, height: 0.05 };
    const box2: LayoutBox = { x: 0.5, y: 0.8, width: 0.3, height: 0.05 };
    expect(boxToToken(box1)).not.toBe(boxToToken(box2));
  });
});

// ─── generateFingerprint ───────────────────────────────────────────

describe('generateFingerprint', () => {
  const sampleInput: FingerprintInput = {
    pageCount: 2,
    pages: [
      {
        pageNumber: 1,
        boxes: [
          { x: 0.1, y: 0.1, width: 0.3, height: 0.04 },
          { x: 0.1, y: 0.2, width: 0.3, height: 0.04 },
          { x: 0.5, y: 0.1, width: 0.3, height: 0.04 },
        ],
      },
      {
        pageNumber: 2,
        boxes: [{ x: 0.1, y: 0.1, width: 0.4, height: 0.05 }],
      },
    ],
  };

  it('should return a 64-character hex SHA-256 hash', () => {
    const result = generateFingerprint(sampleInput);
    expect(result.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should return the correct box count', () => {
    const result = generateFingerprint(sampleInput);
    expect(result.boxCount).toBe(4);
  });

  it('should produce identical fingerprints for identical layouts', () => {
    const r1 = generateFingerprint(sampleInput);
    const r2 = generateFingerprint(sampleInput);
    expect(r1.hash).toBe(r2.hash);
  });

  it('should produce identical fingerprints regardless of box order', () => {
    const input1: FingerprintInput = {
      pageCount: 1,
      pages: [
        {
          pageNumber: 1,
          boxes: [
            { x: 0.1, y: 0.1, width: 0.3, height: 0.04 },
            { x: 0.5, y: 0.5, width: 0.2, height: 0.06 },
          ],
        },
      ],
    };
    const input2: FingerprintInput = {
      pageCount: 1,
      pages: [
        {
          pageNumber: 1,
          boxes: [
            { x: 0.5, y: 0.5, width: 0.2, height: 0.06 },
            { x: 0.1, y: 0.1, width: 0.3, height: 0.04 },
          ],
        },
      ],
    };
    expect(generateFingerprint(input1).hash).toBe(generateFingerprint(input2).hash);
  });

  it('should absorb minor scan variations (same template)', () => {
    const scan1: FingerprintInput = {
      pageCount: 1,
      pages: [
        {
          pageNumber: 1,
          boxes: [
            { x: 0.1, y: 0.2, width: 0.3, height: 0.06 },
            { x: 0.1, y: 0.4, width: 0.3, height: 0.06 },
          ],
        },
      ],
    };
    const scan2: FingerprintInput = {
      pageCount: 1,
      pages: [
        {
          pageNumber: 1,
          boxes: [
            { x: 0.104, y: 0.198, width: 0.302, height: 0.058 },
            { x: 0.098, y: 0.402, width: 0.298, height: 0.062 },
          ],
        },
      ],
    };
    expect(generateFingerprint(scan1).hash).toBe(generateFingerprint(scan2).hash);
  });

  it('should produce different fingerprints for different layouts', () => {
    const formA: FingerprintInput = {
      pageCount: 1,
      pages: [
        {
          pageNumber: 1,
          boxes: [
            { x: 0.1, y: 0.1, width: 0.3, height: 0.04 },
            { x: 0.1, y: 0.2, width: 0.3, height: 0.04 },
          ],
        },
      ],
    };
    const formB: FingerprintInput = {
      pageCount: 1,
      pages: [
        {
          pageNumber: 1,
          boxes: [
            { x: 0.1, y: 0.1, width: 0.8, height: 0.04 },
            { x: 0.1, y: 0.5, width: 0.4, height: 0.1 },
            { x: 0.5, y: 0.5, width: 0.4, height: 0.1 },
          ],
        },
      ],
    };
    expect(generateFingerprint(formA).hash).not.toBe(generateFingerprint(formB).hash);
  });

  it('should produce different fingerprints for different page counts', () => {
    const onePage: FingerprintInput = {
      pageCount: 1,
      pages: [{ pageNumber: 1, boxes: [{ x: 0.1, y: 0.1, width: 0.3, height: 0.04 }] }],
    };
    const twoPages: FingerprintInput = {
      pageCount: 2,
      pages: [{ pageNumber: 1, boxes: [{ x: 0.1, y: 0.1, width: 0.3, height: 0.04 }] }],
    };
    expect(generateFingerprint(onePage).hash).not.toBe(generateFingerprint(twoPages).hash);
  });

  it('should deduplicate identical boxes on the same page', () => {
    const withDupes: FingerprintInput = {
      pageCount: 1,
      pages: [
        {
          pageNumber: 1,
          boxes: [
            { x: 0.1, y: 0.1, width: 0.3, height: 0.04 },
            { x: 0.1, y: 0.1, width: 0.3, height: 0.04 },
          ],
        },
      ],
    };
    const result = generateFingerprint(withDupes);
    expect(result.boxCount).toBe(1); // deduped
  });

  it('should handle empty pages gracefully', () => {
    const empty: FingerprintInput = {
      pageCount: 1,
      pages: [{ pageNumber: 1, boxes: [] }],
    };
    const result = generateFingerprint(empty);
    expect(result.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.boxCount).toBe(0);
  });

  it('should handle no pages gracefully', () => {
    const noPages: FingerprintInput = { pageCount: 0, pages: [] };
    const result = generateFingerprint(noPages);
    expect(result.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.boxCount).toBe(0);
  });
});

// ─── fingerprintFromOcrBlocks ──────────────────────────────────────

describe('fingerprintFromOcrBlocks', () => {
  it('should extract bounds from OCR blocks and fingerprint', () => {
    const result = fingerprintFromOcrBlocks([
      {
        pageNumber: 1,
        ocrBlocks: [
          { bounds: { x: 0.1, y: 0.1, width: 0.3, height: 0.04 } },
          { bounds: { x: 0.1, y: 0.2, width: 0.3, height: 0.04 } },
        ],
      },
    ]);
    expect(result.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.boxCount).toBe(2);
  });

  it('should produce same result as generateFingerprint with equivalent input', () => {
    const ocrResult = fingerprintFromOcrBlocks([
      {
        pageNumber: 1,
        ocrBlocks: [{ bounds: { x: 0.5, y: 0.5, width: 0.2, height: 0.06 } }],
      },
    ]);
    const directResult = generateFingerprint({
      pageCount: 1,
      pages: [
        {
          pageNumber: 1,
          boxes: [{ x: 0.5, y: 0.5, width: 0.2, height: 0.06 }],
        },
      ],
    });
    expect(ocrResult.hash).toBe(directResult.hash);
  });
});
