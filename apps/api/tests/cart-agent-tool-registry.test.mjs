import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  CART_AGENT_PRIVATE_TOOLS,
  CART_AGENT_PUBLIC_INTERFACE,
  getCartAgentTool,
  isAllowedCartAgentTool,
} from '../dist/services/agents/cart-agent-tool.registry.js';

test('cart agent tool registry exposes one public interface and 36 private tools', () => {
  assert.equal(CART_AGENT_PUBLIC_INTERFACE, 'cart.agent.run_goal');
  assert.equal(CART_AGENT_PRIVATE_TOOLS.length, 36);
  assert.equal(new Set(CART_AGENT_PRIVATE_TOOLS.map((tool) => tool.name)).size, 36);
});

test('cart agent write tools require auth and idempotency where needed', () => {
  const writeTools = CART_AGENT_PRIVATE_TOOLS.filter((tool) => tool.category === 'write');
  assert.equal(writeTools.length, 9);
  writeTools.forEach((tool) => {
    assert.equal(tool.write, true, `${tool.name} must be a write tool`);
    assert.equal(tool.requiresAuth, true, `${tool.name} must require auth`);
    assert.equal(tool.requiresIdempotency, true, `${tool.name} must require idempotency`);
  });

  assert.equal(isAllowedCartAgentTool('cart.write.add_item'), true);
  assert.equal(isAllowedCartAgentTool('cart.sql.raw'), false);
  assert.equal(getCartAgentTool('cart.sql.find_cart_item')?.write, false);
});

test('cart agent private tools expose schema refs and version guard policy', () => {
  for (const tool of CART_AGENT_PRIVATE_TOOLS) {
    assert.match(tool.inputSchemaRef, /^CartAgent\.[a-z0-9_]+\.input$/i, `${tool.name} must expose input schema ref`);
    assert.match(tool.outputSchemaRef, /^CartAgent\.[a-z0-9_]+\.output$/i, `${tool.name} must expose output schema ref`);
    assert.equal(/raw/i.test(tool.name), false, `${tool.name} must not expose raw SQL`);
  }

  for (const toolName of [
    'cart.write.add_item',
    'cart.write.set_quantity',
    'cart.write.increment_item',
    'cart.write.decrement_item',
    'cart.write.remove_item',
    'cart.write.clear',
  ]) {
    const definition = getCartAgentTool(toolName);
    assert.equal(definition?.requiresCartVersion, true, `${toolName} must require cart version guard`);
    assert.equal(definition?.requiresIdempotency, true, `${toolName} must require idempotency`);
  }

  assert.equal(getCartAgentTool('cart.write.create_pending_action')?.requiresCartVersion, false);
});

test('cart agent prisma schema includes required ledger, memory, interaction, and pending tables', () => {
  const schema = readFileSync(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');
  ['CartEvent', 'CartAgentMemory', 'CartAgentInteraction', 'PendingCartAction'].forEach((modelName) => {
    assert.match(schema, new RegExp(`model ${modelName} \\{`), `${modelName} must exist in Prisma schema`);
  });
  ['@@index([cartId, createdAt])', '@@unique([userId, tier, key])', '@@index([userId, status, expiresAt])'].forEach((snippet) => {
    assert.ok(schema.includes(snippet), `${snippet} must exist`);
  });
});
