import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const modelSource = readFileSync(new URL('../src/models/agent.models.ts', import.meta.url), 'utf8');
const serviceSource = readFileSync(new URL('../src/services/agent.service.ts', import.meta.url), 'utf8');

test('agent trace model exposes pipeline v2 agents and graph primitives', () => {
  [
    'lead-agent',
    'storage-memory-agent',
    'history-agent',
    'search-agent',
    'recommendation-agent',
    'cart-agent',
    'rag-agent',
    'security-agent',
    'customer-support-agent',
    'sales-agent',
  ].forEach((agentId) => assert.match(modelSource, new RegExp(`'${agentId}'`), `${agentId} must be part of AgentTraceAgent`));

  ['vector_db', 'llm'].forEach((kind) => assert.match(modelSource, new RegExp(`'${kind}'`), `${kind} node kind must be supported`));
  ['guard', 'write'].forEach((direction) => assert.match(modelSource, new RegExp(`'${direction}'`), `${direction} edge direction must be supported`));
});

test('agent trace builder emits dashboard nodes and edges for pipeline v2', () => {
  [
    'pipeline-executor',
    'session-context',
    'task-context',
    'postgres-db',
    'qdrant-db',
    'llm-service',
    'security-result',
    'support-case',
  ].forEach((nodeId) => assert.match(serviceSource, new RegExp(`'${nodeId}'`), `${nodeId} must be emitted for dashboard graph`));

  [
    "from: 'pipeline-executor', to: 'session-context'",
    "from: 'session-context', to: 'task-context'",
    "from: 'lead-agent', to: 'storage-memory-agent'",
    "from: 'lead-agent', to: 'search-agent'",
    "from: 'lead-agent', to: 'cart-agent'",
    "from: 'lead-agent', to: 'security-agent'",
    "from: 'lead-agent', to: 'customer-support-agent'",
    "from: 'lead-agent', to: 'sales-agent'",
    "from: 'task-context', to: 'storage-memory-agent'",
    "from: 'task-context', to: 'user-analysis-agent'",
    "from: 'task-context', to: 'search-agent'",
    "from: 'task-context', to: 'recommendation-agent'",
    "from: 'task-context', to: 'rag-agent'",
    "from: 'task-context', to: 'cart-agent'",
    "from: 'task-context', to: 'security-agent'",
    "from: 'task-context', to: 'customer-support-agent'",
    "from: 'rag-agent', to: 'qdrant-db'",
    "from: 'cart-agent', to: 'postgres-db'",
    "from: 'sales-agent', to: 'task-context'",
    "from: 'task-context', to: 'session-context'",
    "from: 'lead-agent', to: 'assistant-response'",
  ].forEach((edgeSnippet) => assert.match(serviceSource, new RegExp(edgeSnippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${edgeSnippet} edge must be present`));

  assert.match(serviceSource, /direction: 'guard'/, 'security route must use guard direction');
  assert.match(serviceSource, /direction: 'write'/, 'state mutations must use write direction');
  assert.match(serviceSource, /const playbackEvents = buildTracePlaybackEvents\(graphEdges\)/, 'live latest trace must include playback events for dashboard canvas');
  assert.match(serviceSource, /function buildTracePlaybackEvents/, 'trace builder must define live playback event derivation');
  assert.match(serviceSource, /from: 'lead-agent', to: 'user-analysis-agent'/, 'lead must call user analysis on the dashboard graph');
  assert.match(serviceSource, /from: 'task-context', to: 'lead-agent'.*direction: 'return'/, 'agent results must return through shared task context');
  assert.doesNotMatch(serviceSource, /from: 'sales-agent', to: 'assistant-response'/, 'sales draft must return through shared task context and lead-agent before the assistant response');
  assert.doesNotMatch(serviceSource, /from: 'user-message', to: 'user-analysis-agent'/, 'user analysis must be orchestrated by lead-agent instead of bypassing the shared task context');
});
