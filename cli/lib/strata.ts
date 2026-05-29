/**
 * Lightweight Strata HTTP API client for the Holy Sheet CLI.
 *
 * Talks to Strata's local API (default http://127.0.0.1:3939).
 * Never touches Strata's SQLite directly.
 */

import { CliError, ExitCode } from './errors';

// ---- Types ----

export interface StrataNote {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  starred: boolean;
  archived: boolean;
  tags: string[];
  deletedAt: string | null;
}

export interface StrataNoteListResponse {
  notes: StrataNote[];
}

export interface StrataNoteResponse {
  note: StrataNote;
}

export interface StrataHealthResponse {
  ok: boolean;
}

// ---- Defaults ----

const DEFAULT_BASE_URL = 'http://127.0.0.1:3939';
const DEFAULT_TIMEOUT_MS = 15000;

// ---- Client ----

export class StrataApiClient {
  private readonly baseUrl: string;
  private readonly token: string | null;
  private readonly timeoutMs: number;

  constructor(options: { baseUrl?: string; token?: string | null; timeoutMs?: number }) {
    this.baseUrl = options.baseUrl || process.env.STRATA_API_BASE_URL || DEFAULT_BASE_URL;
    this.token = options.token ?? (process.env.STRATA_API_TOKEN || null);
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (this.token) {
      headers['X-Strata-Token'] = this.token;
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const raw = await response.text().catch(() => '');
        let parsed: { error?: string } = {};
        try { parsed = JSON.parse(raw); } catch { /* use raw */ }

        throw new CliError({
          message: parsed.error || raw || `HTTP ${response.status}`,
          exitCode: mapStatus(response.status),
          code: `STRATA_HTTP_${response.status}`,
          details: { status: response.status, url },
        });
      }

      const text = await response.text();
      if (!text.trim()) return {} as T;
      return JSON.parse(text) as T;
    } catch (error: unknown) {
      if (error instanceof CliError) throw error;
      if (error instanceof DOMException && 'AbortError' === error.name) {
        throw new CliError({
          message: `Request to Strata timed out after ${this.timeoutMs}ms`,
          exitCode: ExitCode.Timeout,
          code: 'STRATA_TIMEOUT',
        });
      }
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new CliError({
          message: `Strata API is not running at ${this.baseUrl}`,
          exitCode: ExitCode.ApiUnavailable,
          code: 'STRATA_UNAVAILABLE',
          hint: 'Start Strata and ensure the API server is running on the default port.',
        });
      }
      throw new CliError({
        message: error instanceof Error ? error.message : 'Unknown Strata API error',
        exitCode: ExitCode.ApiUnavailable,
        code: 'STRATA_ERROR',
      });
    } finally {
      clearTimeout(timer);
    }
  }

  // ---- Health ----

  async health(): Promise<StrataHealthResponse> {
    return this.request<StrataHealthResponse>('GET', '/health');
  }

  // ---- Notes ----

  async listNotes(filters: {
    query?: string;
    tag?: string;
    starred?: boolean;
    archived?: boolean;
    includeDeleted?: boolean;
  } = {}): Promise<StrataNote[]> {
    const params = new URLSearchParams();
    if (filters.query) params.set('query', filters.query);
    if (filters.tag) params.set('tag', filters.tag);
    if (filters.starred) params.set('starred', 'true');
    if (filters.archived !== undefined) params.set('archived', String(filters.archived));
    if (filters.includeDeleted) params.set('includeDeleted', 'true');

    const qs = params.toString();
    const result = await this.request<StrataNoteListResponse>(
      'GET',
      `/notes${qs ? '?' + qs : ''}`,
    );
    return result.notes;
  }

  async getNote(id: string): Promise<StrataNote> {
    const result = await this.request<StrataNoteResponse>('GET', `/notes/${id}`);
    return result.note;
  }

  async createNote(patch: {
    content?: string;
    starred?: boolean;
    archived?: boolean;
    tags?: string[];
  }): Promise<StrataNote> {
    const result = await this.request<StrataNoteResponse>('POST', '/notes', patch);
    return result.note;
  }
}

// ---- Helpers ----

function mapStatus(status: number): ExitCode {
  if (401 === status || 403 === status) return ExitCode.AuthFailure;
  if (404 === status) return ExitCode.NotFound;
  if (408 === status) return ExitCode.Timeout;
  if (409 === status || 422 === status) return ExitCode.ValidationError;
  if (status >= 500) return ExitCode.ApiUnavailable;
  return ExitCode.GenericFailure;
}
