/**
 * CLI error types and exit codes.
 *
 * Mirrors Strata CLI's error taxonomy for consistency.
 * All errors are structured and machine-readable.
 */

import { ZodError } from 'zod';

// ---- Exit Codes ----

export const ExitCode = {
  Success: 0,
  GenericFailure: 1,
  ValidationError: 2,
  ApiUnavailable: 3,
  AuthFailure: 4,
  NotFound: 5,
  UnsafeRefused: 6,
  AiProviderFailure: 7,
  Timeout: 8,
  PartialFailure: 9,
} as const;

export type ExitCode = (typeof ExitCode)[keyof typeof ExitCode];

// ---- CliError ----

export class CliError extends Error {
  readonly exitCode: ExitCode;
  readonly code: string;
  readonly hint?: string;
  readonly details?: unknown;

  constructor(params: {
    message: string;
    exitCode?: ExitCode;
    code?: string;
    hint?: string;
    details?: unknown;
  }) {
    super(params.message);
    this.name = 'CliError';
    this.exitCode = params.exitCode ?? ExitCode.GenericFailure;
    this.code = params.code ?? 'CLI_ERROR';
    this.hint = params.hint;
    this.details = params.details;
  }
}

// ---- Error Serialization ----

export interface CliErrorPayload {
  ok: false;
  error: {
    code: string;
    message: string;
    hint?: string;
    details?: unknown;
  };
}

export const toErrorPayload = (error: unknown): CliErrorPayload => {
  if (error instanceof ZodError) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed.',
        details: error.issues,
      },
    };
  }

  if (error instanceof CliError) {
    return {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        hint: error.hint,
        details: error.details,
      },
    };
  }

  if (error instanceof Error) {
    return {
      ok: false,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: error.message,
      },
    };
  }

  return {
    ok: false,
    error: {
      code: 'UNEXPECTED_ERROR',
      message: 'Unknown error',
    },
  };
};

export const getExitCode = (error: unknown): ExitCode => {
  if (error instanceof ZodError) return ExitCode.ValidationError;
  if (error instanceof CliError) return error.exitCode;
  return ExitCode.GenericFailure;
};

export const printError = (error: unknown): void => {
  const payload = toErrorPayload(error);
  process.stderr.write(JSON.stringify(payload) + '\n');
};

// ---- HTTP Status Mapping ----

export const mapHttpStatusToExitCode = (status: number): ExitCode => {
  if (401 === status || 403 === status) return ExitCode.AuthFailure;
  if (404 === status) return ExitCode.NotFound;
  if (408 === status) return ExitCode.Timeout;
  if (409 === status || 422 === status) return ExitCode.ValidationError;
  if (status >= 500) return ExitCode.ApiUnavailable;
  return ExitCode.GenericFailure;
};
