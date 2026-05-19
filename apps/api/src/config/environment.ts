export interface EnvironmentConfig {
  apiPort: number;
  nodeEnv: string;
  chatModelBaseUrl: string;
  chatModelId: string;
  embedRerankBaseUrl: string;
}

export function loadEnvironment(env: NodeJS.ProcessEnv = process.env): EnvironmentConfig {
  return {
    apiPort: readPort(env.API_PORT ?? '3001'),
    nodeEnv: env.NODE_ENV ?? 'development',
    chatModelBaseUrl: readUrl(env.CHAT_MODEL_BASE_URL ?? 'https://replace-with-your-vllm-gateway.example.invalid', 'CHAT_MODEL_BASE_URL'),
    chatModelId: readNonEmpty(env.CHAT_MODEL_ID ?? 'google/gemma-4-E4B-it', 'CHAT_MODEL_ID'),
    embedRerankBaseUrl: readUrl(env.EMBED_RERANK_BASE_URL ?? 'https://replace-with-your-embed-rerank-gateway.example.invalid', 'EMBED_RERANK_BASE_URL'),
  };
}

function readPort(value: string): number {
  if (!/^\d+$/.test(value)) {
    throw new Error('API_PORT must be a number between 1 and 65535');
  }

  const port = Number.parseInt(value, 10);
  if (port < 1 || port > 65535) {
    throw new Error('API_PORT must be a number between 1 and 65535');
  }

  return port;
}

function readUrl(value: string, name: string): string {
  try {
    const url = new URL(value);
    return url.toString().replace(/\/$/, '');
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }
}

function readNonEmpty(value: string, name: string): string {
  if (value.trim().length === 0) {
    throw new Error(`${name} must not be empty`);
  }

  return value.trim();
}
