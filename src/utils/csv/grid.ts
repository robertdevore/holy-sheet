/**
 * Grid creation and expansion utilities.
 */

/**
 * Create an empty grid with the given dimensions.
 */
export function createEmptyGrid(rows: number = 20, cols: number = 10): string[][] {
  return Array(rows)
    .fill(null)
    .map(() => Array(cols).fill(''));
}

/**
 * Expand grid to accommodate new dimensions.
 * Never shrinks — only grows or stays the same.
 */
export function expandGrid(data: string[][], newRows: number, newCols: number): string[][] {
  const currentRows = data.length;
  const currentCols = data[0]?.length || 0;

  // Clone existing data
  const expanded = data.map((row) => [...row]);

  // Expand columns in existing rows
  if (newCols > currentCols) {
    for (let i = 0; i < expanded.length; i++) {
      while (expanded[i].length < newCols) {
        expanded[i].push('');
      }
    }
  }

  // Add new rows
  if (newRows > currentRows) {
    const rowsToAdd = newRows - currentRows;
    for (let i = 0; i < rowsToAdd; i++) {
      expanded.push(Array(newCols).fill(''));
    }
  }

  return expanded;
}
