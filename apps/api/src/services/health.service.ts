import { Injectable } from '@nestjs/common';
import type { HealthResponse } from '@retail-agent/shared';
import { PrismaService } from './prisma.service.js';

export interface RuntimeHealthResponse extends HealthResponse {
  dependencies: {
    api: 'ok';
    database: 'ok';
  };
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth(): Promise<RuntimeHealthResponse> {
    await this.prisma.client.$queryRaw`SELECT 1`;
    return {
      status: 'ok',
      service: 'api',
      timestamp: new Date().toISOString(),
      dependencies: {
        api: 'ok',
        database: 'ok',
      },
    };
  }
}
