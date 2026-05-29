/**
 * Standalone CSV parser and serializer for the CLI.
 *
 * No Electron dependencies. Identical logic to the main app's src/utils/csv/
 * but self-contained so the CLI works without the Electron renderer.
 */

// ---- Types ----

export interface CsvInspectResult {
  file: string;
  delimiter: string;
  rowCount: number;
  colCount: number;
  headers: string[];
  sampleRows: string[][];
}

export interface CsvValidateResult {
  valid: boolean;
  errors: Array<{ line: number; col: number; message: string }>;
}

// ---- Delimiter Detection ----

export function detectDelimiter(content: string): string {
  const lines = content.split('\n').filter((l) => l.trim() !== '');
  const sample = lines.slice(0, 5);
  if (!sample.length) return ',';

  const delimiters = [',', ';', '\t'];
  let maxCount = 0;
  let detected = ',';

  for (const delim of delimiters) {
    let total = 0;
    for (const line of sample) {
      total += line.split(delim).length;
    }
    if (total > maxCount) {
      maxCount = total;
      detected = delim;
    }
  }

  return detected;
}

// ---- CSV Parsing ----

export function parseCsv(content: string, delimiter?: string): string[][] {
  const clean = content.startsWith('\uFEFF') ? content.slice(1) : content;
  const delim = delimiter || detectDelimiter(clean);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const next = clean[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentCell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        // Preserve \r inside quoted fields — don't strip it
        currentCell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delim) {
        currentRow.push(currentCell);
        currentCell = '';
      } else if (ch === '\n') {
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else if (ch === '\r') {
        // Skip standalone \r outside quotes (Windows line ending artifact)
        continue;
      } else {
        currentCell += ch;
      }
    }
  }

  // Push final row
  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  // Trim trailing empty rows
  while (rows.length > 0 && rows[rows.length - 1].every((c) => c === '')) {
    rows.pop();
  }

  // Normalize column count
  const maxCols = rows.reduce((max, row) => Math.max(max, row.length), 0);
  for (const row of rows) {
    while (row.length < maxCols) {
      row.push('');
    }
  }

  return rows;
}

// ---- CSV Validation ----

export function validateCsv(content: string): CsvValidateResult {
  const errors: CsvValidateResult['errors'] = [];
  const clean = content.startsWith('\uFEFF') ? content.slice(1) : content;
  let inQuotes = false;
  let line = 1;
  let col = 1;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];

    if (inQuotes) {
      if (ch === '"' && clean[i + 1] === '"') {
        i++;
        col += 2;
      } else if (ch === '"') {
        inQuotes = false;
      }
      col++;
    } else {
      if (ch === '"') {
        inQuotes = true;
        col++;
      } else if (ch === '\n') {
        line++;
        col = 1;
      } else if (ch === '\r') {
        continue;
      } else {
        col++;
      }
    }
  }

  if (inQuotes) {
    errors.push({ line, col, message: 'Unclosed quote at end of file' });
  }

  return { valid: errors.length === 0, errors };
}

// ---- CSV Serialization ----

export function serializeCsv(data: string[][], delimiter: string = ','): string {
  // Find last non-empty row and column
  let lastRowWithData = -1;
  let lastColWithData = -1;

  for (let r = 0; r < data.length; r++) {
    const row = data[r] || [];
    for (let c = 0; c < row.length; c++) {
      if ((row[c] || '') !== '') {
        lastRowWithData = Math.max(lastRowWithData, r);
        lastColWithData = Math.max(lastColWithData, c);
      }
    }
  }

  if (lastRowWithData < 0) return '';

  const maxCols = Math.max(lastColWithData + 1, ...data.map((r) => r.length));
  const lines: string[] = [];

  for (let r = 0; r <= lastRowWithData; r++) {
    const row = data[r] || [];
    const cells: string[] = [];

    for (let c = 0; c < maxCols; c++) {
      const cell = row[c] || '';
      const needsQuoting =
        cell.includes(delimiter) ||
        cell.includes('"') ||
        cell.includes('\n') ||
        cell.includes('\r');

      if (needsQuoting) {
        cells.push(`"${cell.replace(/"/g, '""')}"`);
      } else {
        cells.push(cell);
      }
    }

    lines.push(cells.join(delimiter));
  }

  return lines.join('\n');
}

// ---- Title Derivation (mirrors Strata's derive_title_from_markdown) ----

export function deriveTitleFromMarkdown(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n').trim();
  const lines = normalized.split('\n').map((l) => l.trim()).filter(Boolean);
  if (0 === lines.length) return 'Untitled';

  const heading = lines.find((l) => l.startsWith('# '));
  if (heading) return heading.slice(2).trim() || 'Untitled';

  const firstLine = lines[0];
  return firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine;
}
