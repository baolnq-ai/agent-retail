import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createTaskMetadataHandle,
  estimateMetadataTokens,
  pickMetadataFields,
} from '../dist/models/task-metadata.models.js';

test('task metadata handles are stable compact ids', () => {
  const handle = createTaskMetadataHandle('task 123', 'product', ['prod ABC', 'variant 1']);
  assert.equal(handle, 'meta_task_123_product_prod_abc_variant_1');
  assert.equal(handle.length <= 180, true);
});

test('metadata token estimate scales with payload size', () => {
  const small = estimateMetadataTokens({ id: 'p1' });
  const large = estimateMetadataTokens({ text: 'x'.repeat(1000) });
  assert.equal(large > small, true);
});

test('metadata pick returns only requested fields', () => {
  const payload = { id: 'prod_1', title: 'AirClean', secretCost: 123, inventory: 8 };
  assert.deepEqual(pickMetadataFields(payload, ['id', 'title']), { id: 'prod_1', title: 'AirClean' });
  assert.deepEqual(pickMetadataFields(payload, ['missing']), {});
});
