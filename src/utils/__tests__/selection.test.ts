import { describe, it, expect } from 'vitest';
import {
  colIndexToLetter,
  letterToColIndex,
  coordToA1,
  a1ToCoord,
  getRangeBounds,
  isCellInRange,
  getCellsInRange,
  formatRangeSize,
} from '../selection';

describe('colIndexToLetter', () => {
  it('converts 0 to A', () => expect(colIndexToLetter(0)).toBe('A'));
  it('converts 25 to Z', () => expect(colIndexToLetter(25)).toBe('Z'));
  it('converts 26 to AA', () => expect(colIndexToLetter(26)).toBe('AA'));
  it('converts 701 to ZZ', () => expect(colIndexToLetter(701)).toBe('ZZ'));
  it('converts 702 to AAA', () => expect(colIndexToLetter(702)).toBe('AAA'));
});

describe('letterToColIndex', () => {
  it('converts A to 0', () => expect(letterToColIndex('A')).toBe(0));
  it('converts Z to 25', () => expect(letterToColIndex('Z')).toBe(25));
  it('converts AA to 26', () => expect(letterToColIndex('AA')).toBe(26));
});

describe('coordToA1', () => {
  it('converts {0,0} to A1', () => expect(coordToA1({ row: 0, col: 0 })).toBe('A1'));
  it('converts {9,2} to C10', () => expect(coordToA1({ row: 9, col: 2 })).toBe('C10'));
});

describe('a1ToCoord', () => {
  it('converts A1 to {0,0}', () => expect(a1ToCoord('A1')).toEqual({ row: 0, col: 0 }));
  it('converts C10 to {9,2}', () => expect(a1ToCoord('C10')).toEqual({ row: 9, col: 2 }));
  it('returns null for invalid', () => expect(a1ToCoord('')).toBeNull());
  it('returns null for numbers only', () => expect(a1ToCoord('123')).toBeNull());
});

describe('getRangeBounds', () => {
  it('returns correct bounds for forward range', () => {
    const bounds = getRangeBounds({ start: { row: 0, col: 0 }, end: { row: 2, col: 3 } });
    expect(bounds).toEqual({ minRow: 0, maxRow: 2, minCol: 0, maxCol: 3 });
  });

  it('handles reversed start/end', () => {
    const bounds = getRangeBounds({ start: { row: 5, col: 5 }, end: { row: 1, col: 1 } });
    expect(bounds.minRow).toBe(1);
    expect(bounds.maxRow).toBe(5);
  });
});

describe('isCellInRange', () => {
  const range = { start: { row: 1, col: 1 }, end: { row: 3, col: 3 } };

  it('returns true for cell inside', () => {
    expect(isCellInRange({ row: 2, col: 2 }, range)).toBe(true);
  });

  it('returns true for cell on boundary', () => {
    expect(isCellInRange({ row: 1, col: 1 }, range)).toBe(true);
    expect(isCellInRange({ row: 3, col: 3 }, range)).toBe(true);
  });

  it('returns false for cell outside', () => {
    expect(isCellInRange({ row: 0, col: 0 }, range)).toBe(false);
    expect(isCellInRange({ row: 4, col: 4 }, range)).toBe(false);
  });
});

describe('getCellsInRange', () => {
  it('returns all cells in a 2x2 range', () => {
    const cells = getCellsInRange({ start: { row: 0, col: 0 }, end: { row: 1, col: 1 } });
    expect(cells.length).toBe(4);
    expect(cells).toContainEqual({ row: 0, col: 0 });
    expect(cells).toContainEqual({ row: 0, col: 1 });
    expect(cells).toContainEqual({ row: 1, col: 0 });
    expect(cells).toContainEqual({ row: 1, col: 1 });
  });

  it('returns single cell for 1x1 range', () => {
    const cells = getCellsInRange({ start: { row: 5, col: 5 }, end: { row: 5, col: 5 } });
    expect(cells.length).toBe(1);
  });
});

describe('formatRangeSize', () => {
  it('formats single cell', () => {
    expect(formatRangeSize({ start: { row: 0, col: 0 }, end: { row: 0, col: 0 } })).toBe('1 cell');
  });

  it('formats multi-cell range', () => {
    expect(formatRangeSize({ start: { row: 0, col: 0 }, end: { row: 2, col: 3 } })).toBe('3x4');
  });
});
