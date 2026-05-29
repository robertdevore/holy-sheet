/**
 * CLI output helpers — JSON and pretty-print formatting.
 */

// ---- Types ----

export type OutputMode = 'json' | 'pretty';

export interface CliRuntimeOptions {
  outputMode: OutputMode;
  quiet: boolean;
  verbose: boolean;
  dryRun: boolean;
  confirm: boolean;
  agentMode: boolean;
  noColor: boolean;
}

// ---- Defaults (available for consumers that need a fallback) ----

export const DEFAULT_OPTIONS: CliRuntimeOptions = {
  outputMode: 'pretty',
  quiet: false,
  verbose: false,
  dryRun: false,
  confirm: false,
  agentMode: false,
  noColor: false,
};

// ---- Output ----

export const jsonOut = (data: unknown): void => {
  process.stdout.write(JSON.stringify(data) + '\n');
};

export const prettyOut = (text: string): void => {
  process.stdout.write(text + '\n');
};

export const printSuccess = <TData extends Record<string, unknown>>(
  options: CliRuntimeOptions,
  data: TData,
  extra: { dryRun?: boolean; prettyText?: string } = {},
): void => {
  if ('json' === options.outputMode) {
    const payload: Record<string, unknown> = { ok: true, ...data };
    if (extra.dryRun) payload.dryRun = true;
    jsonOut(payload);
    return;
  }

  if (options.quiet) return;

  if (extra.prettyText) {
    prettyOut(extra.prettyText);
    return;
  }

  jsonOut(data);
};

export const printDryRun = (options: CliRuntimeOptions, message: string): void => {
  if (options.quiet && !options.verbose) return;
  if ('json' === options.outputMode) {
    jsonOut({ ok: true, dryRun: true, message });
  } else {
    prettyOut(`[DRY RUN] ${message}`);
  }
};

// ---- Table Formatting ----

export const formatTable = (headers: string[], rows: string[][]): string => {
  const widths = headers.map((header, index) => {
    const rowWidth = rows.reduce((max, row) => Math.max(max, (row[index] || '').length), 0);
    return Math.max(header.length, rowWidth);
  });

  const formatRow = (columns: string[]): string =>
    columns.map((col, index) => (col || '').padEnd(widths[index])).join('  ');

  const separator = widths.map((w) => '-'.repeat(w)).join('  ');
  const lines = [formatRow(headers), separator];
  for (const row of rows) {
    lines.push(formatRow(row));
  }
  return lines.join('\n');
};
