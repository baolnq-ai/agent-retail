import { BadRequestException, Body, Controller, Options, Post, Req, Res } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AgentService } from '../services/agent.service.js';
import { AuthService } from '../services/auth.service.js';

@Controller('/api/v1')
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly authService: AuthService,
  ) {}

  @Post('/chat')
  async chat(@Body() body: { message?: string; cartId?: string }, @Req() request: FastifyRequest) {
    const message = body.message?.trim();
    if (!message) {
      throw new BadRequestException('message is required');
    }

    const user = await this.authService.getUserFromCookie(request.headers.cookie);
    return this.agentService.chat({ message, cartId: body.cartId, user });
  }

  @Options('/chat/stream')
  chatStreamOptions(@Res() reply: FastifyReply) {
    writeStreamCorsHeaders(reply, 204);
    reply.raw.end();
  }

  @Post('/chat/stream')
  async chatStream(@Body() body: { message?: string; cartId?: string }, @Res() reply: FastifyReply) {
    const message = body.message?.trim();
    if (!message) {
      throw new BadRequestException('message is required');
    }

    writeStreamCorsHeaders(reply, 200, {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    });

    try {
      const user = await this.authService.getUserFromCookie(reply.request.headers.cookie);
      for await (const event of this.agentService.chatStream({ message, cartId: body.cartId, user })) {
        reply.raw.write(`${JSON.stringify(event)}\n`);
      }
    } catch (error) {
      reply.raw.write(`${JSON.stringify({ type: 'error', message: error instanceof Error ? error.message : 'stream failed' })}\n`);
    } finally {
      reply.raw.end();
    }
  }
}

function writeStreamCorsHeaders(reply: FastifyReply, statusCode: number, headers: Record<string, string> = {}) {
  const origin = reply.request.headers.origin;
  const allowedOrigins = readCorsOrigins();
  const allowedOrigin = origin && allowedOrigins.includes(origin.replace(/\/$/, '')) ? origin : allowedOrigins[0];
  reply.raw.writeHead(statusCode, {
    'access-control-allow-origin': allowedOrigin,
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, idempotency-key, x-correlation-id',
    vary: 'Origin',
    ...headers,
  });
}

function readCorsOrigins(): string[] {
  const fallback = 'http://127.0.0.1:6800,http://localhost:6800,http://127.0.0.1:6820,http://localhost:6820';
  return (process.env.CORS_ORIGINS ?? fallback)
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
}
