/**
 * Zod validation schemas for CLI inputs.
 *
 * Every user-supplied value is validated at the boundary before use.
 */

import { z } from 'zod';

// ---- File Paths ----

export const filePathSchema = z
  .string()
  .min(1, 'File path is required')
  .max(4096, 'File path too long');

// ---- Numeric Options ----

export const rowLimitSchema = z
  .string()
  .transform((v) => parseInt(v, 10))
  .pipe(z.number().int().positive().max(1000));

export const rowIndexSchema = z
  .string()
  .transform((v) => parseInt(v, 10))
  .pipe(z.number().int().positive());

// ---- Column Spec ----

export const columnsSpecSchema = z
  .string()
  .min(1, 'At least one column is required')
  .max(4096, 'Column spec too long');

// ---- Tag List ----

export const tagSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'Tag must be lowercase alphanumeric with hyphens');

// ---- Strata Options ----

export const strataQuerySchema = z.string().min(1).max(500).optional();

// ---- Output Options ----

export const outputPathSchema = z.string().min(1).max(4096).optional();
