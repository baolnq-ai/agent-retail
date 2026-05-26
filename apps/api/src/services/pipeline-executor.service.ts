import { Injectable } from '@nestjs/common';
import type {
  PipelineExecutorRequest,
  PipelineExecutorResult,
  PipelineServerToolDefinition,
  PipelineStepExecutionResult,
} from '../models/pipeline-executor.models.js';
import { createExecutorPlaybackEvents, validateExecutorRequestBoundary } from '../models/pipeline-executor.models.js';
import type { PipelineExecutionStep, PipelineRuntimeStatus } from '../models/pipeline-runtime.models.js';
import { PIPELINE_SERVER_TOOLS } from './pipeline-tool.registry.js';

export interface PipelineToolHandlerContext {
  request: PipelineExecutorRequest;
  step: PipelineExecutionStep;
  tool: PipelineServerToolDefinition;
  attempt: number;
}

export interface PipelineToolHandlerResult {
  status: Extract<PipelineRuntimeStatus, 'completed' | 'blocked' | 'failed'>;
  outputRefs?: string[];
  issueCodes?: string[];
}

export type PipelineToolHandler = (context: PipelineToolHandlerContext) => Promise<PipelineToolHandlerResult> | PipelineToolHandlerResult;

export interface PipelineExecutorRunOptions {
  tools?: PipelineServerToolDefinition[];
  handlers?: Record<string, PipelineToolHandler>;
  now?: () => Date;
}

@Injectable()
export class PipelineExecutorService {
  async execute(request: PipelineExecutorRequest, options: PipelineExecutorRunOptions = {}): Promise<PipelineExecutorResult> {
    const tools = options.tools ?? PIPELINE_SERVER_TOOLS;
    const handlers = options.handlers ?? {};
    const now = options.now ?? (() => new Date());
    const validation = validateExecutorRequestBoundary(request, tools);
    const playbackEvents = createExecutorPlaybackEvents(request.plan);

    if (!validation.ok) {
      return {
        requestId: request.requestId,
        planId: request.plan.planId,
        taskId: request.plan.taskId,
        status: 'blocked',
        stepResults: [],
        playbackEvents,
        outputRefs: [],
        issueCodes: validation.issueCodes,
      };
    }

    const toolMap = new Map(tools.map((tool) => [tool.name, tool]));
    const stepResults: PipelineStepExecutionResult[] = [];
    const completedSteps = new Set<string>();
    const outputRefs = new Set<string>();
    const issueCodes: string[] = [];

    for (const step of request.plan.steps) {
      const unmetDependency = step.dependsOn.find((dependency) => !completedSteps.has(dependency));
      if (unmetDependency) {
        const issueCode = `unmet_dependency:${step.id}:${unmetDependency}`;
        issueCodes.push(issueCode);
        stepResults.push(this.createStepResult(step, 'blocked', [issueCode], now));
        continue;
      }

      if (!step.toolName) {
        step.outputRefs.forEach((ref) => outputRefs.add(ref));
        completedSteps.add(step.id);
        stepResults.push(this.createStepResult(step, 'completed', [], now));
        continue;
      }

      const tool = toolMap.get(step.toolName);
      const handler = handlers[step.toolName];
      if (!tool || !handler) {
        const issueCode = `missing_tool_handler:${step.id}:${step.toolName}`;
        issueCodes.push(issueCode);
        stepResults.push(this.createStepResult(step, 'blocked', [issueCode], now));
        continue;
      }

      const result = await this.runHandlerWithPolicy(request, step, tool, handler);
      const stepIssueCodes = result.issueCodes ?? [];
      stepIssueCodes.forEach((issueCode) => issueCodes.push(issueCode));
      (result.outputRefs ?? step.outputRefs).forEach((ref) => outputRefs.add(ref));
      if (result.status === 'completed') completedSteps.add(step.id);
      stepResults.push(this.createStepResult(step, result.status, stepIssueCodes, now, result.outputRefs ?? step.outputRefs));
    }

    return {
      requestId: request.requestId,
      planId: request.plan.planId,
      taskId: request.plan.taskId,
      status: issueCodes.length ? 'blocked' : 'completed',
      stepResults,
      playbackEvents,
      outputRefs: [...outputRefs],
      issueCodes,
    };
  }

  private async runHandlerWithPolicy(
    request: PipelineExecutorRequest,
    step: PipelineExecutionStep,
    tool: PipelineServerToolDefinition,
    handler: PipelineToolHandler,
  ): Promise<PipelineToolHandlerResult> {
    const maxAttempts = tool.retryPolicy === 'none' ? 1 : 2;
    const issueCodes: string[] = [];

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const result = await withTimeout(
          Promise.resolve(handler({ request, step, tool, attempt })),
          tool.timeoutMs,
          `tool_timeout:${step.id}:${tool.name}`,
        );
        return result;
      } catch (error) {
        issueCodes.push(error instanceof Error ? error.message : `tool_failed:${step.id}:${tool.name}`);
      }
    }

    return {
      status: 'failed',
      outputRefs: [],
      issueCodes,
    };
  }

  private createStepResult(
    step: PipelineExecutionStep,
    status: PipelineRuntimeStatus,
    issueCodes: string[],
    now: () => Date,
    outputRefs = step.outputRefs,
  ): PipelineStepExecutionResult {
    const completedAt = now().toISOString();
    return {
      stepId: step.id,
      status,
      inputRefs: step.inputRefs,
      outputRefs,
      issueCodes,
      startedAt: completedAt,
      completedAt,
    };
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutIssueCode: string): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(timeoutIssueCode)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}
