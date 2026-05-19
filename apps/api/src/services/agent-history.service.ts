import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AgentTraceAgent } from '../models/agent.models.js';
import type { AgentHistoryContext, AgentHistoryEntry } from '../models/agent-execution.models.js';
import { PrismaService } from './prisma.service.js';

const MAX_AGENT_HISTORY_ENTRIES = 20;
const MAX_AGENT_HISTORY_VALUE_LENGTH = 4000;

@Injectable()
export class AgentHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getHistory(userId: string | undefined, agent: AgentTraceAgent): Promise<AgentHistoryContext> {
    if (!userId) return emptyHistory(agent);
    const preference = await this.prisma.client.userPreference.findUnique({ where: { userId_key: { userId, key: historyKey(agent) } } });
    return { agent, entries: readEntries(preference?.value, agent), summary: summarizeEntries(readEntries(preference?.value, agent)) };
  }

  async getHistories(userId: string | undefined, agents: AgentTraceAgent[]): Promise<AgentHistoryContext[]> {
    if (!userId) return agents.map(emptyHistory);
    const preferences = await this.prisma.client.userPreference.findMany({ where: { userId, key: { in: agents.map(historyKey) } } });
    return agents.map((agent) => {
      const entries = readEntries(preferences.find((preference) => preference.key === historyKey(agent))?.value, agent);
      return { agent, entries, summary: summarizeEntries(entries) };
    });
  }

  async appendHistory(userId: string | undefined, agent: AgentTraceAgent, entry: Omit<AgentHistoryEntry, 'timestamp' | 'agent'>): Promise<void> {
    if (!userId) return;
    const current = await this.getHistory(userId, agent);
    const nextEntries = trimEntries([...current.entries, { ...entry, agent, timestamp: new Date().toISOString() }]);
    await this.prisma.client.userPreference.upsert({
      where: { userId_key: { userId, key: historyKey(agent) } },
      update: { value: nextEntries as unknown as Prisma.InputJsonValue },
      create: { userId, key: historyKey(agent), value: nextEntries as unknown as Prisma.InputJsonValue },
    });
  }
}

function emptyHistory(agent: AgentTraceAgent): AgentHistoryContext {
  return { agent, entries: [], summary: 'Chưa có lịch sử riêng cho agent này.' };
}

function historyKey(agent: AgentTraceAgent): string {
  return `agent_history:${agent}`;
}

function readEntries(value: unknown, agent: AgentTraceAgent): AgentHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is AgentHistoryEntry => isHistoryEntry(entry, agent)).slice(-MAX_AGENT_HISTORY_ENTRIES);
}

function isHistoryEntry(value: unknown, agent: AgentTraceAgent): value is AgentHistoryEntry {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as AgentHistoryEntry;
  return candidate.agent === agent
    && typeof candidate.timestamp === 'string'
    && typeof candidate.inputSummary === 'string'
    && typeof candidate.outputSummary === 'string'
    && Array.isArray(candidate.complaints)
    && (candidate.source === 'llm' || candidate.source === 'fallback' || candidate.source === 'tool');
}

function trimEntries(entries: AgentHistoryEntry[]): AgentHistoryEntry[] {
  let next = entries.slice(-MAX_AGENT_HISTORY_ENTRIES);
  while (JSON.stringify(next).length > MAX_AGENT_HISTORY_VALUE_LENGTH && next.length > 1) next = next.slice(1);
  return next;
}

function summarizeEntries(entries: AgentHistoryEntry[]): string {
  if (entries.length === 0) return 'Chưa có lịch sử riêng cho agent này.';
  return entries.slice(-5).map((entry) => `${entry.status}/${entry.source}: ${entry.outputSummary}${entry.complaints.length ? `; complaints: ${entry.complaints.join(', ')}` : ''}`).join('\n');
}
