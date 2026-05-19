import { Injectable } from '@nestjs/common';
import type { AgentTrace } from '../models/agent.models.js';

@Injectable()
export class AgentTraceService {
  private readonly traces: AgentTrace[] = [];
  private readonly limit = 50;

  record(trace: AgentTrace): void {
    this.traces.unshift(trace);
    this.traces.splice(this.limit);
  }

  latest(): AgentTrace | undefined {
    return this.traces[0];
  }

  get(traceId: string): AgentTrace | undefined {
    return this.traces.find((trace) => trace.traceId === traceId);
  }
}
