import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AgentTraceAgent } from '../models/agent.models.js';
import {
  DEFAULT_AGENT_TASK_BUDGET,
  type AgentTaskBlackboardEvent,
  type AgentTaskBlackboardSnapshot,
  type AgentTaskBudget,
  type PipelineRuntimeStatus,
} from '../models/pipeline-runtime.models.js';
import { PrismaService } from './prisma.service.js';
import { RedisCacheService } from './redis-cache.service.js';

@Injectable()
export class AgentTaskBlackboardService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisCacheService: RedisCacheService,
  ) {}

  async start(params: {
    requestId: string;
    userId?: string;
    cartId?: string;
    originalMessage: string;
    goal?: string;
    budget?: Partial<AgentTaskBudget>;
  }): Promise<AgentTaskBlackboardSnapshot> {
    const budget: AgentTaskBudget = { ...DEFAULT_AGENT_TASK_BUDGET, ...params.budget };
    const task = await this.prismaService.client.agentTask.upsert({
      where: { requestId: params.requestId },
      create: {
        requestId: params.requestId,
        userId: params.userId,
        cartId: params.cartId,
        originalMessage: params.originalMessage,
        normalizedGoal: params.goal ?? normalizeGoal(params.originalMessage),
        status: 'running',
        budget: toJson(budget),
        hypotheses: toJson([]),
        evidence: toJson([]),
        decisions: toJson([]),
      },
      update: {
        userId: params.userId,
        cartId: params.cartId,
        originalMessage: params.originalMessage,
        normalizedGoal: params.goal ?? normalizeGoal(params.originalMessage),
        status: 'running',
        budget: toJson(budget),
        completedAt: null,
      },
    });
    const snapshot = await this.snapshot(task.requestId);
    await this.cacheSnapshot(snapshot);
    return snapshot;
  }

  async recordEvent(requestId: string, event: AgentTaskBlackboardEvent): Promise<AgentTaskBlackboardSnapshot | undefined> {
    const task = await this.prismaService.client.agentTask.findUnique({ where: { requestId } });
    if (!task) return undefined;

    await this.prismaService.client.agentTaskEvent.create({
      data: {
        taskId: task.id,
        requestId,
        agent: event.agent,
        stage: event.stage,
        status: event.status,
        summary: event.summary.slice(0, 600),
        inputRefs: toJson(event.inputRefs ?? []),
        outputRefs: toJson(event.outputRefs ?? []),
        evidence: toJson(event.evidence ?? []),
        toolCall: event.toolCall ? toJson(event.toolCall) : undefined,
        decision: event.decision ? toJson(event.decision) : undefined,
        durationMs: event.durationMs,
      },
    });

    const nextEvidence = appendLimitedJsonArray(task.evidence, event.evidence ?? [], 80);
    const nextDecisions = event.decision ? appendLimitedJsonArray(task.decisions, [event.decision], 80) : task.decisions;
    await this.prismaService.client.agentTask.update({
      where: { id: task.id },
      data: {
        evidence: toJson(nextEvidence),
        decisions: toJson(nextDecisions),
      },
    });

    const snapshot = await this.snapshot(requestId);
    await this.cacheSnapshot(snapshot);
    return snapshot;
  }

  async finish(requestId: string, params: {
    status: Extract<PipelineRuntimeStatus, 'completed' | 'blocked' | 'failed'>;
    evaluatorVerdict?: Record<string, unknown>;
    finalContract?: Record<string, unknown>;
  }): Promise<AgentTaskBlackboardSnapshot | undefined> {
    const task = await this.prismaService.client.agentTask.findUnique({ where: { requestId } });
    if (!task) return undefined;

    await this.prismaService.client.agentTask.update({
      where: { id: task.id },
      data: {
        status: params.status,
        evaluatorVerdict: params.evaluatorVerdict ? toJson(params.evaluatorVerdict) : undefined,
        finalContract: params.finalContract ? toJson(params.finalContract) : undefined,
        completedAt: new Date(),
      },
    });
    const snapshot = await this.snapshot(requestId);
    await this.cacheSnapshot(snapshot);
    return snapshot;
  }

  async snapshot(requestId: string): Promise<AgentTaskBlackboardSnapshot> {
    const task = await this.prismaService.client.agentTask.findUnique({
      where: { requestId },
      include: { _count: { select: { events: true } } },
    });
    if (!task) {
      return {
        taskId: requestId,
        requestId,
        status: 'failed',
        goal: 'missing task',
        budget: DEFAULT_AGENT_TASK_BUDGET,
        hypotheses: [],
        evidence: [],
        decisions: [],
        eventCount: 0,
      };
    }

    return {
      taskId: task.id,
      requestId: task.requestId,
      status: toPipelineStatus(task.status),
      goal: task.normalizedGoal,
      budget: fromJson(task.budget, DEFAULT_AGENT_TASK_BUDGET),
      hypotheses: fromJson(task.hypotheses, []),
      evidence: fromJson(task.evidence, []),
      decisions: fromJson(task.decisions, []),
      evaluatorVerdict: task.evaluatorVerdict ? fromJson(task.evaluatorVerdict, {}) : undefined,
      finalContract: task.finalContract ? fromJson(task.finalContract, {}) : undefined,
      eventCount: task._count.events,
    };
  }

  toPipelineEvent(event: AgentTaskBlackboardEvent) {
    return {
      timestamp: new Date().toISOString(),
      agent: event.agent as AgentTraceAgent,
      stage: event.stage === 'final' ? 'handoff' as const : event.stage === 'tool' ? 'execute' as const : event.stage === 'judge' ? 'evaluate' as const : 'plan' as const,
      status: event.status,
      summary: event.summary,
      details: {
        inputRefs: event.inputRefs ?? [],
        outputRefs: event.outputRefs ?? [],
        evidenceCount: event.evidence?.length ?? 0,
        toolName: event.toolCall?.name ?? '',
      },
    };
  }

  private async cacheSnapshot(snapshot: AgentTaskBlackboardSnapshot): Promise<void> {
    await this.redisCacheService.setJson(`agent:blackboard:${snapshot.requestId}`, snapshot, 60 * 60);
  }
}

function normalizeGoal(message: string): string {
  return message.replace(/\s+/g, ' ').trim().slice(0, 500);
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function fromJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  return value as T;
}

function appendLimitedJsonArray(existing: unknown, items: unknown[], limit: number): unknown[] {
  const base = Array.isArray(existing) ? existing : [];
  return [...base, ...items].slice(-limit);
}

function toPipelineStatus(status: string): PipelineRuntimeStatus {
  if (status === 'completed' || status === 'blocked' || status === 'failed' || status === 'planned' || status === 'running') return status;
  return 'running';
}
