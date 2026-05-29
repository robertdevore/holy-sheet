#!/usr/bin/env npx tsx
/**
 * Holy Sheet CLI — agent-safe command-line interface.
 *
 * Usage: npx tsx cli/holysheet-cli.ts <command> [options]
 *        npm run holysheet -- <command> [options]
 */

import { Command } from 'commander';
import { CliError, getExitCode, printError, ExitCode } from './lib/errors';
import { type CliRuntimeOptions, type OutputMode } from './lib/output';
import { registerHealthCommand } from './commands/health';
import { registerCsvCommands } from './commands/csv';
import { registerStrataCommands } from './commands/strata';

// ---- Runtime Options Resolution ----

const resolveOutputMode = (raw: {
  json?: boolean;
  pretty?: boolean;
  agent?: boolean;
}): OutputMode => {
  if (raw.json) return 'json';
  if (raw.pretty) return 'pretty';

  const envMode = (process.env.HOLYSHEET_CLI_OUTPUT || '').trim().toLowerCase();
  if ('json' === envMode) return 'json';
  if ('pretty' === envMode) return 'pretty';

  if (raw.agent || 'true' === (process.env.HOLYSHEET_CLI_AGENT_MODE || '').trim().toLowerCase()) {
    return 'json';
  }

  return 'pretty';
};

const resolveRuntimeOptions = (globalOpts: Record<string, unknown>): CliRuntimeOptions => {
  return {
    outputMode: resolveOutputMode({
      json: Boolean(globalOpts.json),
      pretty: Boolean(globalOpts.pretty),
      agent: Boolean(globalOpts.agent),
    }),
    quiet: Boolean(globalOpts.quiet),
    verbose: Boolean(globalOpts.verbose),
    dryRun: Boolean(globalOpts.dryRun) ||
      'true' === (process.env.HOLYSHEET_CLI_DRY_RUN || '').trim().toLowerCase(),
    confirm: Boolean(globalOpts.confirm),
    agentMode: Boolean(globalOpts.agent) ||
      'true' === (process.env.HOLYSHEET_CLI_AGENT_MODE || '').trim().toLowerCase(),
    noColor: false === globalOpts.color,
  };
};

// ---- Main Program ----

const program = new Command();

program
  .name('holysheet')
  .description('Agent-safe CLI for Holy Sheet — local-first CSV workbench.')
  .option('--json', 'Machine-readable JSON output')
  .option('--pretty', 'Human-readable output')
  .option('--quiet', 'Suppress non-essential output')
  .option('--verbose', 'Verbose diagnostics output')
  .option('--dry-run', 'Validate and preview without writing files')
  .option('--confirm', 'Confirm destructive or overwriting operations')
  .option('--agent', 'Enable agent-safe mode')
  .option('--no-color', 'Disable colored output')
  .showHelpAfterError()
  .exitOverride();

// Context factory for commands
const getContext = (cmd: Command): { options: CliRuntimeOptions } => {
  const globalOpts = cmd.optsWithGlobals() as Record<string, unknown>;
  return { options: resolveRuntimeOptions(globalOpts) };
};

// Register commands
registerHealthCommand(program, (cmd) => getContext(cmd).options);
registerCsvCommands(program, getContext);
registerStrataCommands(program, getContext);

// ---- Run ----

const run = async (): Promise<void> => {
  try {
    await program.parseAsync(process.argv);
  } catch (error: unknown) {
    // Commander help/version display — exit cleanly
    if (
      error &&
      'object' === typeof error &&
      'code' in error &&
      ('commander.helpDisplayed' === (error as { code?: string }).code ||
        'commander.help' === (error as { code?: string }).code)
    ) {
      process.exit(ExitCode.Success);
      return;
    }

    // Commander argument errors — map to validation exit code
    if (
      error &&
      'object' === typeof error &&
      'code' in error &&
      ('commander.unknownOption' === (error as { code?: string }).code ||
        'commander.missingArgument' === (error as { code?: string }).code ||
        'commander.unknownCommand' === (error as { code?: string }).code ||
        'commander.missingMandatoryOptionValue' === (error as { code?: string }).code)
    ) {
      const message = error instanceof Error ? error.message : String(error);
      printError(
        new CliError({
          message,
          exitCode: ExitCode.ValidationError,
          code: 'INVALID_ARGS',
        }),
      );
      process.exit(ExitCode.ValidationError);
      return;
    }

    // CliError — structured output with correct exit code
    if (error instanceof CliError) {
      printError(error);
      process.exit(error.exitCode);
      return;
    }

    // Unexpected error
    printError(error);
    process.exit(getExitCode(error));
  }
};

run();
