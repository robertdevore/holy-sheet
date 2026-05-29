/**
 * Strata integration commands: import-notes, export-notes.
 *
 * Talks to Strata's local HTTP API or reads/writes JSON files.
 * Never touches Strata's SQLite directly.
 */

import { Command } from 'commander';
import * as fs from 'fs';
import { CliError, ExitCode } from '../lib/errors';
import { parseCsv, serializeCsv, deriveTitleFromMarkdown } from '../lib/csv';
import { StrataApiClient, type StrataNote } from '../lib/strata';
import { printSuccess, printDryRun, type CliRuntimeOptions } from '../lib/output';
import { rowIndexSchema } from '../lib/validators';

interface RuntimeContext {
  options: CliRuntimeOptions;
}

// ---- Note Payload Types ----

interface StrataNotePayload {
  title: string;
  content: string;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
  starred?: boolean;
  strataNoteId?: string;
}

// ---- Column Mapping ----

const STRATA_COLUMNS = [
  '_strata_note_id',
  'title',
  'content',
  'tags',
  'starred',
  'archived',
  'createdAt',
  'updatedAt',
];

const noteToRow = (note: StrataNote): string[] => {
  const title = deriveTitleFromMarkdown(note.content);
  return [
    note.id,
    title,
    note.content,
    (note.tags || []).join(';'),
    note.starred ? 'true' : 'false',
    note.archived ? 'true' : 'false',
    note.createdAt,
    note.updatedAt,
  ];
};

const rowToPayload = (headers: string[], row: string[]): StrataNotePayload => {
  const get = (name: string): string => {
    const idx = headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());
    return idx >= 0 ? (row[idx] || '') : '';
  };

  const getBool = (name: string): boolean | undefined => {
    const val = get(name).toLowerCase();
    if ('true' === val) return true;
    if ('false' === val) return false;
    return undefined;
  };

  const title = get('title');
  const content = get('content') || title;

  return {
    title: title || deriveTitleFromMarkdown(content),
    content: content || `# ${title}`,
    tags: get('tags')
      .split(';')
      .map((t) => t.trim())
      .filter(Boolean),
    createdAt: get('createdat') || get('created') || undefined,
    updatedAt: get('updatedat') || get('_strata_updated') || undefined,
    starred: getBool('starred'),
    strataNoteId: get('_strata_note_id') || undefined,
  };
};

// Reserved for future Strata API push — sends payload to Strata's POST /notes endpoint.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _noteToJsonPayload = (_note: StrataNotePayload): Record<string, unknown> => ({});

// ---- Commands ----

export const registerStrataCommands = (
  program: Command,
  getContext: (cmd: Command) => RuntimeContext,
): void => {
  const strata = program
    .command('strata')
    .description('Import/export between Strata notes and CSV.');

  // ---- strata import-notes ----

  strata
    .command('import-notes')
    .description('Import notes from Strata (local API or JSON export file) into a CSV')
    .option('--from-api', 'Fetch notes from running Strata API')
    .option('--from-file <path>', 'Read Strata notes JSON export file')
    .option('--query <query>', 'Filter notes by search query (API mode only)')
    .option('--tag <tag>', 'Filter notes by tag (API mode only)')
    .option('--starred', 'Only starred notes (API mode only)')
    .option('--out <path>', 'Output CSV file path')
    .action(async function (cmdOptions: {
      fromApi?: boolean;
      fromFile?: string;
      query?: string;
      tag?: string;
      starred?: boolean;
      out?: string;
    }) {
      const { options } = getContext(this);
      let notes: StrataNote[] = [];

      // ---- Fetch notes ----

      if (cmdOptions.fromApi) {
        const client = new StrataApiClient({});
        notes = await client.listNotes({
          query: cmdOptions.query,
          tag: cmdOptions.tag,
          starred: cmdOptions.starred,
          archived: false,
        });
      } else if (cmdOptions.fromFile) {
        if (!fs.existsSync(cmdOptions.fromFile)) {
          throw new CliError({
            message: 'File not found',
            exitCode: ExitCode.NotFound,
            code: 'FILE_NOT_FOUND',
            details: { path: cmdOptions.fromFile },
          });
        }
        const raw = fs.readFileSync(cmdOptions.fromFile, 'utf-8');
        try {
          const parsed = JSON.parse(raw);
          notes = Array.isArray(parsed) ? parsed : parsed.notes || [];
        } catch {
          throw new CliError({
            message: 'Invalid Strata export JSON',
            exitCode: ExitCode.ValidationError,
            code: 'PARSE_ERROR',
          });
        }
      } else {
        throw new CliError({
          message: 'Specify --from-api or --from-file',
          exitCode: ExitCode.ValidationError,
          code: 'MISSING_SOURCE',
          hint: 'Use --from-api to fetch from a running Strata instance, or --from-file to read a JSON export.',
        });
      }

      if (0 === notes.length) {
        printSuccess(options, {
          message: 'No notes found',
          count: 0,
        } as unknown as Record<string, unknown>);
        return;
      }

      // ---- Build CSV ----

      const csvRows = [STRATA_COLUMNS, ...notes.map(noteToRow)];
      const csvContent = serializeCsv(csvRows);

      if (options.dryRun) {
        printDryRun(
          options,
          `Would import ${notes.length} notes into ${cmdOptions.out || 'stdout'}`,
        );
        printSuccess(options, {
          dryRun: true,
          message: `Would import ${notes.length} notes`,
          noteCount: notes.length,
          sampleTitles: notes.slice(0, 5).map((n) => deriveTitleFromMarkdown(n.content)),
        } as unknown as Record<string, unknown>, { dryRun: true });
        return;
      }

      if (cmdOptions.out) {
        fs.writeFileSync(cmdOptions.out, csvContent, 'utf-8');
        printSuccess(options, {
          success: true,
          path: cmdOptions.out,
          noteCount: notes.length,
        } as unknown as Record<string, unknown>);
      } else if ('json' === options.outputMode) {
        printSuccess(options, {
          csv: csvContent,
          noteCount: notes.length,
          headers: STRATA_COLUMNS,
        } as unknown as Record<string, unknown>);
      } else {
        process.stdout.write(csvContent + '\n');
      }
    });

  // ---- strata export-notes ----

  strata
    .command('export-notes <file>')
    .description('Export CSV rows as Strata-compatible note JSON payloads')
    .option('--row <index>', 'Export single row (1-based, after header)')
    .option('--title-column <col>', 'Column to use as note title')
    .option('--content-column <col>', 'Column to use as note content')
    .option('--tags-column <col>', 'Column to use for tags')
    .option('--tag <tag>', 'Add a tag to all exported notes', (v: string, prev: string[]) => [...prev, v], [] as string[])
    .option('--out <path>', 'Output JSON file path')
    .action(function (
      filePath: string,
      cmdOptions: {
        row?: string;
        titleColumn?: string;
        contentColumn?: string;
        tagsColumn?: string;
        tag?: string[];
        out?: string;
      },
    ) {
      const { options } = getContext(this);

      if (!fs.existsSync(filePath)) {
        throw new CliError({
          message: 'File not found',
          exitCode: ExitCode.NotFound,
          code: 'FILE_NOT_FOUND',
          details: { path: filePath },
        });
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const rows = parseCsv(content);
      if (rows.length < 2) {
        throw new CliError({
          message: 'CSV has no data rows (need header + at least 1 data row)',
          exitCode: ExitCode.ValidationError,
          code: 'EMPTY_CSV',
        });
      }

      const headers = rows[0];

      // Export single row
      if (cmdOptions.row !== undefined) {
        const rowIndex = rowIndexSchema.parse(cmdOptions.row);
        if (rowIndex < 1 || rowIndex >= rows.length) {
          throw new CliError({
            message: `Row index out of range: ${cmdOptions.row}`,
            exitCode: ExitCode.ValidationError,
            code: 'ROW_OUT_OF_RANGE',
            details: { requested: cmdOptions.row, max: rows.length - 1 },
          });
        }
        const payload = rowToPayload(headers, rows[rowIndex]);
        printSuccess(options, payload as unknown as Record<string, unknown>);
        return;
      }

      // Export all rows
      const payloads = rows.slice(1).map((row) => {
        const payload = rowToPayload(headers, row);
        // Apply explicit column overrides
        if (cmdOptions.titleColumn) {
          const idx = headers.findIndex((h) => h === cmdOptions.titleColumn);
          payload.title = idx >= 0 ? (row[idx] || payload.title) : payload.title;
        }
        if (cmdOptions.contentColumn) {
          const idx = headers.findIndex((h) => h === cmdOptions.contentColumn);
          payload.content = idx >= 0 ? (row[idx] || payload.content) : payload.content;
        }
        // Append extra tags
        if (cmdOptions.tag && cmdOptions.tag.length > 0) {
          payload.tags = [...new Set([...payload.tags, ...cmdOptions.tag])];
        }
        return payload;
      });

      if (options.dryRun) {
        printDryRun(
          options,
          `Would export ${payloads.length} notes from ${filePath}`,
        );
        printSuccess(options, {
          dryRun: true,
          message: `Would export ${payloads.length} notes`,
          count: payloads.length,
          sample: payloads.slice(0, 3),
        } as unknown as Record<string, unknown>, { dryRun: true });
        return;
      }

      const jsonOutput = JSON.stringify(payloads, null, 2);

      if (cmdOptions.out) {
        fs.writeFileSync(cmdOptions.out, jsonOutput, 'utf-8');
        printSuccess(options, {
          success: true,
          path: cmdOptions.out,
          count: payloads.length,
        } as unknown as Record<string, unknown>);
      } else if ('json' === options.outputMode) {
        printSuccess(options, {
          notes: payloads,
          count: payloads.length,
        } as unknown as Record<string, unknown>);
      } else {
        process.stdout.write(jsonOutput + '\n');
      }
    });
};
