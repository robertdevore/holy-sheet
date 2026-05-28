/**
 * AI Provider abstraction.
 *
 * Holy Sheet uses AI for inspection, cleaning, transformation, and summarization.
 * AI never directly mutates data — it proposes changes that the user previews and approves.
 */

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface AIProvider {
  /** Unique identifier for this provider (e.g., 'openai', 'anthropic', 'local') */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** Send a chat completion request */
  chat(messages: AIMessage[], options?: AIChatOptions): Promise<AIResponse>;
}

export interface AIChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AISettings {
  provider: string;
  apiKey: string;
  model: string;
  temperature: number;
  allowDataSharing: boolean;
  maxRowsForAI: number;
}
