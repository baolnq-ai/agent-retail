import { Body, Controller, Get, Post } from '@nestjs/common';
import { ModelGatewayService } from '../services/model-gateway.service.js';

@Controller('/model-gateway')
export class ModelGatewayController {
  constructor(private readonly modelGatewayService: ModelGatewayService) {}

  @Get('/health')
  getHealth() {
    return this.modelGatewayService.health();
  }

  @Post('/chat')
  chat(@Body() body: { message?: string }) {
    const message = body.message?.trim();
    if (!message) {
      throw new Error('message is required');
    }

    return this.modelGatewayService.chat({
      messages: [{ role: 'user', content: message }],
      maxTokens: 64,
      temperature: 0.1,
    });
  }

  @Post('/embed')
  embed(@Body() body: { texts?: string[] }) {
    if (!Array.isArray(body.texts) || body.texts.length === 0) {
      throw new Error('texts must be a non-empty array');
    }

    return this.modelGatewayService.embed(body.texts);
  }

  @Post('/rerank')
  rerank(@Body() body: { query?: string; documents?: string[] }) {
    if (!body.query || !Array.isArray(body.documents) || body.documents.length === 0) {
      throw new Error('query and documents are required');
    }

    return this.modelGatewayService.rerank(body.query, body.documents);
  }
}
