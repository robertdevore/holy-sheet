/**
 * OpenAI-compatible provider.
 *
 * Works with OpenAI, Anthropic (via OpenAI-compatible endpoint),
 * Ollama, LM Studio, and any other OpenAI-compatible API.
 */

import type { AIProvider, AIMessage, AIResponse, AIChatOptions } from '../types';

export class OpenAICompatibleProvider implements AIProvider {
  readonly id: string;
  readonly name: string;
  private baseUrl: string;
  private apiKey: string;

  constructor(config: { id: string; name: string; baseUrl: string; apiKey: string }) {
    this.id = config.id;
    this.name = config.name;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
  }

  async chat(messages: AIMessage[], options?: AIChatOptions): Promise<AIResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model || 'gpt-4o',
        messages,
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.maxTokens,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`AI provider error (${response.status}): ${err}`);
    }

    const data = await response.json();
    return {
      content: data.choices?.[0]?.message?.content || '',
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
          }
        : undefined,
    };
  }
}

/**
 * Create the appropriate provider from settings.
 * Returns null if no provider is configured.
 */
export function createProvider(settings: {
  provider: string;
  apiKey: string;
  model: string;
}): AIProvider | null {
  if (!settings.apiKey) return null;

  switch (settings.provider) {
    case 'openai':
      return new OpenAICompatibleProvider({
        id: 'openai',
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: settings.apiKey,
      });
    case 'anthropic':
      return new OpenAICompatibleProvider({
        id: 'anthropic',
        name: 'Anthropic',
        baseUrl: 'https://api.anthropic.com/v1',
        apiKey: settings.apiKey,
      });
    case 'local':
      return new OpenAICompatibleProvider({
        id: 'local',
        name: 'Local Model',
        baseUrl: 'http://localhost:11434/v1',
        apiKey: 'ollama',
      });
    default:
      return null;
  }
}
