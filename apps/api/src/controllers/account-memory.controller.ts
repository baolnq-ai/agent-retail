import { Controller, Delete, Get, Req, UnauthorizedException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AuthService } from '../services/auth.service.js';
import { StorageMemoryAgentService } from '../services/agents/storage-memory-agent.service.js';
import { ChatMemoryService } from '../services/chat-memory.service.js';

@Controller('/api/v1/account/memory')
export class AccountMemoryController {
  constructor(
    private readonly authService: AuthService,
    private readonly chatMemoryService: ChatMemoryService,
    private readonly storageMemoryAgentService: StorageMemoryAgentService,
  ) {}

  @Get()
  async getMemory(@Req() request: FastifyRequest) {
    const user = await this.authService.getUserFromCookie(request.headers.cookie);
    if (!user) throw new UnauthorizedException('not authenticated');
    return this.chatMemoryService.getUserMemorySummary(user.id);
  }

  @Get('/export')
  async exportMemory(@Req() request: FastifyRequest) {
    const user = await this.authService.getUserFromCookie(request.headers.cookie);
    if (!user) throw new UnauthorizedException('not authenticated');
    return this.storageMemoryAgentService.exportUserMemory(user.id);
  }

  @Delete()
  async deleteMemory(@Req() request: FastifyRequest) {
    const user = await this.authService.getUserFromCookie(request.headers.cookie);
    if (!user) throw new UnauthorizedException('not authenticated');
    return this.chatMemoryService.deleteUserMemory(user.id);
  }
}
