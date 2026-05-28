/**
 * AI module barrel.
 *
 * Holy Sheet AI features are opt-in and privacy-conscious.
 * No data is sent to external AI providers without explicit user configuration and consent.
 */

export type { AIProvider, AIMessage, AIResponse, AIChatOptions, AISettings } from './types';
export { OpenAICompatibleProvider, createProvider } from './providers/openai-compatible';
export { summarizePrompt, cleanPrompt, transformPrompt, safetyWarning } from './prompts';
export {
  parseAIResponse,
  generateProposalId,
  type AIActionType,
  type AIActionProposal,
  type AIActionResult,
} from './actions';
