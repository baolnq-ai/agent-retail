import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_PIPELINE_CONTEXT_BUDGET,
  isCompactRuntimeRef,
  sortPlaybackEvents,
} from '../dist/models/pipeline-runtime.models.js';

test('pipeline runtime refs stay compact and metadata-handle based', () => {
  const ref = {
    refId: 'p:prod_air_clean_p35',
    kind: 'product',
    label: 'AirClean Pro P35',
    ids: ['prod_air_clean_p35'],
    confidence: 0.92,
    metadataHandle: 'meta_task_1_product_prod_air_clean_p35',
  };

  assert.equal(isCompactRuntimeRef(ref), true);
  assert.equal(isCompactRuntimeRef({ ...ref, label: 'x'.repeat(121) }), false);
  assert.equal(isCompactRuntimeRef({ ...ref, confidence: 1.2 }), false);
  assert.equal(isCompactRuntimeRef({ ...ref, payload: { title: 'raw product payload should not be in refs' } }), false);
});

test('pipeline playback events sort by trace order for canvas animation', () => {
  const sorted = sortPlaybackEvents([
    { id: 'e3', from: 'rag-agent', to: 'assistant-response', order: 3, direction: 'return', status: 'completed' },
    { id: 'e1', from: 'user-message', to: 'lead-agent', order: 1, direction: 'call', status: 'completed' },
    { id: 'e2', from: 'lead-agent', to: 'rag-agent', order: 2, direction: 'call', status: 'completed' },
  ]);

  assert.deepEqual(sorted.map((event) => event.id), ['e1', 'e2', 'e3']);
});

test('default pipeline context budget forbids raw payload refs', () => {
  assert.equal(DEFAULT_PIPELINE_CONTEXT_BUDGET.maxRawPayloadRefs, 0);
  assert.equal(DEFAULT_PIPELINE_CONTEXT_BUDGET.maxLeadContextTokens <= 4096, true);
  assert.equal(DEFAULT_PIPELINE_CONTEXT_BUDGET.maxAgentContextTokens <= DEFAULT_PIPELINE_CONTEXT_BUDGET.maxLeadContextTokens, true);
});
