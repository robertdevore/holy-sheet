/**
 * Fill utilities for grid selection operations.
 */

/**
 * Create fill-down data: copies first row of the source range through all rows.
 */
export function fillDown(sourceData: string[][], minRow: number, maxRow: number, minCol: number, maxCol: number): string[][] {
  const firstRowValues: string[] = [];
  for (let col = minCol; col <= maxCol; col++) {
    firstRowValues.push(sourceData[minRow]?.[col] || '');
  }

  const fillRows: string[][] = [];
  for (let row = minRow; row <= maxRow; row++) {
    fillRows.push(firstRowValues.slice());
  }

  return fillRows;
}

/**
 * Create fill-right data: copies leftmost column of the source range through all columns.
 */
export function fillRight(sourceData: string[][], minRow: number, maxRow: number, minCol: number, maxCol: number): string[][] {
  const fillRows: string[][] = [];

  for (let row = minRow; row <= maxRow; row++) {
    const leftValue = sourceData[row]?.[minCol] || '';
    const values: string[] = [];
    for (let col = minCol; col <= maxCol; col++) {
      values.push(leftValue);
    }
    fillRows.push(values);
  }

  return fillRows;
}
