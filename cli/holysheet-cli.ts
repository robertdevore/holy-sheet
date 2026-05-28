#!/usr/bin/env npx tsx
/**
 * Holy Sheet CLI — agent-safe command-line interface.
 *
 * Usage: npx tsx cli/holysheet-cli.ts <command> [options]
 */

import * as fs from 'fs';
import * as path from 'path';

// ---- Types ----

interface CliError {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

interface HealthResult {
  status: 'ok';
  version: string;
}

interface CsvInspectResult {
  file: string;
  delimiter: string;
  rowCount: number;
  colCount: number;
  headers: string[];
  sampleRows: string[][];
}

interface CsvValidateResult {
  valid: boolean;
  errors: Array<{ line: number; col: number; message: string }>;
}

// ---- Helpers ----

function readVersion(): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function die(error: CliError, exitCode: number = 1): never {
  process.stderr.write(JSON.stringify(error) + '\n');
  process.exit(exitCode);
}

function jsonOut(data: unknown): void {
  process.stdout.write(JSON.stringify(data) + '\n');
}

// ---- CSV Parser (standalone, no Electron dependency) ----

function detectDelimiter(content: string): string {
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

function parseCsv(content: string, delimiter?: string): string[][] {
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
        continue;
      } else {
        currentCell += ch;
      }
    }
  }

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
    while (row.length < maxCols) row.push('');
  }

  return rows;
}

function validateCsv(content: string): CsvValidateResult {
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

// ---- Commands ----

function cmdHealth(): void {
  jsonOut({ status: 'ok', version: readVersion() } satisfies HealthResult);
}

function cmdInspect(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    die({ error: 'File not found', code: 'FILE_NOT_FOUND', details: { path: filePath } });
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const rows = parseCsv(content);
  const delimiter = detectDelimiter(content);

  const result: CsvInspectResult = {
    file: path.basename(filePath),
    delimiter: delimiter === '\t' ? 'tab' : delimiter,
    rowCount: rows.length,
    colCount: rows[0]?.length || 0,
    headers: rows[0] || [],
    sampleRows: rows.slice(1, 6),
  };

  jsonOut(result);
}

function cmdValidate(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    die({ error: 'File not found', code: 'FILE_NOT_FOUND', details: { path: filePath } });
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const result = validateCsv(content);
  jsonOut(result);
  process.exit(result.valid ? 0 : 1);
}

function cmdPreview(filePath: string, rowLimit: number = 10): void {
  if (!fs.existsSync(filePath)) {
    die({ error: 'File not found', code: 'FILE_NOT_FOUND', details: { path: filePath } });
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const rows = parseCsv(content);
  jsonOut(rows.slice(0, rowLimit));
}

// ---- Strata Integration Commands (Phase 7 stubs) ----

interface StrataNotePayload {
  title: string;
  content: string;
  tags: string[];
  createdAt?: string;
  strataNoteId?: string;
}

function cmdStrataImport(filePath: string, outputPath?: string): void {
  if (!fs.existsSync(filePath)) {
    die({ error: 'File not found', code: 'FILE_NOT_FOUND', details: { path: filePath } });
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  let note: StrataNotePayload;
  try {
    note = JSON.parse(raw);
  } catch {
    die({ error: 'Invalid Strata note JSON', code: 'PARSE_ERROR' });
  }

  const csvRows = [
    ['_strata_note_id', 'title', 'content', 'tags', 'created'],
    [
      note.strataNoteId || '',
      note.title || '',
      note.content || '',
      (note.tags || []).join(';'),
      note.createdAt || '',
    ],
  ];

  const csvContent = csvRows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');

  if (outputPath) {
    fs.writeFileSync(outputPath, csvContent, 'utf-8');
    jsonOut({ success: true, path: outputPath });
  } else {
    jsonOut({ success: true, content: csvContent });
  }
}

function cmdStrataExport(filePath: string, rowIndex?: number): void {
  if (!fs.existsSync(filePath)) {
    die({ error: 'File not found', code: 'FILE_NOT_FOUND', details: { path: filePath } });
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const rows = parseCsv(content);
  if (rows.length < 2) {
    die({ error: 'CSV has no data rows', code: 'PARSE_ERROR' });
  }

  const headers = rows[0];
  const titleCol = headers.findIndex((h) => h.toLowerCase() === 'title');
  const contentCol = headers.findIndex((h) => h.toLowerCase() === 'content');
  const tagsCol = headers.findIndex((h) => h.toLowerCase() === 'tags');
  const noteIdCol = headers.findIndex((h) => h === '_strata_note_id');

  const makeNote = (dataRow: string[]): StrataNotePayload => ({
    title: titleCol >= 0 ? dataRow[titleCol] || '' : '',
    content: contentCol >= 0 ? dataRow[contentCol] || '' : dataRow.join(', '),
    tags: tagsCol >= 0 ? dataRow[tagsCol]?.split(';').filter(Boolean) || [] : [],
    strataNoteId: noteIdCol >= 0 ? dataRow[noteIdCol] || undefined : undefined,
  });

  if (rowIndex !== undefined && rowIndex >= 1 && rowIndex < rows.length) {
    jsonOut(makeNote(rows[rowIndex]));
  } else {
    jsonOut(rows.slice(1).map(makeNote));
  }
}

// ---- Main ----

function printHelp(): void {
  process.stdout.write(`Holy Sheet CLI v${readVersion()}

Usage: npx tsx cli/holysheet-cli.ts <command> [options]

Commands:
  health                       Check CLI is functional
  csv inspect <file>           Show file metadata (delimiter, rows, cols, headers, sample)
  csv validate <file>          Validate CSV syntax, report errors
  csv preview <file> [rows]    Output first N rows as JSON (default 10)
  strata import <note.json> [out.csv]  Import a Strata note as CSV
  strata export <file.csv> [row]       Export CSV rows as Strata note JSON
  --help                       Show this help

All commands output JSON. Exit code 0 = success, 1 = user error, 2 = system error.
`);
}

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h') {
  printHelp();
  process.exit(0);
}

try {
  switch (command) {
    case 'health':
      cmdHealth();
      break;
    case 'csv':
      if (args[1] === 'inspect' && args[2]) {
        cmdInspect(args[2]);
      } else if (args[1] === 'validate' && args[2]) {
        cmdValidate(args[2]);
      } else if (args[1] === 'preview' && args[2]) {
        const limit = args[3] ? parseInt(args[3], 10) : 10;
        cmdPreview(args[2], isNaN(limit) ? 10 : limit);
      } else {
        die({ error: 'Unknown csv subcommand. Use: inspect, validate, preview', code: 'INVALID_ARGS' });
      }
      break;
    case 'strata':
      if (args[1] === 'import' && args[2]) {
        cmdStrataImport(args[2], args[3]);
      } else if (args[1] === 'export' && args[2]) {
        const row = args[3] ? parseInt(args[3], 10) : undefined;
        cmdStrataExport(args[2], row);
      } else {
        die({ error: 'Unknown strata subcommand. Use: import, export', code: 'INVALID_ARGS' });
      }
      break;
    default:
      die({ error: `Unknown command: ${command}`, code: 'INVALID_ARGS' });
  }
} catch (err) {
  die({ error: (err as Error).message, code: 'SYSTEM_ERROR' }, 2);
}
