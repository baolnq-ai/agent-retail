import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export interface EnvironmentConfig {
  apiPort: number;
  nodeEnv: string;
  corsOrigins: string[];
  redisUrl: string;
  catalogCacheTtlSeconds: number;
  chatModelBaseUrl: string;
  chatModelId: string;
  embedRerankBaseUrl: string;
}

export function loadEnvironment(env: NodeJS.ProcessEnv = readRuntimeEnvironment()): EnvironmentConfig {
  return {
    apiPort: readPort(env.API_PORT ?? '3001'),
    nodeEnv: env.NODE_ENV ?? 'development',
    corsOrigins: readCorsOrigins(env.CORS_ORIGINS),
    redisUrl: readUrl(env.REDIS_URL ?? 'redis://localhost:3139', 'REDIS_URL'),
    catalogCacheTtlSeconds: readPositiveInteger(env.CATALOG_CACHE_TTL_SECONDS ?? '120', 'CATALOG_CACHE_TTL_SECONDS', 1, 3600),
    chatModelBaseUrl: readUrl(readModelBaseUrl(env.CHAT_MODEL_BASE_URL), 'CHAT_MODEL_BASE_URL'),
    chatModelId: readNonEmpty(readModelId(env.CHAT_MODEL_ID), 'CHAT_MODEL_ID'),
    embedRerankBaseUrl: readUrl(readEmbedRerankBaseUrl(env.EMBED_RERANK_BASE_URL), 'EMBED_RERANK_BASE_URL'),
  };
}

function readRuntimeEnvironment(): NodeJS.ProcessEnv {
  const dotenvPath = findEnvironmentFilePath(process.cwd());
  if (!dotenvPath) return process.env;

  const dotenvValues = readDotenv(dotenvPath);
  for (const [key, value] of Object.entries(dotenvValues)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }

  return { ...dotenvValues, ...process.env };
}

function findEnvironmentFilePath(startDirectory: string): string | undefined {
  let currentDirectory = startDirectory;

  while (true) {
    const dotenvPath = join(currentDirectory, '.env');
    if (existsSync(dotenvPath)) return dotenvPath;

    const examplePath = join(currentDirectory, '.env.example');
    if (existsSync(examplePath)) return examplePath;

    const parentDirectory = dirname(currentDirectory);
    if (parentDirectory === currentDirectory) return undefined;
    currentDirectory = parentDirectory;
  }
}

function readDotenv(filePath: string): Record<string, string> {
  const values: Record<string, string> = {};

  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key) values[key] = unquoteEnvValue(value);
  }

  return values;
}

function unquoteEnvValue(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}

function readModelBaseUrl(value: string | undefined): string {
  return readNonEmpty(value ?? '', 'CHAT_MODEL_BASE_URL');
}

function readModelId(value: string | undefined): string {
  return readNonEmpty(value ?? '', 'CHAT_MODEL_ID');
}

function readEmbedRerankBaseUrl(value: string | undefined): string {
  return readNonEmpty(value ?? '', 'EMBED_RERANK_BASE_URL');
}

function readCorsOrigins(value: string | undefined): string[] {
  const fallback = [
    'http://127.0.0.1:3100',
    'http://localhost:3100',
    'http://127.0.0.1:3120',
    'http://localhost:3120',
  ];
  if (!value?.trim()) return fallback;

  return value
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
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

function readPositiveInteger(value: string, name: string, min: number, max: number): number {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${name} must be a number between ${min} and ${max}`);
  }

  const number = Number.parseInt(value, 10);
  if (number < min || number > max) {
    throw new Error(`${name} must be a number between ${min} and ${max}`);
  }

  return number;
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
