/**
 * CLI output shape tests.
 *
 * Tests that every command in --json mode produces the expected
 * {ok:true, ...} envelope with the correct fields.
 *
 * These tests invoke the CLI entrypoint via tsx and assert on stdout/stderr.
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ---- Helpers ----

const CLI = path.resolve(__dirname, '..', 'holysheet-cli.ts');
const TMP = os.tmpdir();

let testCsv: string;
let testStrataJson: string;
let testCsvPath: string;
let testStrataJsonPath: string;

function runCli(args: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`npx tsx ${CLI} ${args}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, HOLYSHEET_CLI_OUTPUT: 'json' },
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: Buffer | string; stderr?: Buffer | string; status?: number };
    return {
      stdout: typeof e.stdout === 'string' ? e.stdout : e.stdout?.toString() || '',
      stderr: typeof e.stderr === 'string' ? e.stderr : e.stderr?.toString() || '',
      exitCode: e.status ?? 1,
    };
  }
}

function jsonFrom(result: { stdout: string; stderr: string }): Record<string, unknown> {
  // Strip trailing newlines and parse
  const trimmed = result.stdout.trim();
  if (!trimmed) {
    throw new Error(`No stdout output. stderr: ${result.stderr}`);
  }
  return JSON.parse(trimmed);
}

// ---- Setup ----

beforeAll(() => {
  testCsv = `name,email,status\nAlice,alice@example.com,active\nBob,bob@example.com,inactive\nCharlie,charlie@example.com,active\n`;
  testCsvPath = path.join(TMP, 'test-holysheet-cli.csv');
  fs.writeFileSync(testCsvPath, testCsv, 'utf-8');

  testStrataJson = JSON.stringify([
    {
      id: 'abc-123',
      content: '# Meeting Notes\n\nDiscussed Q3 roadmap',
      createdAt: '2026-05-01T10:00:00Z',
      updatedAt: '2026-05-01T10:00:00Z',
      starred: true,
      archived: false,
      tags: ['meeting', 'roadmap'],
      deletedAt: null,
    },
  ]);
  testStrataJsonPath = path.join(TMP, 'test-strata-export.json');
  fs.writeFileSync(testStrataJsonPath, testStrataJson, 'utf-8');
});

afterAll(() => {
  try { fs.unlinkSync(testCsvPath); } catch { /* ok */ }
  try { fs.unlinkSync(testStrataJsonPath); } catch { /* ok */ }
});

// ---- Health ----

describe('health', () => {
  it('returns {ok:true, status, version}', () => {
    const result = runCli('health --json');
    const json = jsonFrom(result);
    expect(result.exitCode).toBe(0);
    expect(json.ok).toBe(true);
    expect(json.status).toBe('ok');
    expect(json.version).toBeDefined();
    expect(typeof json.version).toBe('string');
  });
});

// ---- CSV Inspect ----

describe('csv inspect', () => {
  it('returns structured metadata with {ok:true} envelope', () => {
    const result = runCli(`csv inspect ${testCsvPath} --json`);
    const json = jsonFrom(result);
    expect(result.exitCode).toBe(0);
    expect(json.ok).toBe(true);
    expect(json.file).toBe('test-holysheet-cli.csv');
    expect(json.delimiter).toBe(',');
    expect(json.rowCount).toBe(4);
    expect(json.colCount).toBe(3);
    expect(json.headers).toEqual(['name', 'email', 'status']);
    expect(json.sampleRows).toHaveLength(3);
  });

  it('returns FILE_NOT_FOUND for missing file', () => {
    const result = runCli('csv inspect /nonexistent/file.csv --json');
    expect(result.exitCode).toBe(ExitCode.NotFound);
    expect(result.stderr).toContain('FILE_NOT_FOUND');
  });
});

// ---- CSV Validate ----

describe('csv validate', () => {
  it('returns {ok:true, valid:true, errors:[]} for valid CSV', () => {
    const result = runCli(`csv validate ${testCsvPath} --json`);
    const json = jsonFrom(result);
    expect(result.exitCode).toBe(0);
    expect(json.ok).toBe(true);
    expect(json.valid).toBe(true);
    expect(json.errors).toEqual([]);
  });

  it('returns {ok:true, valid:false, errors:[...]} for invalid CSV', () => {
    // Create CSV with unclosed quote
    const badPath = path.join(TMP, 'bad.csv');
    fs.writeFileSync(badPath, 'name,email\nAlice,"unclosed', 'utf-8');
    const result = runCli(`csv validate ${badPath} --json`);
    const json = jsonFrom(result);
    expect(result.exitCode).toBe(ExitCode.ValidationError);
    expect(json.ok).toBe(true);
    expect(json.valid).toBe(false);
    expect(json.errors.length).toBeGreaterThan(0);
    try { fs.unlinkSync(badPath); } catch { /* ok */ }
  });
});

// ---- CSV Preview ----

describe('csv preview', () => {
  it('returns {ok:true, file, totalRows, shown, rows} with correct count', () => {
    const result = runCli(`csv preview ${testCsvPath} --rows 2 --json`);
    const json = jsonFrom(result);
    expect(result.exitCode).toBe(0);
    expect(json.ok).toBe(true);
    expect(json.file).toBe('test-holysheet-cli.csv');
    expect(json.totalRows).toBe(4);
    expect(json.shown).toBe(2);
    expect(json.rows).toHaveLength(2);
  });

  it('validates --rows is positive integer', () => {
    const result = runCli(`csv preview ${testCsvPath} --rows -1 --json`);
    expect(result.exitCode).toBe(ExitCode.ValidationError);
  });
});

// ---- CSV Select ----

describe('csv select', () => {
  it('wraps output in {ok:true, csv, selectedColumns, rows} in --json mode', () => {
    const result = runCli(`csv select ${testCsvPath} --columns name,status --json`);
    const json = jsonFrom(result);
    expect(result.exitCode).toBe(0);
    expect(json.ok).toBe(true);
    expect(json.csv).toBeDefined();
    expect(typeof json.csv).toBe('string');
    expect((json.csv as string).split('\n')[0]).toBe('name,status');
    expect(json.selectedColumns).toEqual(['name', 'status']);
    expect(json.rows).toBe(4);
  });

  it('returns error for unknown column', () => {
    const result = runCli(`csv select ${testCsvPath} --columns nonexistent --json`);
    expect(result.exitCode).toBe(ExitCode.ValidationError);
    expect(result.stderr).toContain('COLUMN_NOT_FOUND');
  });

  it('supports --dry-run without writing file', () => {
    const outPath = path.join(TMP, 'should-not-exist.csv');
    const result = runCli(`csv select ${testCsvPath} --columns name --out ${outPath} --dry-run --json`);
    const json = jsonFrom(result);
    expect(result.exitCode).toBe(0);
    expect(json.dryRun).toBe(true);
    expect(json.ok).toBe(true);
    expect(fs.existsSync(outPath)).toBe(false);
  });
});

// ---- Strata Import ----

describe('strata import-notes', () => {
  it('imports from JSON file into {ok:true, csv, noteCount, headers}', () => {
    const result = runCli(`strata import-notes --from-file ${testStrataJsonPath} --json`);
    const json = jsonFrom(result);
    expect(result.exitCode).toBe(0);
    expect(json.ok).toBe(true);
    expect(json.csv).toBeDefined();
    expect(typeof json.csv).toBe('string');
    expect(json.noteCount).toBe(1);
    expect(json.headers).toBeDefined();
  });

  it('handles empty notes gracefully', () => {
    const emptyPath = path.join(TMP, 'empty-notes.json');
    fs.writeFileSync(emptyPath, '[]', 'utf-8');
    const result = runCli(`strata import-notes --from-file ${emptyPath} --json`);
    const json = jsonFrom(result);
    expect(result.exitCode).toBe(0);
    expect(json.ok).toBe(true);
    expect(json.count).toBe(0);
    try { fs.unlinkSync(emptyPath); } catch { /* ok */ }
  });
});

// ---- Strata Export ----

describe('strata export-notes', () => {
  it('exports CSV rows as {ok:true, notes, count} in --json mode', () => {
    // First import to create a CSV with strata columns
    const importResult = runCli(
      `strata import-notes --from-file ${testStrataJsonPath} --json`,
    );
    const importJson = jsonFrom(importResult);
    const csvContent = importJson.csv as string;
    const csvPath = path.join(TMP, 'roundtrip-test.csv');
    fs.writeFileSync(csvPath, csvContent, 'utf-8');

    const result = runCli(`strata export-notes ${csvPath} --json`);
    const json = jsonFrom(result);
    expect(result.exitCode).toBe(0);
    expect(json.ok).toBe(true);
    expect(json.notes).toBeDefined();
    expect(Array.isArray(json.notes)).toBe(true);
    expect(json.count).toBe(1);

    const notes = json.notes as Array<Record<string, unknown>>;
    expect(notes[0].title).toBe('Meeting Notes');
    expect(notes[0].strataNoteId).toBe('abc-123');

    try { fs.unlinkSync(csvPath); } catch { /* ok */ }
  });
});

// ---- Exit Codes ----

import { ExitCode } from '../lib/errors';

describe('exit codes', () => {
  it('exits 0 on success', () => {
    const result = runCli('health --json');
    expect(result.exitCode).toBe(ExitCode.Success);
  });

  it('exits 5 (NotFound) for missing file', () => {
    const result = runCli('csv inspect /nonexistent/file.csv --json');
    expect(result.exitCode).toBe(ExitCode.NotFound);
  });

  it('exits 2 (ValidationError) for bad --rows', () => {
    const result = runCli(`csv preview ${testCsvPath} --rows invalid --json`);
    expect(result.exitCode).toBe(ExitCode.ValidationError);
  });

  it('exits 2 (ValidationError) for missing mandatory option', () => {
    const result = runCli(`csv select ${testCsvPath} --json 2>&1`);
    expect(result.exitCode).toBe(ExitCode.ValidationError);
  });
});
