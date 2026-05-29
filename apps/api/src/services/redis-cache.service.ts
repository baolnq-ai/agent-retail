import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';
import { loadEnvironment } from '../config/environment.js';

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly environment = loadEnvironment();
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly client = new Redis(this.environment.redisUrl, {
    connectTimeout: 500,
    commandTimeout: 500,
    enableOfflineQueue: false,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: (attempt: number) => Math.min(attempt * 100, 1000),
  });
  private connectionPromise?: Promise<void>;
  private disabledUntil = 0;
  private warnedUnavailable = false;

  constructor() {
    this.client.on('error', (error: Error) => {
      this.warnUnavailable('Redis cache connection error; requests will use source data', error);
    });
  }

  async onModuleInit(): Promise<void> {
    if (await this.ensureConnected()) {
      this.logger.log('Redis cache is ready');
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => undefined);
  }

  async getJson<T>(key: string): Promise<T | undefined> {
    if (!(await this.ensureConnected())) return undefined;

    try {
      const cachedValue = await this.client.get(key);
      if (!cachedValue) return undefined;
      return JSON.parse(cachedValue) as T;
    } catch (error) {
      this.warnUnavailable('Redis cache read failed; falling back to source data', error);
      return undefined;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!(await this.ensureConnected())) return;

    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      this.warnUnavailable('Redis cache write failed; source response was still returned', error);
    }
  }

  private async ensureConnected(): Promise<boolean> {
    if (this.client.status === 'ready') return true;
    if (Date.now() < this.disabledUntil) return false;

    this.connectionPromise ??= this.client
      .connect()
      .then(() => undefined)
      .catch((error: Error) => {
        this.disabledUntil = Date.now() + 1000;
        this.warnUnavailable('Redis cache is not ready; continuing without cache', error);
      })
      .finally(() => {
        this.connectionPromise = undefined;
      });

    await this.connectionPromise;
    return (this.client.status as string) === 'ready';
  }

  private warnUnavailable(message: string, error: unknown): void {
    if (this.warnedUnavailable) return;
    this.warnedUnavailable = true;
    const reason = error instanceof Error ? error.message : 'Unknown Redis error';
    this.logger.warn(`${message}: ${reason}`);
  }
}
