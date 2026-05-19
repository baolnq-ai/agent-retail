import { Injectable } from '@nestjs/common';
import { loadEnvironment } from '../config/environment.js';

export interface ModelSettingsSnapshot {
  chatModelBaseUrl: string;
  chatModelId: string;
  embedRerankBaseUrl: string;
  hasApiKey: boolean;
}

export interface ModelSettings extends ModelSettingsSnapshot {
  apiKey?: string;
}

@Injectable()
export class ModelSettingsService {
  private settings: ModelSettings;

  constructor() {
    const environment = loadEnvironment();
    this.settings = {
      chatModelBaseUrl: environment.chatModelBaseUrl,
      chatModelId: environment.chatModelId,
      embedRerankBaseUrl: environment.embedRerankBaseUrl,
      hasApiKey: false,
    };
  }

  get(): ModelSettings {
    return this.settings;
  }

  snapshot(): ModelSettingsSnapshot {
    return {
      chatModelBaseUrl: this.settings.chatModelBaseUrl,
      chatModelId: this.settings.chatModelId,
      embedRerankBaseUrl: this.settings.embedRerankBaseUrl,
      hasApiKey: Boolean(this.settings.apiKey),
    };
  }

  update(input: { chatModelBaseUrl?: string; chatModelId?: string; embedRerankBaseUrl?: string; apiKey?: string }): ModelSettingsSnapshot {
    this.settings = {
      chatModelBaseUrl: input.chatModelBaseUrl ? readUrl(input.chatModelBaseUrl, 'chatModelBaseUrl') : this.settings.chatModelBaseUrl,
      chatModelId: input.chatModelId ? readNonEmpty(input.chatModelId, 'chatModelId') : this.settings.chatModelId,
      embedRerankBaseUrl: input.embedRerankBaseUrl ? readUrl(input.embedRerankBaseUrl, 'embedRerankBaseUrl') : this.settings.embedRerankBaseUrl,
      apiKey: input.apiKey === undefined ? this.settings.apiKey : input.apiKey.trim() || undefined,
      hasApiKey: input.apiKey === undefined ? this.settings.hasApiKey : Boolean(input.apiKey.trim()),
    };
    return this.snapshot();
  }
}

function readUrl(value: string, name: string): string {
  try {
    return new URL(value).toString().replace(/\/$/, '');
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }
}

function readNonEmpty(value: string, name: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${name} must not be empty`);
  return trimmed;
}
