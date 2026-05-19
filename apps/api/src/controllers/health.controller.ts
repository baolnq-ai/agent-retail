import { Controller, Get, Headers, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { HealthService } from '../services/health.service.js';
import { correlationIdHeader, resolveCorrelationId } from '../utils/correlation-id.js';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('/health')
  async getHealth(@Headers(correlationIdHeader) inboundCorrelationId: unknown, @Res({ passthrough: true }) response: FastifyReply) {
    const correlationId = resolveCorrelationId(inboundCorrelationId);
    response.header(correlationIdHeader, correlationId);

    return {
      ...(await this.healthService.getHealth()),
      correlationId,
    };
  }
}
