import { Body, Controller, Get, Post, Put, Req, UnauthorizedException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AuthService } from '../services/auth.service.js';
import { ModelGatewayService } from '../services/model-gateway.service.js';
import { ModelSettingsService } from '../services/model-settings.service.js';

@Controller('/api/v1/model-settings')
export class ModelSettingsController {
  constructor(
    private readonly authService: AuthService,
    private readonly modelSettingsService: ModelSettingsService,
    private readonly modelGatewayService: ModelGatewayService,
  ) {}

  @Get()
  async get(@Req() request: FastifyRequest) {
    await this.requireUser(request);
    return this.modelSettingsService.snapshot();
  }

  @Put()
  async update(@Req() request: FastifyRequest, @Body() body: { chatModelBaseUrl?: string; chatModelId?: string; embedRerankBaseUrl?: string; apiKey?: string }) {
    await this.requireUser(request);
    return this.modelSettingsService.update(body);
  }

  @Post('/ping')
  async ping(@Req() request: FastifyRequest) {
    await this.requireUser(request);
    return this.modelGatewayService.health();
  }

  private async requireUser(request: FastifyRequest) {
    const user = await this.authService.getUserFromCookie(request.headers.cookie);
    if (!user) throw new UnauthorizedException('not authenticated');
    return user;
  }
}
