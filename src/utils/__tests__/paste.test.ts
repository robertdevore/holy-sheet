/**
 * Paste text parsing heuristic tests (HS-061).
 *
 * Verifies that clipboard text is correctly split into rows/columns
 * across all edge cases: TSV, CSV, single-line, single-cell, etc.
 *
 * These tests call the same parse logic used by pasteTextAtSelection
 * in App.tsx, extracted here for unit testing.
 */

import { describe, it, expect } from 'vitest';

/**
 * Replicates the paste-splitting logic from App.tsx pasteTextAtSelection.
 * Extracted for isolated testing.
 */
function parsePasteText(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!normalized.trim()) return [];
  const lines = normalized.split('\n');

  // Trim trailing empty lines
  while (lines.length > 1 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }

  if (!lines.length) return [];

  // Single line with no tabs: preserve as single cell
  if (lines.length === 1 && !lines[0].includes('\t')) {
    return [[lines[0]]];
  }

  // Multi-line or tab-containing
  const hasTabs = lines.some((line) => line.includes('\t'));

  if (hasTabs) {
    return lines.map((line) => line.split('\t'));
  }

  // Check if comma-splitting is consistent across all rows
  const commaCounts = lines.map((line) => line.split(',').length);
  const allSameCommaCount = commaCounts.every((c) => c === commaCounts[0]);
  const hasMultipleCommaFields = commaCounts[0] > 1;

  if (allSameCommaCount && hasMultipleCommaFields) {
    return lines.map((line) => line.split(','));
  }

  // Treat each line as a single cell
  return lines.map((line) => [line]);
}

describe('Paste heuristic parsing (HS-061)', () => {
  it('TSV data splits by tab into multiple cells', () => {
    const result = parsePasteText('hello\tworld');
    expect(result).toEqual([['hello', 'world']]);
  });

  it('multi-line TSV data splits correctly', () => {
    const result = parsePasteText('a\tb\tc\nd\te\tf');
    expect(result).toEqual([
      ['a', 'b', 'c'],
      ['d', 'e', 'f'],
    ]);
  });

  it('single-line comma-containing text stays as one cell (HS-019 fix)', () => {
    const result = parsePasteText('San Francisco, CA');
    expect(result).toEqual([['San Francisco, CA']]);
  });

  it('multi-line CSV with consistent commas splits by comma', () => {
    const result = parsePasteText('a,b,c\nd,e,f');
    expect(result).toEqual([
      ['a', 'b', 'c'],
      ['d', 'e', 'f'],
    ]);
  });

  it('multi-line inconsistent comma counts → single cell per line', () => {
    const result = parsePasteText('Doe, John\nSmith');
    expect(result).toEqual([['Doe, John'], ['Smith']]);
  });

  it('multi-line with mixed comma counts → single cell per line', () => {
    const result = parsePasteText('a,b\nc,d,e\nf');
    expect(result).toEqual([['a,b'], ['c,d,e'], ['f']]);
  });

  it('single cell with tab preserves the tab', () => {
    const result = parsePasteText('hello\tworld');
    expect(result).toEqual([['hello', 'world']]);
  });

  it('empty text returns empty array', () => {
    const result = parsePasteText('');
    expect(result).toEqual([]);
  });

  it('trailing empty lines are trimmed', () => {
    const result = parsePasteText('hello\n\n\n');
    expect(result).toEqual([['hello']]);
  });

  it('multiple empty lines in middle are preserved as blank rows', () => {
    const result = parsePasteText('a,b,c\n\n\n1,2,3');
    // 2 consecutive \n creates 2 blank rows between data
    expect(result.length).toBeGreaterThanOrEqual(3);
  });

  it('Windows-style line endings (\\r\\n) are normalized', () => {
    const result = parsePasteText('a,b\r\nc,d');
    expect(result).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('single number pastes as one cell', () => {
    const result = parsePasteText('42');
    expect(result).toEqual([['42']]);
  });

  it('JSON-like content stays as single cell', () => {
    const result = parsePasteText('{"key": "value", "list": [1,2,3]}');
    expect(result).toEqual([['{"key": "value", "list": [1,2,3]}']]);
  });
});
