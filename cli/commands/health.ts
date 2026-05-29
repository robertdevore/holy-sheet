/**
 * Health check command.
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import type { CliRuntimeOptions } from '../lib/output';
import { printSuccess } from '../lib/output';

function readVersion(): string {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf-8'),
    );
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

interface HealthResult {
  status: string;
  version: string;
}

export const registerHealthCommand = (
  program: Command,
  getOptions: (cmd: Command) => CliRuntimeOptions,
): void => {
  program
    .command('health')
    .description('Check CLI is functional')
    .action(function () {
      const options = getOptions(this);
      const result: HealthResult = {
        status: 'ok',
        version: readVersion(),
      };
      printSuccess(options, result as unknown as Record<string, unknown>);
    });
};
