/**
 * AI prompt templates for CSV operations.
 *
 * All prompts instruct the AI to return structured JSON.
 * Data samples are truncated to avoid exceeding token limits.
 */

const MAX_SAMPLE_ROWS = 20;

function formatSample(rows: string[][], headers?: string[]): string {
  const all = headers ? [headers, ...rows.slice(0, MAX_SAMPLE_ROWS)] : rows.slice(0, MAX_SAMPLE_ROWS);
  return all.map((r) => r.join(',')).join('\n');
}

export function summarizePrompt(
  headers: string[],
  sampleRows: string[][],
  rowCount: number,
  colCount: number,
): string {
  return `Analyze this CSV data and return a JSON summary.

File info: ${rowCount} rows, ${colCount} columns.
Headers: ${headers.join(', ')}

Sample data (first ${Math.min(sampleRows.length, MAX_SAMPLE_ROWS)} rows):
${formatSample(sampleRows, headers)}

Return JSON:
{
  "summary": "brief description of the dataset",
  "columns": [{"name": "...", "type": "string|number|date|boolean", "distinctValues": N, "nullCount": N}],
  "issues": ["data quality issue if any"],
  "rowCount": ${rowCount}
}`;
}

export function cleanPrompt(headers: string[], sampleRows: string[][]): string {
  return `Suggest cleaning operations for this CSV data.

Headers: ${headers.join(', ')}

Sample data:
${formatSample(sampleRows, headers)}

Return JSON:
{
  "suggestions": [
    {"column": "column_name", "action": "trim|normalize|dedup|fill_empty|remove", "description": "what to do"}
  ]
}

Only return the JSON. Do not include explanations.`;
}

export function transformPrompt(
  headers: string[],
  sampleRows: string[][],
  instruction: string,
): string {
  return `Transform this CSV data according to the instruction.

Headers: ${headers.join(', ')}

Sample data:
${formatSample(sampleRows, headers)}

Instruction: ${instruction}

Return JSON with the transformed data:
{
  "transformations": [
    {"type": "replace_cells|add_column|delete_column|rename_column|reorder_columns", "details": {...}}
  ]
}

Only return the JSON. Do not include explanations.`;
}

export function safetyWarning(provider: string, rowCount: number): string {
  return `You are about to send ${rowCount} rows of CSV data to ${provider}.

This data will be processed by an external AI service and is subject to their terms and privacy policy.

Do you want to continue?`;
}
