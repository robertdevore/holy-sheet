/**
 * CSV commands: inspect, validate, preview, select.
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { CliError, ExitCode } from '../lib/errors';
import {
  detectDelimiter,
  parseCsv,
  validateCsv,
  serializeCsv,
  type CsvInspectResult,
  type CsvValidateResult,
} from '../lib/csv';
import { printSuccess, formatTable, type CliRuntimeOptions } from '../lib/output';
import { rowLimitSchema, columnsSpecSchema } from '../lib/validators';

interface RuntimeContext {
  options: CliRuntimeOptions;
}

export const registerCsvCommands = (
  program: Command,
  getContext: (cmd: Command) => RuntimeContext,
): void => {
  const csv = program.command('csv').description('Inspect, validate, and transform CSV files.');

  // ---- csv inspect ----

  csv
    .command('inspect <file>')
    .description('Show file metadata: delimiter, rows, columns, headers, sample rows')
    .action(function (filePath: string) {
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
      const delimiter = detectDelimiter(content);

      const result: CsvInspectResult = {
        file: path.basename(filePath),
        delimiter: delimiter === '\t' ? 'tab' : delimiter,
        rowCount: rows.length,
        colCount: rows[0]?.length || 0,
        headers: rows[0] || [],
        sampleRows: rows.slice(1, 6),
      };

      if ('pretty' === options.outputMode && !options.quiet) {
        const summary = [
          `File:       ${result.file}`,
          `Delimiter:  ${result.delimiter}`,
          `Rows:       ${result.rowCount}`,
          `Columns:    ${result.colCount}`,
          `Headers:    ${result.headers.join(', ')}`,
          '',
          'Sample rows:',
          ...result.sampleRows.map((row, i) => `  [${i + 1}] ${row.join(' | ')}`),
        ].join('\n');
        printSuccess(options, result as unknown as Record<string, unknown>, { prettyText: summary });
        return;
      }

      printSuccess(options, result as unknown as Record<string, unknown>);
    });

  // ---- csv validate ----

  csv
    .command('validate <file>')
    .description('Validate CSV syntax and report errors')
    .action(function (filePath: string) {
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
      const result: CsvValidateResult = validateCsv(content);

      printSuccess(options, result as unknown as Record<string, unknown>);

      if (!result.valid) {
        process.exitCode = ExitCode.ValidationError;
      }
    });

  // ---- csv preview ----

  csv
    .command('preview <file>')
    .description('Output first N rows as JSON (default 20)')
    .option('--rows <count>', 'Number of rows to show', '20')
    .action(function (filePath: string, cmdOptions: { rows: string }) {
      const { options } = getContext(this);

      if (!fs.existsSync(filePath)) {
        throw new CliError({
          message: 'File not found',
          exitCode: ExitCode.NotFound,
          code: 'FILE_NOT_FOUND',
          details: { path: filePath },
        });
      }

      const rowLimitRaw = rowLimitSchema.parse(cmdOptions.rows);
      const content = fs.readFileSync(filePath, 'utf-8');
      const rows = parseCsv(content);
      const rowLimit = Math.min(rowLimitRaw, rows.length);
      const preview = {
        file: path.basename(filePath),
        totalRows: rows.length,
        shown: Math.min(rowLimit, rows.length),
        rows: rows.slice(0, rowLimit),
      };

      if ('pretty' === options.outputMode && !options.quiet) {
        const table = formatTable(
          preview.rows[0]?.map((_, i) => `Col${i}`) || [],
          preview.rows,
        );
        const header = `File: ${preview.file} | Total rows: ${preview.totalRows} | Showing: ${preview.shown}\n`;
        printSuccess(options, preview as unknown as Record<string, unknown>, {
          prettyText: header + table,
        });
        return;
      }

      printSuccess(options, preview as unknown as Record<string, unknown>);
    });

  // ---- csv select ----

  csv
    .command('select <file>')
    .description('Select specific columns and output a new CSV')
    .requiredOption('--columns <cols>', 'Comma-separated column names or indices')
    .option('--out <path>', 'Output file path (prints to stdout if omitted)')
    .action(function (filePath: string, cmdOptions: { columns: string; out?: string }) {
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
      if (0 === rows.length) {
        throw new CliError({
          message: 'CSV file is empty',
          exitCode: ExitCode.ValidationError,
          code: 'EMPTY_CSV',
        });
      }

      const headers = rows[0];
      const validatedColumns = columnsSpecSchema.parse(cmdOptions.columns);
      const colSpecs = validatedColumns.split(',').map((s) => s.trim());

      // Resolve column specs to indices
      const colIndices: number[] = [];
      for (const spec of colSpecs) {
        const numIndex = parseInt(spec, 10);
        if (!isNaN(numIndex) && numIndex >= 0 && numIndex < headers.length) {
          colIndices.push(numIndex);
        } else {
          const nameIndex = headers.findIndex(
            (h) => h.toLowerCase() === spec.toLowerCase(),
          );
          if (nameIndex >= 0) {
            colIndices.push(nameIndex);
          } else {
            throw new CliError({
              message: `Column not found: "${spec}"`,
              exitCode: ExitCode.ValidationError,
              code: 'COLUMN_NOT_FOUND',
              details: { column: spec, available: headers },
            });
          }
        }
      }

      const selected = rows.map((row) => colIndices.map((i) => row[i] || ''));
      const output = serializeCsv(selected);

      if (options.dryRun) {
        printSuccess(options, {
          dryRun: true,
          message: `Would select ${colIndices.length} columns from ${rows.length} rows`,
          selectedColumns: colIndices.map((i) => headers[i]),
          preview: selected.slice(0, 4),
        } as unknown as Record<string, unknown>, { dryRun: true });
        return;
      }

      if (cmdOptions.out) {
        fs.writeFileSync(cmdOptions.out, output, 'utf-8');
        printSuccess(options, {
          success: true,
          path: cmdOptions.out,
          selectedColumns: colIndices.map((i) => headers[i]),
          rows: selected.length,
        } as unknown as Record<string, unknown>);
      } else if ('json' === options.outputMode) {
        // In JSON mode, always wrap in the {ok:true, ...} envelope.
        // Agents expect structured output, never raw CSV on stdout.
        printSuccess(options, {
          csv: output,
          selectedColumns: colIndices.map((i) => headers[i]),
          rows: selected.length,
        } as unknown as Record<string, unknown>);
      } else {
        // Pretty mode without --out: raw CSV to stdout for piping
        process.stdout.write(output + '\n');
      }
    });
};
