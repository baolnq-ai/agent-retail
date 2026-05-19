import { Controller, Get, Query } from '@nestjs/common';
import { KnowledgeService } from '../services/knowledge.service.js';

@Controller('/api/v1')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get('/knowledge/search')
  async searchKnowledge(@Query('q') query = '') {
    return { items: await this.knowledgeService.searchKnowledge(query) };
  }
}
