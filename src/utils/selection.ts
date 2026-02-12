/**
 * Coordinate and selection utilities for the grid
 */

export interface CellCoord {
  row: number;
  col: number;
}

export interface CellRange {
  start: CellCoord;
  end: CellCoord;
}

/**
 * Convert column index to letter (0 -> A, 25 -> Z, 26 -> AA, etc.)
 */
export function colIndexToLetter(index: number): string {
  let letter = '';
  let num = index;

  while (num >= 0) {
    letter = String.fromCharCode((num % 26) + 65) + letter;
    num = Math.floor(num / 26) - 1;
  }

  return letter;
}

/**
 * Convert letter to column index (A -> 0, Z -> 25, AA -> 26, etc.)
 */
export function letterToColIndex(letter: string): number {
  let index = 0;

  for (let i = 0; i < letter.length; i++) {
    index *= 26;
    index += letter.charCodeAt(i) - 65 + 1;
  }

  return index - 1;
}

/**
 * Convert cell coordinate to A1 notation (e.g., {row: 0, col: 0} -> "A1")
 */
export function coordToA1(coord: CellCoord): string {
  return `${colIndexToLetter(coord.col)}${coord.row + 1}`;
}

/**
 * Convert A1 notation to cell coordinate (e.g., "A1" -> {row: 0, col: 0})
 */
export function a1ToCoord(a1: string): CellCoord | null {
  const match = a1.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;

  const col = letterToColIndex(match[1]);
  const row = parseInt(match[2], 10) - 1;

  return { row, col };
}

/**
 * Get the bounding box of a cell range
 */
export function getRangeBounds(range: CellRange): {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
} {
  return {
    minRow: Math.min(range.start.row, range.end.row),
    maxRow: Math.max(range.start.row, range.end.row),
    minCol: Math.min(range.start.col, range.end.col),
    maxCol: Math.max(range.start.col, range.end.col),
  };
}

/**
 * Check if a cell is within a range
 */
export function isCellInRange(cell: CellCoord, range: CellRange): boolean {
  const bounds = getRangeBounds(range);
  return (
    cell.row >= bounds.minRow &&
    cell.row <= bounds.maxRow &&
    cell.col >= bounds.minCol &&
    cell.col <= bounds.maxCol
  );
}

/**
 * Get all cells in a range
 */
export function getCellsInRange(range: CellRange): CellCoord[] {
  const bounds = getRangeBounds(range);
  const cells: CellCoord[] = [];

  for (let row = bounds.minRow; row <= bounds.maxRow; row++) {
    for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
      cells.push({ row, col });
    }
  }

  return cells;
}

/**
 * Format range for display (e.g., "3x2 cells")
 */
export function formatRangeSize(range: CellRange): string {
  const bounds = getRangeBounds(range);
  const rows = bounds.maxRow - bounds.minRow + 1;
  const cols = bounds.maxCol - bounds.minCol + 1;

  if (rows === 1 && cols === 1) {
    return '1 cell';
  }

  return `${rows}x${cols}`;
}
