import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  PIPELINE_V2_AGENT_IDS,
  PIPELINE_V2_AGENT_REGISTRY,
  getPipelineV2AgentDefinition,
  isPipelineV2Agent,
} from '../dist/services/agents/agent-pipeline-v2.registry.js';

test('pipeline v2 registry defines every production agent once', () => {
  assert.equal(new Set(PIPELINE_V2_AGENT_IDS).size, PIPELINE_V2_AGENT_IDS.length);

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
  ].forEach((agentId) => {
    assert.equal(isPipelineV2Agent(agentId), true, `${agentId} should be recognized`);
    assert.equal(PIPELINE_V2_AGENT_REGISTRY[agentId].id, agentId);
  });
});

test('pipeline v2 agent definitions include history, trace, and response contracts', () => {
  PIPELINE_V2_AGENT_IDS.forEach((agentId) => {
    const definition = getPipelineV2AgentDefinition(agentId);
    assert.ok(definition.displayName.length > 0);
    assert.ok(definition.role.length > 0);
    assert.ok(definition.owns.length > 0);
    assert.ok(definition.responseContract.length >= 4);
    assert.ok(definition.trace.iconKey.length > 0);
    assert.ok(definition.trace.shortCode.length > 0);
    assert.equal(definition.trace.nodeKind, 'agent');
    assert.equal(definition.history.enabled, true);
    assert.ok(definition.history.windows.includes('recent'));
    assert.ok(definition.history.maxEntries >= 80);
  });
});

test('lead agent can delegate to every specialist while specialists stay bounded', () => {
  const lead = getPipelineV2AgentDefinition('lead-agent');
  const specialists = PIPELINE_V2_AGENT_IDS.filter((agentId) => agentId !== 'lead-agent');
  specialists.forEach((agentId) => assert.ok(lead.canDelegateTo.includes(agentId), `lead must be allowed to call ${agentId}`));

  assert.deepEqual(getPipelineV2AgentDefinition('history-agent').canDelegateTo, []);
  assert.deepEqual(getPipelineV2AgentDefinition('security-agent').canDelegateTo, []);
  assert.ok(getPipelineV2AgentDefinition('cart-agent').reads.includes('postgres'));
  assert.ok(getPipelineV2AgentDefinition('cart-agent').writes.includes('postgres'));
  assert.ok(getPipelineV2AgentDefinition('rag-agent').reads.includes('qdrant'));
  assert.ok(getPipelineV2AgentDefinition('search-agent').reads.includes('qdrant'));
});
