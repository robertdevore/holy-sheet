/**
 * AI action proposal types.
 *
 * AI responses are parsed into structured action proposals.
 * Each proposal is shown to the user for preview before application.
 * Applied actions go through the undo stack for reversibility.
 */

export type AIActionType =
  | 'replace_cells'
  | 'add_row'
  | 'delete_row'
  | 'add_column'
  | 'delete_column'
  | 'rename_column'
  | 'reorder_columns'
  | 'fill_values'
  | 'normalize_values';

export interface AIActionProposal {
  id: string;
  type: AIActionType;
  description: string;
  /** The change to apply */
  change: Record<string, unknown>;
  /** Preview of what the affected cells will look like after the change */
  preview?: string[][];
}

export interface AIActionResult {
  proposals: AIActionProposal[];
  summary: string;
}

/**
 * Parse an AI response into structured action proposals.
 * This is a stub — full implementation requires schema validation.
 */
export function parseAIResponse(response: string): AIActionResult {
  try {
    const parsed = JSON.parse(response);
    return {
      proposals: parsed.transformations || parsed.proposals || [],
      summary: parsed.summary || 'AI transformation',
    };
  } catch {
    return { proposals: [], summary: 'Could not parse AI response' };
  }
}

/**
 * Generate a unique ID for a proposal.
 */
export function generateProposalId(): string {
  return `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
