/**
 * CSV parsing and serialization utilities
 */

export interface CsvData {
  data: string[][];
  rowCount: number;
  colCount: number;
}

export interface CellFormatData {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  textColor?: string;
  backgroundColor?: string;
}

export interface WorkbookTab {
  id: string;
  name: string;
  data: string[][];
  formats?: Record<string, CellFormatData>;
  columnWidths?: number[];
}

export interface WorkbookData {
  tabs: WorkbookTab[];
}

const WORKBOOK_HEADER = '#HOLYSHEET_TABS_V1';
const WORKBOOK_TAB_PREFIX = '#TAB:';
const WORKBOOK_FORMAT_PREFIX = '#FORMAT:';
const WORKBOOK_WIDTHS_PREFIX = '#WIDTHS:';

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
 * Parse HolySheet workbook format or fallback to a single CSV tab.
 */
export function parseWorkbook(content: string): WorkbookData {
  const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  if (!normalizedContent.startsWith(WORKBOOK_HEADER + '\n') && normalizedContent !== WORKBOOK_HEADER) {
    return {
      tabs: [
        {
          id: 'sheet-1',
          name: 'Sheet1',
          data: parseCsv(content).data,
          formats: {},
          columnWidths: [],
        },
      ],
    };
  }

  const lines = normalizedContent.split('\n');
  const tabs: WorkbookTab[] = [];
  let currentTabName: string | null = null;
  let currentTabFormats: Record<string, CellFormatData> = {};
  let currentTabColumnWidths: number[] = [];
  let currentTabLines: string[] = [];

  const flushCurrentTab = () => {
    if (null === currentTabName) return;

    const tabContent = currentTabLines.join('\n');
    const parsed = parseCsv(tabContent);
    tabs.push({
      id: `sheet-${tabs.length + 1}`,
      name: currentTabName,
      data: parsed.data,
      formats: currentTabFormats,
      columnWidths: currentTabColumnWidths,
    });
    currentTabLines = [];
    currentTabFormats = {};
    currentTabColumnWidths = [];
  };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i] || '';

    if (line.startsWith(WORKBOOK_TAB_PREFIX)) {
      flushCurrentTab();
      const encodedName = line.substring(WORKBOOK_TAB_PREFIX.length);
      try {
        currentTabName = decodeURIComponent(encodedName) || `Sheet${tabs.length + 1}`;
      } catch (_error) {
        currentTabName = encodedName || `Sheet${tabs.length + 1}`;
      }
      continue;
    }

    if (line.startsWith(WORKBOOK_FORMAT_PREFIX)) {
      const encodedFormats = line.substring(WORKBOOK_FORMAT_PREFIX.length);

      if (!encodedFormats) {
        currentTabFormats = {};
        continue;
      }

      try {
        const decoded = decodeURIComponent(encodedFormats);
        const parsedFormats = JSON.parse(decoded) as Record<string, CellFormatData>;
        currentTabFormats = parsedFormats && 'object' === typeof parsedFormats ? parsedFormats : {};
      } catch (_error) {
        currentTabFormats = {};
      }

      continue;
    }

    if (line.startsWith(WORKBOOK_WIDTHS_PREFIX)) {
      const encodedWidths = line.substring(WORKBOOK_WIDTHS_PREFIX.length);

      if (!encodedWidths) {
        currentTabColumnWidths = [];
        continue;
      }

      try {
        const decoded = decodeURIComponent(encodedWidths);
        const parsedWidths = JSON.parse(decoded);

        if (Array.isArray(parsedWidths)) {
          currentTabColumnWidths = parsedWidths.map((width) => {
            const numeric_width = Number(width);
            return Number.isFinite(numeric_width) && numeric_width > 0 ? numeric_width : 0;
          });
        } else {
          currentTabColumnWidths = [];
        }
      } catch (_error) {
        currentTabColumnWidths = [];
      }

      continue;
    }

    if (null !== currentTabName) {
      currentTabLines.push(line);
    }
  }

  flushCurrentTab();

  if (!tabs.length) {
    return {
      tabs: [
        {
          id: 'sheet-1',
          name: 'Sheet1',
          data: createEmptyGrid(),
          formats: {},
          columnWidths: [],
        },
      ],
    };
  }

  return { tabs };
}

/**
 * Serialize a 2D array into CSV format
 */
export function serializeCsv(data: string[][], delimiter: string = ','): string {
  let lastRowWithData = -1;
  let lastColWithData = -1;
  let maxColsInGrid = 0;

  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex] || [];
    maxColsInGrid = Math.max(maxColsInGrid, row.length);
  }

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

  const preserveGridShape = true;
  const finalLastRow = preserveGridShape ? Math.max(0, data.length - 1) : lastRowWithData;
  const finalLastCol = preserveGridShape ? Math.max(0, maxColsInGrid - 1) : lastColWithData;

  const lines: string[] = [];

  for (let rowIndex = 0; rowIndex <= finalLastRow; rowIndex++) {
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

    while (cells.length < finalLastCol + 1) {
      cells.push('');
    }

    const trimmedCells = cells.slice(0, finalLastCol + 1);

    lines.push(trimmedCells.join(delimiter));
  }

  return lines.join('\n');
}

/**
 * Serialize workbook tabs into HolySheet multi-tab CSV format.
 */
export function serializeWorkbook(tabs: WorkbookTab[]): string {
  const safeTabs = tabs.length ? tabs : [{ id: 'sheet-1', name: 'Sheet1', data: createEmptyGrid(), formats: {}, columnWidths: [] }];
  const hasAnyFormatting = safeTabs.some((tab) => !!tab.formats && Object.keys(tab.formats).length > 0);
  const hasAnyColumnWidths = safeTabs.some((tab) => !!tab.columnWidths && tab.columnWidths.length > 0);

  if (1 === safeTabs.length && !hasAnyFormatting && !hasAnyColumnWidths) {
    return serializeCsv(safeTabs[0].data);
  }

  const lines: string[] = [WORKBOOK_HEADER];

  for (const tab of safeTabs) {
    const encodedName = encodeURIComponent(tab.name || 'Sheet');
    lines.push(`${WORKBOOK_TAB_PREFIX}${encodedName}`);

    const formats = tab.formats || {};
    const encodedFormats = encodeURIComponent(JSON.stringify(formats));
    lines.push(`${WORKBOOK_FORMAT_PREFIX}${encodedFormats}`);

    const columnWidths = tab.columnWidths || [];
    const encodedWidths = encodeURIComponent(JSON.stringify(columnWidths));
    lines.push(`${WORKBOOK_WIDTHS_PREFIX}${encodedWidths}`);

    lines.push(serializeCsv(tab.data));
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
