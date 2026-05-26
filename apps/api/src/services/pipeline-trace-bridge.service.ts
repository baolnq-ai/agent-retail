import { Injectable } from '@nestjs/common';
import type { AgentTraceGraphEdge, AgentTraceNode, AgentTraceStepStatus } from '../models/agent.models.js';
import type { PipelineExecutorRequest, PipelineExecutorResult, PipelineStepExecutionResult } from '../models/pipeline-executor.models.js';
import type { PipelineRuntimeStatus, PipelineTracePlaybackEvent } from '../models/pipeline-runtime.models.js';
import { sortPlaybackEvents } from '../models/pipeline-runtime.models.js';

export interface PipelineDashboardTraceBridge {
  nodes: AgentTraceNode[];
  graphEdges: AgentTraceGraphEdge[];
  playbackEvents: PipelineTracePlaybackEvent[];
}

@Injectable()
export class PipelineTraceBridgeService {
  build(request: PipelineExecutorRequest, result: PipelineExecutorResult): PipelineDashboardTraceBridge {
    const stepResultMap = new Map(result.stepResults.map((stepResult) => [stepResult.stepId, stepResult]));
    const nodes: AgentTraceNode[] = [
      {
        id: 'pipeline-executor',
        label: 'Pipeline executor',
        kind: 'service',
        status: toTraceStatus(result.status),
        detail: request.plan.planId,
        order: 0,
        iconKey: 'route',
        shortCode: 'FLOW',
      },
      {
        id: 'task-context',
        label: 'Task/session context',
        kind: 'text',
        status: toTraceStatus(result.status),
        detail: request.plan.taskId,
        order: 1,
        iconKey: 'list-tree',
        shortCode: 'TASK',
      },
      {
        id: 'lead-agent',
        label: 'Lead Agent',
        kind: 'agent',
        status: toTraceStatus(result.status),
        detail: request.plan.goal,
        agentName: 'lead-agent',
        order: 2,
        iconKey: 'route',
        shortCode: 'LEAD',
      },
    ];
    const edges: AgentTraceGraphEdge[] = [];
    const playbackEvents: PipelineTracePlaybackEvent[] = [
      event(`task_open_${result.planId}`, 'pipeline-executor', 'task-context', 1, 'write', toTraceStatus(result.status), 'open task', request.plan.taskId),
      event(`task_to_lead_${result.planId}`, 'task-context', 'lead-agent', 2, 'data', toTraceStatus(result.status), 'session context', request.plan.taskId),
    ];
    edges.push(...playbackEvents.map(edgeFromEvent));
    const stepAgentById = new Map(request.plan.steps.map((step) => [step.id, step.agent]));

    request.plan.steps.forEach((step, index) => {
      const stepResult = stepResultMap.get(step.id);
      const status = toTraceStatus(stepResult?.status ?? 'blocked');
      const order = index + 1;
      const agentNode = nodes.find((node) => node.id === step.agent);
      if (agentNode) {
        agentNode.status = mergeStatus(agentNode.status, status);
      } else {
        nodes.push({
          id: step.agent,
          label: labelFromId(step.agent),
          kind: 'agent',
          status,
          detail: step.toolName ?? step.action,
          agentName: step.agent,
          order,
          iconKey: iconFromAgent(step.agent),
          shortCode: shortCodeFromId(step.agent),
        });
      }

      const from = stepAgentById.get(step.dependsOn[0] ?? '') ?? 'lead-agent';
      const baseOrder = order * 10;
      const callEvent = event(`call_${result.planId}_${step.id}`, from, step.agent, baseOrder + 1, 'call', status, step.toolName ?? step.action, step.inputRefs[0]);
      const contextReadEvent = event(`context_read_${result.planId}_${step.id}`, 'task-context', step.agent, baseOrder + 2, 'data', status, 'read shared context', step.inputRefs[0]);
      playbackEvents.push(callEvent, contextReadEvent);
      edges.push(edgeFromEvent(callEvent), edgeFromEvent(contextReadEvent));

      if (step.toolName) {
        const toolNode = toolNodeFor(step.toolName, status, baseOrder + 3);
        ensureNode(nodes, toolNode);
        const toolCallDirection = step.toolName.includes('.add_') || step.toolName.includes('.update_') || step.toolName.includes('.remove_') || step.toolName.includes('.write') || step.toolName.includes('.create_') ? 'write' : 'call';
        const agentToTool = event(`tool_call_${result.planId}_${step.id}`, step.agent, toolNode.id, baseOrder + 3, toolCallDirection, status, step.toolName, step.inputRefs[0]);
        playbackEvents.push(agentToTool);
        edges.push(edgeFromEvent(agentToTool));

        const infraNode = infraNodeForTool(step.toolName, status, baseOrder + 4);
        if (infraNode) {
          ensureNode(nodes, infraNode);
          const toolToInfra = event(`tool_data_${result.planId}_${step.id}`, toolNode.id, infraNode.id, baseOrder + 4, toolCallDirection === 'write' ? 'write' : 'data', status, step.toolName, step.inputRefs[0]);
          const infraToTool = event(`tool_data_return_${result.planId}_${step.id}`, infraNode.id, toolNode.id, baseOrder + 5, 'return', status, summarizeStepResult(stepResult), stepResult?.outputRefs[0]);
          playbackEvents.push(toolToInfra, infraToTool);
          edges.push(edgeFromEvent(toolToInfra), edgeFromEvent(infraToTool));
        }

        const toolReturn = event(`tool_return_${result.planId}_${step.id}`, toolNode.id, step.agent, baseOrder + 6, 'return', status, summarizeStepResult(stepResult), stepResult?.outputRefs[0]);
        playbackEvents.push(toolReturn);
        edges.push(edgeFromEvent(toolReturn));
      }

      const contextWriteEvent = event(`context_write_${result.planId}_${step.id}`, step.agent, 'task-context', baseOrder + 7, 'write', status, summarizeStepResult(stepResult), stepResult?.outputRefs[0]);
      const returnEvent = event(`return_${result.planId}_${step.id}`, 'task-context', from, baseOrder + 8, 'return', status, summarizeStepResult(stepResult), stepResult?.outputRefs[0]);
      playbackEvents.push(contextWriteEvent, returnEvent);
      edges.push(edgeFromEvent(contextWriteEvent), edgeFromEvent(returnEvent));
    });

    return {
      nodes,
      graphEdges: edges,
      playbackEvents: sortPlaybackEvents(playbackEvents),
    };
  }
}

function ensureNode(nodes: AgentTraceNode[], node: AgentTraceNode): void {
  const existing = nodes.find((candidate) => candidate.id === node.id);
  if (existing) {
    existing.status = mergeStatus(existing.status, node.status);
    return;
  }
  nodes.push(node);
}

function toolNodeFor(toolName: string, status: AgentTraceStepStatus, order: number): AgentTraceNode {
  return {
    id: `tool-${sanitizeId(toolName)}`,
    label: toolName,
    kind: 'tool',
    status,
    detail: 'server tool',
    order,
    iconKey: 'wrench',
    shortCode: 'TOOL',
  };
}

function infraNodeForTool(toolName: string, status: AgentTraceStepStatus, order: number): AgentTraceNode | undefined {
  if (toolName.startsWith('catalog.search_semantic') || toolName.startsWith('rag.')) {
    return infraNode('qdrant-db', 'Qdrant', 'vector_db', status, order, 'database-zap', 'VDB');
  }
  if (toolName.startsWith('security.') || toolName === 'catalog.rerank' || toolName === 'recommendation.score') {
    return infraNode('llm-service', 'LLM service', 'llm', status, order, 'bot', 'LLM');
  }
  if (toolName.startsWith('memory.') || toolName.startsWith('history.') || toolName.startsWith('catalog.') || toolName.startsWith('cart.') || toolName.startsWith('support.')) {
    return infraNode('postgres-db', 'Postgres', 'db', status, order, 'database', 'PG');
  }
  return undefined;
}

function infraNode(id: string, label: string, kind: AgentTraceNode['kind'], status: AgentTraceStepStatus, order: number, iconKey: string, shortCode: string): AgentTraceNode {
  return {
    id,
    label,
    kind,
    status,
    detail: 'runtime dependency',
    order,
    iconKey,
    shortCode,
  };
}

function sanitizeId(value: string): string {
  return value.toLocaleLowerCase('vi-VN').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function event(
  id: string,
  from: string,
  to: string,
  order: number,
  direction: NonNullable<AgentTraceGraphEdge['direction']>,
  status: AgentTraceStepStatus,
  label?: string,
  payloadRef?: string,
): PipelineTracePlaybackEvent {
  return { id, from, to, order, direction, status, label, payloadRef };
}

function edgeFromEvent(playbackEvent: PipelineTracePlaybackEvent): AgentTraceGraphEdge {
  return {
    from: playbackEvent.from,
    to: playbackEvent.to,
    status: playbackEvent.status,
    order: playbackEvent.order,
    label: playbackEvent.label,
    direction: playbackEvent.direction,
  };
}

function toTraceStatus(status: PipelineRuntimeStatus): AgentTraceStepStatus {
  if (status === 'failed') return 'error';
  if (status === 'planned') return 'pending';
  return status;
}

function mergeStatus(current: AgentTraceStepStatus, next: AgentTraceStepStatus): AgentTraceStepStatus {
  if (current === 'error' || next === 'error') return 'error';
  if (current === 'blocked' || next === 'blocked') return 'blocked';
  if (current === 'running' || next === 'running') return 'running';
  if (current === 'completed' && next === 'completed') return 'completed';
  return next;
}

function summarizeStepResult(stepResult: PipelineStepExecutionResult | undefined): string {
  if (!stepResult) return 'missing result';
  if (stepResult.issueCodes.length) return stepResult.issueCodes[0] ?? stepResult.status;
  return stepResult.status;
}

function labelFromId(id: string): string {
  return id.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function shortCodeFromId(id: string): string {
  return id.split('-').map((part) => part.charAt(0).toUpperCase()).join('').slice(0, 4);
}

function iconFromAgent(id: string): string {
  if (id.includes('cart')) return 'shopping-cart';
  if (id.includes('search')) return 'search';
  if (id.includes('recommendation')) return 'sparkles';
  if (id.includes('memory') || id.includes('history')) return 'database';
  if (id.includes('rag')) return 'file-search';
  if (id.includes('security')) return 'shield';
  if (id.includes('support')) return 'headphones';
  if (id.includes('sales')) return 'badge-dollar-sign';
  return 'bot';
}
