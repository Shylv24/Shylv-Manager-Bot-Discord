// ─── Chapter Parser ─── Shylv Manager Bot ───
//
// Parses various chapter input formats into an array of chapter numbers.
// Supported formats:
//   "13"           → [13]
//   "1-5"          → [1, 2, 3, 4, 5]
//   "1,3,6"        → [1, 3, 6]
//   "1-3,6,8-10"   → [1, 2, 3, 6, 8, 9, 10]
//

export interface ParseResult {
  success: true;
  chapters: number[];
}

export interface ParseError {
  success: false;
  error: string;
}

export type ChapterParseResult = ParseResult | ParseError;

/**
 * Parse a chapter input string into a sorted, deduplicated array of chapter numbers.
 *
 * @param input - Raw chapter string from user input
 * @returns ParseResult with chapters array, or ParseError with error message
 */
export function parseChapters(input: string): ChapterParseResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return { success: false, error: 'Chapter input cannot be empty.' };
  }

  const chapters: Set<number> = new Set();

  // Split by comma to handle mixed formats: "1-3,6,8-10"
  const parts = trimmed.split(',').map((p) => p.trim()).filter((p) => p.length > 0);

  if (parts.length === 0) {
    return { success: false, error: 'Chapter input cannot be empty.' };
  }

  for (const part of parts) {
    // Check if this part is a range (e.g., "1-5")
    if (part.includes('-')) {
      const rangeParts = part.split('-').map((r) => r.trim());

      if (rangeParts.length !== 2) {
        return { success: false, error: `Invalid range format: "${part}". Use format like "1-5".` };
      }

      const start = Number(rangeParts[0]);
      const end = Number(rangeParts[1]);

      if (!Number.isInteger(start) || !Number.isInteger(end)) {
        return { success: false, error: `Invalid numbers in range: "${part}". Chapter numbers must be whole numbers.` };
      }

      if (start <= 0 || end <= 0) {
        return { success: false, error: `Chapter numbers must be positive: "${part}".` };
      }

      if (start > end) {
        return { success: false, error: `Invalid range: "${part}". Start must be less than or equal to end.` };
      }

      // Safety limit: prevent extremely large ranges
      if (end - start > 100) {
        return { success: false, error: `Range too large: "${part}". Maximum 100 chapters per range.` };
      }

      for (let i = start; i <= end; i++) {
        chapters.add(i);
      }
    } else {
      // Single chapter number
      const num = Number(part);

      if (!Number.isInteger(num)) {
        return { success: false, error: `Invalid chapter number: "${part}". Must be a whole number.` };
      }

      if (num <= 0) {
        return { success: false, error: `Chapter numbers must be positive: "${part}".` };
      }

      chapters.add(num);
    }
  }

  if (chapters.size === 0) {
    return { success: false, error: 'No valid chapter numbers found.' };
  }

  // Return sorted, deduplicated array
  const sorted = Array.from(chapters).sort((a, b) => a - b);
  return { success: true, chapters: sorted };
}

/**
 * Format chapter numbers for display.
 * Collapses consecutive numbers into ranges.
 *
 * [1, 2, 3, 6, 8, 9, 10] → "1-3, 6, 8-10"
 */
export function formatChapters(chapters: number[]): string {
  if (chapters.length === 0) return '-';
  if (chapters.length === 1) return String(chapters[0]);

  const sorted = [...chapters].sort((a, b) => a - b);
  const ranges: string[] = [];
  let rangeStart = sorted[0];
  let rangeEnd = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === rangeEnd + 1) {
      rangeEnd = sorted[i];
    } else {
      ranges.push(rangeStart === rangeEnd ? String(rangeStart) : `${rangeStart}-${rangeEnd}`);
      rangeStart = sorted[i];
      rangeEnd = sorted[i];
    }
  }

  ranges.push(rangeStart === rangeEnd ? String(rangeStart) : `${rangeStart}-${rangeEnd}`);
  return ranges.join(', ');
}
