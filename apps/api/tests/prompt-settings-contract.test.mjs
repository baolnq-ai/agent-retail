import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const promptSource = await readFile(new URL('../src/services/prompt-settings.service.ts', import.meta.url), 'utf8');
const agentServiceSource = await readFile(new URL('../src/services/agent.service.ts', import.meta.url), 'utf8');
const userAnalysisSource = await readFile(new URL('../src/services/agents/user-analysis-agent.service.ts', import.meta.url), 'utf8');
const recommendationSource = await readFile(new URL('../src/services/agents/recommendation-agent.service.ts', import.meta.url), 'utf8');
const qualityGateSource = await readFile(new URL('../src/services/agents/agent-quality-gate.service.ts', import.meta.url), 'utf8');
const salesEvaluatorSource = await readFile(new URL('../src/services/agents/sales-evaluator-agent.service.ts', import.meta.url), 'utf8');

test('prompt settings seed every editable LLM agent prompt used by runtime', () => {
  for (const key of [
    'user-analysis-system',
    'recommendation-system',
    'sales-system',
    'sales-revision-system',
    'sales-evaluator-system',
    'quality-gate-system',
  ]) {
    assert.match(promptSource, new RegExp(`key: '${key}'`));
  }

  assert.match(userAnalysisSource, /getContent\('user-analysis-system'\)/);
  assert.match(recommendationSource, /getContent\('recommendation-system'\)/);
  assert.match(agentServiceSource, /getContent\('sales-system'\)/);
  assert.match(agentServiceSource, /getContent\('sales-revision-system'\)/);
  assert.match(qualityGateSource, /getContent\('quality-gate-system'\)/);
  assert.match(salesEvaluatorSource, /getContent\('sales-evaluator-system'\)/);
});
