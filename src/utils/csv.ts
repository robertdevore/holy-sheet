/**
 * CSV parsing and serialization utilities
 */

export interface CsvData {
  data: string[][];
  rowCount: number;
  colCount: number;
}

/**
 * Detect the delimiter used in a CSV string
 */
export function detectDelimiter(content: string): string {
  const firstLine = content.split('\n')[0] || '';
  
  const delimiters = [',', ';', '\t'];
  let maxCount = 0;
  let detectedDelimiter = ',';

  for (const delimiter of delimiters) {
    const count = firstLine.split(delimiter).length;
    if (count > maxCount) {
      maxCount = count;
      detectedDelimiter = delimiter;
    }
  }

  return detectedDelimiter;
}

/**
 * Parse CSV content into a 2D array
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

  const delim = delimiter || detectDelimiter(content);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  let maxCols = 0;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

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
        if (currentRow.length > 0 && !(currentRow.length === 1 && currentRow[0] === '')) {
          rows.push(currentRow);
          maxCols = Math.max(maxCols, currentRow.length);
        }
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
    if (!(currentRow.length === 1 && currentRow[0] === '')) {
      rows.push(currentRow);
      maxCols = Math.max(maxCols, currentRow.length);
    }
  }

  // Normalize ragged rows
  const normalizedRows = rows.map((row) => {
    while (row.length < maxCols) {
      row.push('');
    }
    return row;
  });

  // Ensure minimum grid size
  const finalRows = normalizedRows.length > 0 ? normalizedRows : Array(20).fill(null).map(() => Array(10).fill(''));
  const finalCols = maxCols > 0 ? maxCols : 10;

  return {
    data: finalRows,
    rowCount: finalRows.length,
    colCount: finalCols,
  };
}

/**
 * Serialize a 2D array into CSV format
 */
export function serializeCsv(data: string[][], delimiter: string = ','): string {
  let lastRowWithData = -1;
  let lastColWithData = -1;

  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex] || [];
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const cell = row[colIndex] || '';
      if (cell !== '') {
        lastRowWithData = Math.max(lastRowWithData, rowIndex);
        lastColWithData = Math.max(lastColWithData, colIndex);
      }
    }
  }

  if (lastRowWithData < 0 || lastColWithData < 0) {
    return '';
  }

  const lines: string[] = [];

  for (let rowIndex = 0; rowIndex <= lastRowWithData; rowIndex++) {
    const row = data[rowIndex] || [];
    const cells = row.map((cell) => {
      // Check if cell needs quoting
      const needsQuoting =
        cell.includes(delimiter) ||
        cell.includes('"') ||
        cell.includes('\n') ||
        cell.includes('\r');

      if (needsQuoting) {
        // Escape quotes by doubling them
        const escaped = cell.replace(/"/g, '""');
        return `"${escaped}"`;
      }

      return cell;
    });

    while (cells.length < lastColWithData + 1) {
      cells.push('');
    }

    const trimmedCells = cells.slice(0, lastColWithData + 1);

    lines.push(trimmedCells.join(delimiter));
  }

  return lines.join('\n');
}

/**
 * Create an empty grid
 */
export function createEmptyGrid(rows: number = 20, cols: number = 10): string[][] {
  return Array(rows)
    .fill(null)
    .map(() => Array(cols).fill(''));
}

/**
 * Expand grid to accommodate new dimensions
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
