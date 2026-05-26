import { BadRequestException, Body, Controller, Get, Post, Put, Req, UnauthorizedException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AuthService } from '../services/auth.service.js';
import { PromptSettingsService } from '../services/prompt-settings.service.js';

@Controller('/api/v1/prompt-settings')
export class PromptSettingsController {
  constructor(
    private readonly authService: AuthService,
    private readonly promptSettingsService: PromptSettingsService,
  ) {}

  @Get()
  async list() {
    return { prompts: await this.promptSettingsService.list() };
  }

  @Put()
  async update(@Req() request: FastifyRequest, @Body() body: { key?: string; content?: string }) {
    await this.requireUser(request);
    try {
      return await this.promptSettingsService.update(body);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'prompt update failed');
    }
  }

  @Post('/reset')
  async reset(@Req() request: FastifyRequest, @Body() body: { key?: string }) {
    await this.requireUser(request);
    try {
      return await this.promptSettingsService.reset(body.key ?? '');
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'prompt reset failed');
    }
  }

  private async requireUser(request: FastifyRequest) {
    const user = await this.authService.getUserFromCookie(request.headers.cookie);
    if (!user) throw new UnauthorizedException('not authenticated');
    return user;
  }
}
