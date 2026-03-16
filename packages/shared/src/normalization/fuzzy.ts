/**
 * Fuzzy matching utilities for field label normalization.
 *
 * Implements Levenshtein distance, token overlap, and combined scoring
 * to match OCR-detected labels against the dictionary when exact matches fail.
 */

/**
 * Compute the Levenshtein edit distance between two strings.
 * Uses the Wagner-Fischer dynamic programming algorithm.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // Early exits
  if (m === 0) return n;
  if (n === 0) return m;

  // Use single-row optimization for space efficiency
  let previousRow = new Array<number>(n + 1);
  let currentRow = new Array<number>(n + 1);

  for (let j = 0; j <= n; j++) {
    previousRow[j] = j;
  }

  for (let i = 1; i <= m; i++) {
    currentRow[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currentRow[j] = Math.min(
        (currentRow[j - 1] ?? 0) + 1, // insertion
        (previousRow[j] ?? 0) + 1, // deletion
        (previousRow[j - 1] ?? 0) + cost, // substitution
      );
    }
    // Swap rows
    [previousRow, currentRow] = [currentRow, previousRow];
  }

  return previousRow[n] ?? 0;
}

/**
 * Compute normalized Levenshtein similarity (0 to 1).
 * 1 = identical, 0 = completely different.
 */
export function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

/**
 * Compute token overlap score between two label strings.
 * Splits on whitespace and compares word sets.
 * Returns a score from 0 to 1 based on shared tokens.
 */
export function tokenOverlap(a: string, b: string): number {
  const tokensA = new Set(a.split(/\s+/).filter(Boolean));
  const tokensB = new Set(b.split(/\s+/).filter(Boolean));

  if (tokensA.size === 0 && tokensB.size === 0) return 1;
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      intersection++;
    }
  }

  // Dice coefficient: 2 * |intersection| / (|A| + |B|)
  return (2 * intersection) / (tokensA.size + tokensB.size);
}

/**
 * Compute a combined fuzzy match score using weighted Levenshtein
 * similarity and token overlap.
 *
 * Weights: 60% Levenshtein, 40% token overlap.
 * This balances character-level typo tolerance with word-level matching.
 */
export function combinedScore(a: string, b: string): number {
  const LEVENSHTEIN_WEIGHT = 0.6;
  const TOKEN_WEIGHT = 0.4;

  const levScore = levenshteinSimilarity(a, b);
  const tokenScore = tokenOverlap(a, b);

  return LEVENSHTEIN_WEIGHT * levScore + TOKEN_WEIGHT * tokenScore;
}

/**
 * Result of a fuzzy search against the dictionary.
 */
export interface FuzzyMatchResult {
  /** The dictionary key that matched best. */
  dictionaryLabel: string;
  /** The combined similarity score (0 to 1). */
  score: number;
}

/**
 * Find the best fuzzy match for a label from a set of dictionary keys.
 * Returns the best match and its score, or null if nothing scores
 * above the minimum threshold.
 *
 * @param label - The normalized label to match.
 * @param dictionaryKeys - All normalized labels in the dictionary.
 * @param minScore - Minimum score threshold (default 0.55).
 */
export function findBestFuzzyMatch(
  label: string,
  dictionaryKeys: string[],
  minScore = 0.55,
): FuzzyMatchResult | null {
  let bestMatch: FuzzyMatchResult | null = null;

  for (const key of dictionaryKeys) {
    const score = combinedScore(label, key);
    if (score >= minScore && (bestMatch === null || score > bestMatch.score)) {
      bestMatch = { dictionaryLabel: key, score };
    }
  }

  return bestMatch;
}
