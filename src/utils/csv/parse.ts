/**
 * CSV parsing utilities.
 */

import type { CsvData } from './types';

/**
 * Detect the delimiter used in a CSV string.
 */
export function detectDelimiter(content: string): string {
  // Sample up to 5 non-empty lines for more robust detection
  const lines = content.split('\n').filter((line) => line.trim() !== '');
  const sampleLines = lines.slice(0, 5);

  if (sampleLines.length === 0) return ',';

  const delimiters = [',', ';', '\t'];
  let maxCount = 0;
  let detectedDelimiter = ',';

  for (const delimiter of delimiters) {
    let totalCount = 0;
    for (const line of sampleLines) {
      totalCount += line.split(delimiter).length;
    }
    if (totalCount > maxCount) {
      maxCount = totalCount;
      detectedDelimiter = delimiter;
    }
  }

  return detectedDelimiter;
}

/**
 * Parse CSV content into a 2D array.
 */
export function parseCsv(content: string, delimiter?: string): CsvData {
  if (!content.trim()) {
    // Empty file - return default grid
    const emptyGrid = Array(20)
      .fill(null)
      .map(() => Array(10).fill(''));
    return {
      data: emptyGrid,
      rowCount: 20,
      colCount: 10,
    };
  }

  // Strip UTF-8 BOM if present
  const cleanContent = content.startsWith('\uFEFF') ? content.slice(1) : content;

  const delim = delimiter || detectDelimiter(cleanContent);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  let maxCols = 0;

  for (let i = 0; i < cleanContent.length; i++) {
    const char = cleanContent[i];
    const nextChar = cleanContent[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        currentCell += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        // End of quoted field
        inQuotes = false;
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true;
      } else if (char === delim) {
        // End of cell
        currentRow.push(currentCell);
        currentCell = '';
      } else if (char === '\n') {
        // End of row
        currentRow.push(currentCell);
        rows.push(currentRow);
        maxCols = Math.max(maxCols, currentRow.length);
        currentRow = [];
        currentCell = '';
      } else if (char === '\r') {
        // Ignore carriage returns
        continue;
      } else {
        currentCell += char;
      }
    }
  }

  // Handle last cell/row
  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
    maxCols = Math.max(maxCols, currentRow.length);
  }

  // Normalize ragged rows
  const normalizedRows = rows.map((row) => {
    while (row.length < maxCols) {
      row.push('');
    }
    return row;
  });

  // Trim trailing completely empty rows
  while (normalizedRows.length > 0) {
    const lastRow = normalizedRows[normalizedRows.length - 1];
    if (lastRow.every((cell) => cell === '')) {
      normalizedRows.pop();
    } else {
      break;
    }
  }

  // Ensure minimum grid size
  const finalRows =
    normalizedRows.length > 0
      ? normalizedRows
      : Array(20)
          .fill(null)
          .map(() => Array(10).fill(''));
  const finalCols = maxCols > 0 ? maxCols : 10;

  return {
    data: finalRows,
    rowCount: finalRows.length,
    colCount: finalCols,
  };
}
