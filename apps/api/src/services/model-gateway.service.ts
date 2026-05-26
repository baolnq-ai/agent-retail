import { Injectable } from '@nestjs/common';
import { ModelSettingsService } from './model-settings.service.js';

export interface ChatRequest {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  maxTokens?: number;
  temperature?: number;
}

export interface ChatResponse {
  content: string;
  model: string;
}

export interface ChatStreamChunk {
  content: string;
  model?: string;
}

export interface RerankResult {
  index: number;
  document: string;
  score: number;
}

export interface ModelGatewayPingCheck {
  ok: boolean;
  endpoint: string;
  status?: number;
  error?: string;
}

export interface ModelGatewayPingResult {
  ok: boolean;
  checks: {
    chatModels: ModelGatewayPingCheck;
    chatCompletions: ModelGatewayPingCheck;
    embedding: ModelGatewayPingCheck;
    rerank: ModelGatewayPingCheck;
  };
}

@Injectable()
export class ModelGatewayService {
  constructor(private readonly modelSettingsService: ModelSettingsService) {}

  async health(settings = this.modelSettingsService.get()): Promise<{ chat: 'ok'; embedding: 'ok' }> {
    const [chatResponse, embeddingResponse] = await Promise.all([
      this.fetchJson(`${settings.chatModelBaseUrl}/v1/models`, { method: 'GET', headers: this.buildHeaders(settings.apiKey) }),
      this.fetchJson(`${settings.embedRerankBaseUrl}/health`, { method: 'GET' }),
    ]);

    if (!Array.isArray(chatResponse.data)) {
      throw new Error('chat model server returned invalid model list');
    }
    if (embeddingResponse.status !== 'ok') {
      throw new Error('embedding service health is not ok');
    }

    return { chat: 'ok', embedding: 'ok' };
  }

  async ping(settings = this.modelSettingsService.get()): Promise<ModelGatewayPingResult> {
    const chatModels = await this.checkJson(`${settings.chatModelBaseUrl}/v1/models`, { method: 'GET', headers: this.buildHeaders(settings.apiKey) }, (payload) => {
      if (!Array.isArray(payload.data)) throw new Error('response.data must be an array');
    });
    const chatCompletions = await this.checkJson(`${settings.chatModelBaseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(settings.apiKey),
      body: JSON.stringify({
        model: settings.chatModelId,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 8,
        temperature: 0,
      }),
    }, (payload) => {
      const content = payload.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || content.length === 0) throw new Error('choices[0].message.content must be a non-empty string');
    });
    const embedding = await this.checkJson(`${settings.embedRerankBaseUrl}/api/v1/embed`, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ texts: ['ping'] }),
    }, (payload) => {
      if (!Array.isArray(payload.result) || !Array.isArray(payload.result[0])) throw new Error('result[0] must be an embedding vector');
    });
    const rerank = await this.checkJson(`${settings.embedRerankBaseUrl}/api/v1/rerank`, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ query: 'ping', documents: ['ping document', 'other document'] }),
    }, (payload) => {
      if (!Array.isArray(payload.result)) throw new Error('result must be an array');
      if (payload.result.length > 0 && !isRerankResult(payload.result[0])) throw new Error('result item must include index, document, and score');
    });

    const checks = { chatModels, chatCompletions, embedding, rerank };
    return { ok: Object.values(checks).every((check) => check.ok), checks };
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const settings = this.modelSettingsService.get();
    const response = await this.fetchJson(`${settings.chatModelBaseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(settings.apiKey),
      body: JSON.stringify({
        model: settings.chatModelId,
        messages: request.messages,
        max_tokens: request.maxTokens ?? 64,
        temperature: request.temperature ?? 0.1,
      }),
    });

    const content = response.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.length === 0) {
      throw new Error('chat model returned empty content');
    }

    return { content, model: response.model ?? settings.chatModelId };
  }

  async *streamChat(request: ChatRequest): AsyncGenerator<ChatStreamChunk> {
    const settings = this.modelSettingsService.get();
    const response = await fetch(`${settings.chatModelBaseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(settings.apiKey),
      body: JSON.stringify({
        model: settings.chatModelId,
        messages: request.messages,
        max_tokens: request.maxTokens ?? 220,
        temperature: request.temperature ?? 0.1,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      const text = await response.text();
      throw new Error(`stream request failed ${response.status}: ${text.slice(0, 200)}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === '[DONE]') return;
          const parsed = JSON.parse(payload) as { model?: string; choices?: Array<{ delta?: { content?: string } }> };
          const content = parsed.choices?.[0]?.delta?.content;
          if (typeof content === 'string' && content.length > 0) {
            yield { content, model: parsed.model };
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async embed(texts: string[]): Promise<number[][]> {
    const settings = this.modelSettingsService.get();
    const response = await this.fetchJson(`${settings.embedRerankBaseUrl}/api/v1/embed`, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ texts }),
    });

    if (!Array.isArray(response.result) || !Array.isArray(response.result[0])) {
      throw new Error('embedding service returned invalid vectors');
    }

    return response.result;
  }

  async rerank(query: string, documents: string[]): Promise<RerankResult[]> {
    const settings = this.modelSettingsService.get();
    const response = await this.fetchJson(`${settings.embedRerankBaseUrl}/api/v1/rerank`, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ query, documents }),
    });

    if (!Array.isArray(response.result)) {
      throw new Error('rerank service returned invalid result');
    }

    return response.result.map((item: unknown) => {
      if (!isRerankResult(item)) {
        throw new Error('rerank service returned invalid item');
      }
      return item;
    });
  }

  private buildHeaders(apiKey?: string): Record<string, string> {
    return apiKey
      ? { 'content-type': 'application/json; charset=utf-8', authorization: `Bearer ${apiKey}` }
      : { 'content-type': 'application/json; charset=utf-8' };
  }

  private async fetchJson(url: string, init: RequestInit): Promise<any> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      try {
        const response = await fetch(url, { ...init, signal: controller.signal });
        const text = await response.text();
        if (!response.ok) {
          const error = new Error(`request failed ${response.status}: ${text.slice(0, 200)}`);
          if (response.status < 500 || attempt === 3) throw error;
          lastError = error;
        } else {
          return JSON.parse(text);
        }
      } catch (error) {
        if (attempt === 3) throw error;
        lastError = error;
      } finally {
        clearTimeout(timeout);
      }
      await sleep(250 * attempt);
    }
    throw lastError instanceof Error ? lastError : new Error('request failed');
  }

  private async checkJson(url: string, init: RequestInit, validate: (payload: any) => void): Promise<ModelGatewayPingCheck> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      const text = await response.text();
      if (!response.ok) {
        return { ok: false, endpoint: `${init.method ?? 'GET'} ${url}`, status: response.status, error: text.slice(0, 200) || `request failed ${response.status}` };
      }
      let payload: any;
      try {
        payload = JSON.parse(text);
      } catch {
        return { ok: false, endpoint: `${init.method ?? 'GET'} ${url}`, status: response.status, error: 'response is not valid JSON' };
      }
      validate(payload);
      return { ok: true, endpoint: `${init.method ?? 'GET'} ${url}`, status: response.status };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'request failed';
      return { ok: false, endpoint: `${init.method ?? 'GET'} ${url}`, error: message };
    } finally {
      clearTimeout(timeout);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRerankResult(value: unknown): value is RerankResult {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.index === 'number' && typeof item.document === 'string' && typeof item.score === 'number';
}
