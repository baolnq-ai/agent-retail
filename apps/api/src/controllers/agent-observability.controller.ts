import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { AgentTraceService } from '../services/agent-trace.service.js';

@Controller('/api/v1/agent')
export class AgentObservabilityController {
  constructor(private readonly agentTraceService: AgentTraceService) {}

  @Get('/traces/latest')
  latest() {
    return this.agentTraceService.latest() ?? null;
  }

  @Get('/traces/:traceId')
  getTrace(@Param('traceId') traceId: string) {
    const trace = this.agentTraceService.get(traceId);
    if (!trace) throw new NotFoundException('trace not found');
    return trace;
  }
}
